import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import ts from "typescript";
import { filterFileExplanations } from "../lib/filterFileExplanations.ts";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../lib/generateOverview.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});

const context = {
  selectedFiles: [{ path: "src/index.ts", content: "export const value = 1;", error: null }],
};
const explanation = {
  path: "src/index.ts",
  purpose: "Exports a value.",
  significance: "Provides the shared value.",
};
const overview = {
  summary: "An example application.",
  targetAudience: "Developers.",
  limitations: [],
  fileExplanations: [explanation],
  architecture: [{ name: "API", description: "Processes requests.", layer: "Server" }],
};

function completed(provider, text = JSON.stringify(overview), overrides = {}) {
  return {
    status: 200,
    body: {
      id: `test-${provider}`,
      status: "completed",
      ...(provider === "gemini"
        ? { steps: [{ type: "model_output", content: [{ type: "text", text }] }] }
        : { object: "response", output: [{ type: "message", content: [{ type: "output_text", text }] }] }),
      ...overrides,
    },
  };
}

const quotaError = (code, message = "Limit reached.", extra = {}) => ({
  status: 429,
  body: { error: { code, message, ...extra } },
});

// Exercise the installed SDKs with mocked HTTP, isolated environment variables,
// and the real Zod schemas/filter. No credentials or network access are required.
function harness({ env = {}, gemini = [completed("gemini")], openai = [completed("openai")] } = {}) {
  const requests = [];
  const logs = [];
  const config = {};
  const fakeEnv = { GEMINI_API_KEY: "test-gemini", OPENAI_API_KEY: "test-openai", ...env };
  const fetchFor = (provider, replies) => async (input, init) => {
    const request = new Request(input, init);
    requests.push({ provider, body: await request.json() });
    const reply = replies.shift();
    assert.ok(reply, `Unexpected additional ${provider} request`);
    return Response.json(reply.body, { status: reply.status });
  };

  class MockGemini extends GoogleGenAI {
    constructor(options) {
      super({ ...options, vertexai: false, httpOptions: { fetch: fetchFor("gemini", gemini) } });
      const create = this.interactions.create.bind(this.interactions);
      this.interactions.create = (params, requestOptions) => {
        config.gemini = { ...options, ...requestOptions };
        return create(params, requestOptions);
      };
    }
  }
  class MockOpenAI extends OpenAI {
    constructor(options) {
      super({ ...options, fetch: fetchFor("openai", openai) });
      config.openai = options;
    }
  }

  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", "process", "console", outputText)(
    (specifier) => {
      if (specifier === "server-only") return {};
      if (specifier === "@google/genai") return { GoogleGenAI: MockGemini };
      if (specifier === "openai") return MockOpenAI;
      if (specifier === "./filterFileExplanations") return { filterFileExplanations };
      if (specifier === "zod" || specifier === "openai/helpers/zod") return require(specifier);
      throw new Error(`Unexpected overview dependency: ${specifier}`);
    },
    compiledModule,
    compiledModule.exports,
    { env: fakeEnv },
    Object.fromEntries(["log", "warn", "error"].map((level) => [level, (...args) => logs.push(args)])),
  );
  return { generate: compiledModule.exports.generateOverview, requests, logs, config, env: fakeEnv };
}

for (const provider of ["gemini", "openai"]) {
  test(`${provider}: validates output and recovers malformed file explanations`, async () => {
    const data = {
      ...overview,
      summary: "  An example application. \n",
      fileExplanations: [
        null,
        { path: "src/index.ts", purpose: 42 },
        { ...explanation, path: "invented.ts" },
        { ...explanation, purpose: " Exports a value. " },
        explanation,
      ],
    };
    const h = harness({ env: { AI_PROVIDER: provider }, [provider]: [completed(provider, JSON.stringify(data))] });
    assert.deepEqual(await h.generate(context), overview);
    assert.deepEqual(h.requests.map((r) => r.provider), [provider]);
    const body = h.requests[0].body;
    assert.equal(body.store, false);
    assert.equal(h.config[provider].maxRetries, 0);
    assert.equal(h.config[provider].timeout, 60_000);
    const schema = provider === "gemini" ? body.response_format.schema : body.text.format.schema;
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.fileExplanations.type, "array");
    assert.equal(schema.properties.architecture.maxItems, 6);
    if (provider === "openai") assert.equal(body.text.format.strict, true);
  });

  for (const [name, text, message] of [
    ["empty output", " \n ", /returned no overview/],
    ["invalid JSON", "PRIVATE_REPOSITORY_CONTENT", /returned invalid JSON/],
    ["blank summary", JSON.stringify({ ...overview, summary: " \n " }), /invalid repository overview/],
    ["invalid architecture", JSON.stringify({ ...overview, architecture: [{ layer: "Unknown" }] }), /invalid repository overview/],
  ]) {
    test(`${provider}: rejects ${name} without fallback or raw output logging`, async () => {
      const h = harness({
        env: { AI_PROVIDER: provider === "gemini" ? "auto" : provider },
        [provider]: [completed(provider, text)],
      });
      await assert.rejects(h.generate(context), message);
      assert.deepEqual(h.requests.map((r) => r.provider), [provider]);
      assert.deepEqual(h.logs, []);
    });
  }

  test(`${provider}: rejects incomplete responses even when the JSON is valid`, async () => {
    const h = harness({ env: { AI_PROVIDER: provider }, [provider]: [completed(provider, undefined, { status: "incomplete" })] });
    await assert.rejects(h.generate(context), /did not complete/);
    assert.equal(h.requests.length, 1);
  });
}

