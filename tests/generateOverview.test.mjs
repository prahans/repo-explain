import assert from "node:assert/strict";
import test from "node:test";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { createTypeScriptLoader } from "./helpers/loadTypeScript.mjs";
import { repositoryWithOpportunities, severalImprovements, smallRepository, smallImprovements } from "./fixtures/improvements.mjs";

const context = {
  technologies: ["TypeScript"],
  structure: { paths: ["src/index.ts"], truncated: false },
  selectedFiles: [{ path: "src/index.ts", content: "export const value = 1;", error: null }],
};
const explanation = { path: "src/index.ts", purpose: "Exports a value.", significance: "Provides a shared value." };
const modelData = {
  overview: { summary: "An example application.", targetAudience: "Developers.", limitations: [] },
  techStack: ["TypeScript"],
  projectStructure: ["src/index.ts"],
  importantFiles: [explanation],
  architecture: [{ name: "API", description: "Processes requests.", layer: "Server" }],
  improvements: { summary: "Limited evidence for strong recommendations.", improvements: [] },
};
const encoder = new TextEncoder();
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function sseResponse(provider, reply, signal) {
  const text = reply.text ?? JSON.stringify(modelData);
  const split = reply.pauseAt ?? text.length;
  let controller;
  const body = new ReadableStream({
    start(target) {
      controller = target;
      const send = (event) => target.enqueue(encoder.encode("data: " + JSON.stringify(event) + "\n\n"));
      function chunks(value) {
        for (let i = 0; i < value.length; i += 7) {
          const text = value.slice(i, i + 7);
          send(provider === "gemini"
            ? { event_type: "step.delta", index: 0, delta: { type: "text", text } }
            : { type: "response.output_text.delta", delta: text, output_index: 0, content_index: 0 });
        }
      }
      function finish() {
        if (signal?.aborted) return;
        chunks(text.slice(split));
        if (reply.terminal !== false) {
          send(provider === "gemini"
            ? { event_type: "interaction.completed", interaction: { id: "test", status: reply.status ?? "completed" } }
            : { type: reply.status === "incomplete" ? "response.incomplete" : "response.completed", response: { id: "test", status: reply.status ?? "completed" } });
        }
        target.enqueue(encoder.encode("data: [DONE]\n\n"));
        target.close();
      }
      chunks(text.slice(0, split));
      if (reply.gate) void reply.gate.then(finish);
      else finish();
    },
  });
  signal?.addEventListener("abort", () => {
    try { controller.error(signal.reason); } catch { /* Stream already closed. */ }
  }, { once: true });
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

function harness({ env = {}, replies = {} } = {}) {
  const requests = [];
  const config = {};
  const fakeEnv = { GEMINI_API_KEY: "test-gemini", OPENAI_API_KEY: "test-openai", ...env };
  const fetchFor = (provider) => async (input, init) => {
    const request = new Request(input, init);
    requests.push({ provider, body: await request.json() });
    assert.equal(requests.length, 1, "A submission must never invoke a second model");
    const reply = replies[provider] ?? {};
    if (reply.httpStatus) return Response.json(reply.body, { status: reply.httpStatus });
    return sseResponse(provider, reply, init?.signal ?? request.signal);
  };
  class MockGemini extends GoogleGenAI {
    constructor(options) {
      super({ ...options, vertexai: false, httpOptions: { fetch: fetchFor("gemini") } });
      const create = this.interactions.create.bind(this.interactions);
      this.interactions.create = (params, requestOptions) => {
        config.gemini = { ...options, ...requestOptions };
        return create(params, requestOptions);
      };
    }
  }
  class MockOpenAI extends OpenAI {
    constructor(options) {
      super({ ...options, fetch: fetchFor("openai") });
      config.openai = options;
    }
  }
  const load = createTypeScriptLoader({
    env: fakeEnv,
    dependencies: { "server-only": {}, "@google/genai": { GoogleGenAI: MockGemini }, openai: MockOpenAI },
  });
  return { generate: load("lib/generateOverview.ts").generateOverview, requests, config, env: fakeEnv };
}

for (const provider of ["gemini", "openai"]) {
  test(provider + ": streams six validated sections with one request and no retries", async () => {
    const h = harness({ env: { AI_PROVIDER: provider === "gemini" ? "auto" : "openai" } });
    const updates = [];
    const result = await h.generate(context, { onUpdate: (event) => updates.push(event) });
    assert.deepEqual(updates.filter((event) => event.type === "section").map((event) => event.section), Object.keys(modelData));
    assert.deepEqual(result.fileExplanations, [explanation]);
    assert.deepEqual(result.improvements, modelData.improvements);
    assert.equal(result.summary, modelData.overview.summary);
    assert.ok(Object.values(result.sectionStatuses).every((status) => status === "complete"));
    assert.equal(h.requests.length, 1);
    const body = h.requests[0].body;
    assert.equal(body.stream, true);
    assert.equal(body.store, false);
    assert.equal(h.config[provider].maxRetries, 0);
    const schema = provider === "gemini" ? body.response_format.schema : body.text.format.schema;
    assert.deepEqual(Object.keys(schema.properties), Object.keys(modelData));
    const prompt = provider === "gemini" ? body.system_instruction : body.input[0].content;
    assert.match(prompt, /Fully complete each section before beginning the next/);
    assert.ok(prompt.indexOf("For improvements") > prompt.indexOf("For architecture"));
    assert.deepEqual(JSON.parse(provider === "gemini" ? body.input : body.input[1].content), context);
  });

  test(provider + ": Overview is delivered before the same stream finishes", { timeout: 5_000 }, async () => {
    const gate = deferred();
    const ready = deferred();
    const text = JSON.stringify(modelData);
    const pauseAt = text.indexOf(',"techStack"') + 1;
    const h = harness({ env: { AI_PROVIDER: provider }, replies: { [provider]: { text, pauseAt, gate: gate.promise } } });
    const sections = [];
    let finished = false;
    const generation = h.generate(context, { onUpdate: (event) => {
      if (event.type === "section") {
        sections.push(event.section);
        if (event.section === "overview") ready.resolve();
      }
    } }).finally(() => { finished = true; });
    await ready.promise;
    assert.deepEqual(sections, ["overview"]);
    assert.equal(finished, false);
    gate.resolve();
    await generation;
    assert.equal(sections.at(-1), "improvements");
    assert.equal(h.requests.length, 1);
  });

  for (const [name, repository, improvements] of [
    ["multiple opportunities", repositoryWithOpportunities, severalImprovements],
    ["a small utility", smallRepository, smallImprovements],
  ]) {
    test(provider + ": generates repository-specific Improvements for " + name, async () => {
      const data = { ...modelData, techStack: [], projectStructure: repository.structure.paths, importantFiles: [], improvements };
      const h = harness({ env: { AI_PROVIDER: provider }, replies: { [provider]: { text: JSON.stringify(data) } } });
      const result = await h.generate({ ...repository, technologies: [] });
      assert.deepEqual(result.improvements, improvements);
      assert.equal(result.improvementsStatus, "complete");
      assert.equal(h.requests.length, 1);
    });
  }

  test(provider + ": invalid section data preserves earlier and later sections", async () => {
    const data = { ...modelData, architecture: [{ layer: "invented" }] };
    const h = harness({ env: { AI_PROVIDER: provider }, replies: { [provider]: { text: JSON.stringify(data) } } });
    const updates = [];
    const result = await h.generate(context, { onUpdate: (event) => updates.push(event) });
    assert.equal(result.sectionStatuses.architecture, "error");
    assert.equal(result.summary, modelData.overview.summary);
    assert.equal(result.improvementsStatus, "complete");
    assert.ok(updates.some((event) => event.type === "section-status" && event.section === "architecture" && event.status === "error"));
    assert.equal(h.requests.length, 1);
  });

  test(provider + ": invalid or invented Improvements fail only that section", async () => {
    const data = { ...modelData, improvements: smallImprovements };
    const h = harness({ env: { AI_PROVIDER: provider }, replies: { [provider]: { text: JSON.stringify(data) } } });
    const result = await h.generate(context);
    assert.equal(result.improvementsStatus, "error");
    assert.equal(result.improvements, null);
    assert.deepEqual(result.fileExplanations, [explanation]);
    assert.equal(h.requests.length, 1);
  });

  test(provider + ": truncated streams preserve emitted sections and do not retry", async () => {
    const text = JSON.stringify(modelData).split(',"architecture"')[0] + ',';
    const h = harness({ env: { AI_PROVIDER: provider }, replies: { [provider]: { text, terminal: false } } });
    const sections = [];
    await assert.rejects(h.generate(context, { onUpdate: (event) => {
      if (event.type === "section") sections.push(event.section);
    } }), /before confirming completion/);
    assert.deepEqual(sections, ["overview", "techStack", "projectStructure", "importantFiles"]);
    assert.equal(h.requests.length, 1);
  });

  test(provider + ": HTTP daily quota errors never trigger fallback", async () => {
    const h = harness({ env: { AI_PROVIDER: provider === "gemini" ? "auto" : provider }, replies: {
      [provider]: { httpStatus: 429, body: { error: { code: "quota_exceeded", message: "Daily quota exhausted" } } },
    } });
    await assert.rejects(h.generate(context));
    assert.deepEqual(h.requests.map((request) => request.provider), [provider]);
  });

  test(provider + ": cancellation before generation makes no request", async () => {
    const h = harness({ env: { AI_PROVIDER: provider } });
    await assert.rejects(h.generate(context, { signal: AbortSignal.abort() }), { name: "AbortError" });
    assert.equal(h.requests.length, 0);
  });
}

test("balanced malformed JSON marks its section as failed while subsequent sections continue", async () => {
  const text = JSON.stringify(modelData).replace('"architecture":[{"name":"API","description":"Processes requests.","layer":"Server"}]', '"architecture":{"broken":}');
  const h = harness({ replies: { gemini: { text } } });
  const result = await h.generate(context);
  assert.equal(result.sectionStatuses.architecture, "error");
  assert.equal(result.improvementsStatus, "complete");
});

test("normalizes provider/model configuration and supports the legacy key alias", async () => {
  const h = harness({ env: { AI_PROVIDER: " OpenAI ", OPENAI_API_KEY: " ", GPT_6_LUNA_API_KEY: " alias-key ", OPENAI_MODEL: " custom-model " } });
  await h.generate(context);
  assert.equal(h.config.openai.apiKey, "alias-key");
  assert.equal(h.requests[0].body.model, "custom-model");
});

for (const [env, message] of [
  [{ AI_PROVIDER: "invalid" }, /Invalid AI_PROVIDER/],
  [{ GEMINI_API_KEY: " " }, /GEMINI_API_KEY is missing/],
  [{ AI_PROVIDER: "openai", OPENAI_API_KEY: " " }, /OPENAI_API_KEY is missing/],
]) {
  test("configuration error: " + message.source, async () => {
    const h = harness({ env });
    await assert.rejects(h.generate(context), message);
    assert.equal(h.requests.length, 0);
  });
}
