import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createTypeScriptLoader } from "./helpers/loadTypeScript.mjs";

const repository = { name: "example", full_name: "owner/example", description: null, language: "TypeScript", default_branch: "main", html_url: "https://github.com/owner/example", stargazers_count: 3 };
const overview = { type: "section", section: "overview", data: { summary: "A useful project.", targetAudience: "Developers.", limitations: [] } };
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function harness(t, generate, { gate, githubFailure = false } = {}) {
  let modelCalls = 0;
  const githubCalls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    githubCalls.push(url);
    options.signal?.throwIfAborted();
    if (url === "https://api.github.com/repos/owner/example") {
      return Response.json(githubFailure ? { message: "Not Found" } : repository, { status: githubFailure ? 404 : 200 });
    }
    if (url.endsWith("/contents")) {
      if (gate) await gate;
      return Response.json([{ name: "README.md", path: "README.md", type: "file" }]);
    }
    if (url.includes("/git/trees/")) return Response.json({ tree: [{ path: "README.md", type: "blob" }, { path: "src", type: "tree" }, { path: "src/index.ts", type: "blob" }] });
    if (url.includes("/contents/README.md")) return Response.json({ content: Buffer.from("# Example project").toString("base64") });
    if (url.includes("/contents/package.json")) return Response.json({}, { status: 404 });
    throw new Error(`Unexpected network request: ${url}`);
  });
  const load = createTypeScriptLoader({
    env: { GITHUB_TOKEN: "test-token" },
    logger: { error() {}, warn() {} },
    dependencies: {
      "@/lib/getImportantFiles": { getImportantFiles: () => ["README.md"] },
      "@/lib/generateOverview": { generateOverview: async (context, options) => { modelCalls++; return generate(context, options); } },
    },
  });
  return { post: load("app/api/github/repository/route.ts").POST, githubCalls, count: () => modelCalls };
}

function request(id = randomUUID(), signal) {
  return new Request("http://localhost/api/github/repository", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", "X-Analysis-Request-ID": id }, body: JSON.stringify({ username: "owner", repo: "example" }), signal });
}

test("route sends early metadata, actual preparation counts and completed sections from one invocation", async (t) => {
  const gate = deferred();
  const h = harness(t, async (context, { onUpdate }) => {
    assert.equal(context.readme.content, "# Example project");
    onUpdate(overview);
    return { ...overview.data, fileExplanations: [], architecture: [], improvements: null };
  }, { gate: gate.promise });
  const response = await h.post(request());
  assert.match(response.headers.get("content-type"), /application\/x-ndjson/);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  while (!events.some((event) => event.type === "repository")) {
    const { value, done } = await reader.read();
    assert.equal(done, false);
    events.push(...decoder.decode(value).trim().split("\n").map(JSON.parse));
  }
  assert.equal(h.count(), 0, "Repository shell arrives before model generation");
  gate.resolve();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    events.push(...decoder.decode(value).trim().split("\n").map(JSON.parse));
  }
  assert.deepEqual(events.filter((event) => event.type === "status").map((event) => event.stage), ["loading_repository", "scanning_files", "selecting_files", "preparing_context", "generating_analysis"]);
  assert.equal(events.find((event) => event.stage === "selecting_files").filesScanned, 2);
  assert.equal(events.find((event) => event.stage === "preparing_context").filesSelected, 1);
  const prepared = events.find((event) => event.type === "prepared");
  assert.equal(prepared.data.fileContents.length, 1);
  assert.equal(Object.hasOwn(prepared.data.fileContents[0], "content"), false);
  assert.deepEqual(events.find((event) => event.type === "section"), overview);
  assert.deepEqual(events.at(-1), { type: "complete" });
  assert.equal(h.count(), 1);
  assert.equal(h.githubCalls.filter((url) => url.includes("README.md")).length, 1);
});

test("the same submission ID cannot invoke generation twice, concurrently or after completion", async (t) => {
  const entered = deferred();
  const gate = deferred();
  const h = harness(t, async () => { entered.resolve(); await gate.promise; return {}; });
  const id = randomUUID();
  const first = await h.post(request(id));
  await entered.promise;
  assert.equal((await h.post(request(id))).status, 409);
  assert.equal(h.count(), 1);
  gate.resolve();
  await first.text();
  assert.equal((await h.post(request(id))).status, 409);
  assert.equal(h.count(), 1);
});

test("GitHub failure makes zero model calls; later AI failure preserves previously sent sections", async (t) => {
  const before = harness(t, () => assert.fail("Should not generate"), { githubFailure: true });
  const failed = await before.post(request());
  assert.match(await failed.text(), /"type":"error".*"status":404/);
  assert.equal(before.count(), 0);
  const after = harness(t, async (_, { onUpdate }) => { onUpdate(overview); throw new Error("Disconnected"); });
  const response = await after.post(request());
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert.deepEqual(events.find((event) => event.type === "section"), overview);
  assert.equal(events.at(-1).type, "error");
  assert.equal(events.some((event) => event.type === "complete"), false);
  assert.equal(after.count(), 1);
});

test("cancelling the response aborts the active model stream without starting another", async (t) => {
  const entered = deferred();
  const aborted = deferred();
  const h = harness(t, async (_, { signal, onUpdate }) => {
    onUpdate(overview);
    entered.resolve(signal);
    await new Promise((_, reject) => signal.addEventListener("abort", () => { aborted.resolve(); reject(signal.reason); }, { once: true }));
  });
  const response = await h.post(request());
  const signal = await entered.promise;
  await response.body.cancel();
  await aborted.promise;
  assert.equal(signal.aborted, true);
  assert.equal(h.count(), 1);
});

test("guard retains active submissions and expires only finished submissions after ten minutes", () => {
  const load = createTypeScriptLoader();
  const { claimAnalysisRequest } = load("lib/analysisRequestGuard.ts");
  const activeId = randomUUID();
  const finishedId = randomUUID();
  const release = claimAnalysisRequest(activeId);
  claimAnalysisRequest(finishedId)();
  const future = Date.now() + 600_001;
  assert.equal(claimAnalysisRequest(activeId, future), null);
  const reclaimed = claimAnalysisRequest(finishedId, future);
  assert.equal(typeof reclaimed, "function");
  release();
  reclaimed();
});