test("auto mode uses Gemini first and does not call OpenAI after success", async () => {
  const h = harness();
  assert.deepEqual(await h.generate(context), overview);
  assert.deepEqual(h.requests.map((r) => r.provider), ["gemini"]);
});

for (const [name, error] of [
  ["Interactions quota_exceeded without a daily keyword", quotaError("quota_exceeded")],
  ["legacy daily quota metric", quotaError(429, "Quota exceeded", {
    status: "RESOURCE_EXHAUSTED",
    details: [{ violations: [{ quotaMetric: "generate_requests_per_model_per_day" }] }],
  })],
  ["legacy daily quota identifier", quotaError(429, "Quota exceeded", {
    status: "RESOURCE_EXHAUSTED",
    details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel" }] }],
  })],
]) {
  test(`auto mode falls back once for ${name}`, async () => {
    const h = harness({ gemini: [error] });
    assert.deepEqual(await h.generate(context), overview);
    assert.deepEqual(h.requests.map((r) => r.provider), ["gemini", "openai"]);
    assert.equal(h.requests[0].body.input, h.requests[1].body.input[1].content);
  });
}

for (const [name, error] of [
  ["temporary rate limits", quotaError("rate_limit_exceeded", "Per-minute limit reached; daily quota is available.")],
  ["too many requests", quotaError("too_many_requests")],
  ["unspecified 429", quotaError(429)],
  ["legacy per-minute quota", quotaError(429, "Quota exceeded", {
    status: "RESOURCE_EXHAUSTED",
    details: [{ violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel" }] }],
  })],
  ["authentication errors", { status: 401, body: { error: { code: "authentication", message: "Invalid key" } } }],
  ["server errors", { status: 503, body: { error: { code: "service_unavailable", message: "Unavailable" } } }],
]) {
  test(`auto mode never falls back or retries for ${name}`, async () => {
    const h = harness({ gemini: [error] });
    await assert.rejects(h.generate(context));
    assert.deepEqual(h.requests.map((r) => r.provider), ["gemini"]);
  });
}

test("forced Gemini mode never falls back on daily quota errors", async () => {
  const h = harness({ env: { AI_PROVIDER: "gemini" }, gemini: [quotaError("quota_exceeded")] });
  await assert.rejects(h.generate(context));
  assert.deepEqual(h.requests.map((r) => r.provider), ["gemini"]);
});

test("OpenAI refusals have a useful error and do not log refusal text", async () => {
  const h = harness({
    env: { AI_PROVIDER: "openai" },
    openai: [completed("openai", undefined, {
      output: [{ type: "message", content: [{ type: "refusal", refusal: "PRIVATE_REPOSITORY_CONTENT" }] }],
    })],
  });
  await assert.rejects(h.generate(context), /OpenAI refused/);
  assert.deepEqual(h.logs, []);
});

test("normalizes provider/model configuration and supports a blank primary key with the alias", async () => {
  const h = harness({ env: { AI_PROVIDER: " OpenAI ", OPENAI_API_KEY: " ", GPT_6_LUNA_API_KEY: " alias-key ", OPENAI_MODEL: " custom-model " } });
  assert.deepEqual(await h.generate(context), overview);
  assert.equal(h.config.openai.apiKey, "alias-key");
  assert.equal(h.requests[0].body.model, "custom-model");
});

test("reads model configuration at call time and defaults blank values", async () => {
  const h = harness({ env: { AI_PROVIDER: " ", GEMINI_MODEL: "custom-model" }, gemini: [completed("gemini"), completed("gemini")] });
  await h.generate(context);
  h.env.GEMINI_MODEL = " ";
  await h.generate(context);
  assert.deepEqual(h.requests.map((r) => r.body.model), ["custom-model", "gemini-3.8-flash"]);
});

for (const [env, message] of [
  [{ AI_PROVIDER: "invalid" }, /Invalid AI_PROVIDER/],
  [{ GEMINI_API_KEY: " " }, /GEMINI_API_KEY is missing/],
  [{ AI_PROVIDER: "openai", OPENAI_API_KEY: " " }, /OPENAI_API_KEY is missing/],
]) {
  test(`configuration error: ${message.source}`, async () => {
    const h = harness({ env });
    await assert.rejects(h.generate(context), message);
    assert.deepEqual(h.requests, []);
  });
}

test("propagates OpenAI fallback failures without retrying or exposing raw errors in logs", async () => {
  const h = harness({ gemini: [quotaError("quota_exceeded")], openai: [quotaError("insufficient_quota")] });
  await assert.rejects(h.generate(context), (error) => error instanceof OpenAI.APIError && error.status === 429);
  assert.deepEqual(h.requests.map((r) => r.provider), ["gemini", "openai"]);
  assert.deepEqual(h.logs, [["Gemini daily quota exhausted; falling back to OpenAI."]]);
});
