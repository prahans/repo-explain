import assert from "node:assert/strict";
import test from "node:test";
import { createTypeScriptLoader } from "./helpers/loadTypeScript.mjs";
const { AnalysisResponseError, readAnalysisResponse } = createTypeScriptLoader()("lib/readAnalysisResponse.ts");

const encoder = new TextEncoder();
const noop = () => {};

function streamed(chunks, { close = true, cancel = noop } = {}) {
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
      }
      if (close) controller.close();
    },
    cancel,
  });
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

test("supports legacy JSON responses and preserves HTTP error messages and status", async () => {
  assert.deepEqual(
    await readAnalysisResponse(Response.json({ repository: "example" }), noop),
    { repository: "example" },
  );
  await assert.rejects(
    readAnalysisResponse(Response.json({ message: "Repository is unavailable." }, { status: 404 }), noop),
    (error) => error instanceof AnalysisResponseError && error.status === 404 && error.message === "Repository is unavailable.",
  );
  await assert.rejects(
    readAnalysisResponse(new Response("Bad gateway", { status: 502 }), noop),
    (error) => error instanceof AnalysisResponseError && error.status === 502 && /HTTP 502/.test(error.message),
  );
  await assert.rejects(readAnalysisResponse(new Response("broken JSON"), noop), /invalid analysis response/);
});

test("decodes split UTF-8, CRLF, blank lines and a final result without a newline", async () => {
  const events = [
    "",
    ...[0, 1, 2, 3].map((stage) => JSON.stringify({ type: "progress", stage })),
    JSON.stringify({ type: "result", data: { summary: "Café 🚀" } }),
  ].join("\r\n");
  const bytes = encoder.encode(events);
  const progress = [];
  const response = streamed(Array.from(bytes, (byte) => new Uint8Array([byte])));

  assert.deepEqual(await readAnalysisResponse(response, (stage) => progress.push(stage)), { summary: "Café 🚀" });
  assert.deepEqual(progress, [0, 1, 2, 3]);
  assert.equal(response.body.locked, false);
});

test("returns a result and releases the reader without waiting for EOF or cancellation", { timeout: 1_000 }, async () => {
  let cancelled = false;
  const response = streamed([
    '{"type":"result","data":{"ok":true}}\n{"type":"progress","stage":3}\n',
  ], {
    close: false,
    cancel() {
      cancelled = true;
      return new Promise(() => {});
    },
  });
  const progress = [];
  assert.deepEqual(await readAnalysisResponse(response, (stage) => progress.push(stage)), { ok: true });
  assert.equal(cancelled, true);
  assert.equal(response.body.locked, false);
  assert.deepEqual(progress, []);
});

test("streamed errors preserve status and message, cancel the body, and stop progress", async () => {
  let cancelled = false;
  const response = streamed([
    '{"type":"progress","stage":1}\n{"type":"error","message":"GitHub rate limit exceeded.","status":429}\n{"type":"progress","stage":2}\n',
  ], { close: false, cancel() { cancelled = true; } });
  const progress = [];
  await assert.rejects(
    readAnalysisResponse(response, (stage) => progress.push(stage)),
    (error) => error instanceof AnalysisResponseError && error.status === 429 && error.message === "GitHub rate limit exceeded.",
  );
  assert.equal(cancelled, true);
  assert.equal(response.body.locked, false);
  assert.deepEqual(progress, [1]);
});

test("rejects malformed events and incomplete, empty, or invalid UTF-8 streams", async () => {
  const malformed = [
    "broken JSON",
    '{"type":"result","data":',
    "null", "[]", "{}",
    '{"type":"progress","stage":4}',
    '{"type":"progress","stage":-1}',
    '{"type":"progress","stage":1.5}',
    '{"type":"progress","stage":"1"}',
    '{"type":"result"}',
    '{"type":"error","message":"Oops","status":200}',
    '{"type":"error","message":"","status":500}',
    '{"type":"unknown"}',
    new Uint8Array([0xc3]),
  ];
  for (const chunk of malformed) {
    const response = streamed([chunk]);
    await assert.rejects(readAnalysisResponse(response, noop), /invalid analysis response/);
    assert.equal(response.body.locked, false);
  }
  await assert.rejects(readAnalysisResponse(streamed([]), noop), /empty analysis response/);
  await assert.rejects(readAnalysisResponse(streamed(["\r\n  \n"]), noop), /empty analysis response/);
  await assert.rejects(
    readAnalysisResponse(new Response(null, { headers: { "Content-Type": "application/x-ndjson" } }), noop),
    /empty analysis response/,
  );
  await assert.rejects(
    readAnalysisResponse(streamed(['{"type":"progress","stage":2}\n']), noop),
    /before a result arrived/,
  );
});

test("aborting a pending read promptly cancels and releases its reader", { timeout: 1_000 }, async () => {
  const controller = new AbortController();
  const reason = new DOMException("Analysis timed out", "TimeoutError");
  let cancelled = false;
  const response = streamed([], {
    close: false,
    cancel() {
      cancelled = true;
      return new Promise(() => {});
    },
  });
  const pending = readAnalysisResponse(response, noop, controller.signal);
  controller.abort(reason);
  await assert.rejects(pending, (error) => error === reason);
  assert.equal(cancelled, true);
  assert.equal(response.body.locked, false);
});

test("ignores buffered progress and results once cancelled", async () => {
  const controller = new AbortController();
  const progress = [];
  const response = streamed([
    '{"type":"progress","stage":0}\n{"type":"progress","stage":1}\n{"type":"result","data":{}}\n',
  ]);
  await assert.rejects(readAnalysisResponse(response, (stage) => {
    progress.push(stage);
    controller.abort();
  }, controller.signal), { name: "AbortError" });
  assert.deepEqual(progress, [0]);
  assert.equal(response.body.locked, false);
});

test("an already-aborted request never starts reading or delivers progress", async () => {
  const controller = new AbortController();
  controller.abort();
  const response = streamed(['{"type":"progress","stage":0}\n']);
  await assert.rejects(readAnalysisResponse(response, () => assert.fail("Unexpected progress"), controller.signal), { name: "AbortError" });
  assert.equal(response.bodyUsed, false);
});

test("progressive events decode at byte boundaries and deliver Overview before stream completion", async () => {
  const update = { type: "section", section: "overview", data: { summary: "Café 🚀", targetAudience: "Developers", limitations: [] } };
  let producer;
  const response = new Response(new ReadableStream({ start(controller) { producer = controller; } }), { headers: { "Content-Type": "application/x-ndjson" } });
  const updates = [];
  let finished = false;
  let ready;
  const delivered = new Promise((resolve) => { ready = resolve; });
  const reading = readAnalysisResponse(response, noop, undefined, (event) => { updates.push(event); ready(); }).then((value) => { finished = true; return value; });
  for (const byte of encoder.encode(JSON.stringify(update) + "\n")) producer.enqueue(new Uint8Array([byte]));
  await delivered;
  assert.equal(finished, false);
  assert.deepEqual(updates, [update]);
  producer.enqueue(encoder.encode('{"type":"complete"}\n'));
  producer.close();
  assert.equal(await reading, undefined);
});

test("invalid sections never reach the UI; an error after Overview does not retract it", async () => {
  const update = { type: "section", section: "overview", data: { summary: "Ready", targetAudience: "Developers", limitations: [] } };
  const updates = [];
  await assert.rejects(readAnalysisResponse(streamed([JSON.stringify(update) + '\n{"type":"error","message":"Stream lost","status":502}\n']), noop, undefined, (event) => updates.push(event)), /Stream lost/);
  assert.deepEqual(updates, [update]);
  await assert.rejects(readAnalysisResponse(streamed(['{"type":"section","section":"overview","data":{"summary":"incomplete"}}\n']), noop, undefined, () => assert.fail("Unvalidated content")), /invalid analysis response/);
});
