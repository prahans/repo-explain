import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { createTypeScriptLoader } from "./helpers/loadTypeScript.mjs";

function find(node, name) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, name)).find(Boolean);
  return node.type?.name === name ? node : find(node.props?.children, name);
}

// Exercise the event handlers with persistent hook slots. The double effect
// setup/cleanup mirrors Strict Mode; no browser/test dependency is required.
function harness(t) {
  const slots = [];
  let index = 0;
  let effect;
  const dependencies = {
    react: {
      ...React,
      useState(initial) {
        const position = index++;
        if (!(position in slots)) slots[position] = initial;
        return [slots[position], (value) => { slots[position] = typeof value === "function" ? value(slots[position]) : value; }];
      },
      useRef(initial) {
        const position = index++;
        if (!(position in slots)) slots[position] = { current: initial };
        return slots[position];
      },
      useEffect(callback) { effect = callback; },
    },
  };
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "window", { value: { setTimeout, clearTimeout }, configurable: true });
  Object.defineProperty(globalThis, "document", { value: { getElementById: () => null }, configurable: true });
  t.after(() => {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else delete globalThis.window;
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument); else delete globalThis.document;
  });
  const load = createTypeScriptLoader({ dependencies });
  const { RepoExplain } = load("components/RepoExplain.tsx");
  let producer;
  let signal;
  let cancelled = false;
  const fetchSpy = t.mock.method(globalThis, "fetch", async (_, options) => {
    signal = options.signal;
    assert.match(options.headers["X-Analysis-Request-ID"], /^[a-f0-9-]{36}$/);
    return new Response(new ReadableStream({
      start(controller) { producer = controller; },
      cancel() { cancelled = true; },
    }), { headers: { "Content-Type": "application/x-ndjson" } });
  });
  const render = () => { index = 0; return RepoExplain(); };
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  return {
    render, fetchSpy, tick,
    get signal() { return signal; },
    get cancelled() { return cancelled; },
    mountStrict() { render(); effect()(); render(); return effect(); },
    async send(event) { producer.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n")); await tick(); },
  };
}

const repository = { type: "repository", data: { name: "example", fullName: "owner/example", description: null, language: "TypeScript", defaultBranch: "main", url: "https://github.com/owner/example" } };
const overview = { type: "section", section: "overview", data: { summary: "Early useful overview.", targetAudience: "Developers.", limitations: [] } };

test("Strict Mode setup, rapid double-submit and rerenders produce one fetch and retain partial results", async (t) => {
  const h = harness(t);
  const unmount = h.mountStrict();
  t.after(unmount);
  assert.equal(h.fetchSpy.mock.callCount(), 0);
  find(h.render(), "RepositoryForm").props.onChange("https://github.com/owner/example");
  const form = find(h.render(), "RepositoryForm");
  form.props.onPreview();
  form.props.onPreview();
  await h.tick();
  assert.equal(h.fetchSpy.mock.callCount(), 1);
  await h.send(repository);
  const early = h.render();
  assert.ok(find(early, "AnalysisReport"), "Normal repository shell appears before AI sections");
  assert.equal(find(early, "RepositoryForm").props.isLoading, true);
  await h.send(overview);
  let report = find(h.render(), "AnalysisReport").props.analysis;
  assert.equal(report.overview.summary, "Early useful overview.");
  assert.equal(report.sectionStatuses.architecture, "waiting");
  h.render();
  h.render();
  assert.equal(h.fetchSpy.mock.callCount(), 1);
  await h.send({ type: "error", message: "The model stream disconnected.", status: 502 });
  report = find(h.render(), "AnalysisReport").props.analysis;
  assert.equal(report.overview.summary, "Early useful overview.");
  assert.equal(report.sectionStatuses.overview, "complete");
  assert.equal(report.sectionStatuses.architecture, "error");
  assert.equal(find(h.render(), "RepositoryForm").props.isLoading, false);
  assert.equal(h.cancelled, true);
  assert.equal(h.fetchSpy.mock.callCount(), 1);
});

test("unmount aborts the active request and ignores any later stream updates", async (t) => {
  const h = harness(t);
  const unmount = h.mountStrict();
  find(h.render(), "RepositoryForm").props.onChange("https://github.com/owner/example");
  find(h.render(), "RepositoryForm").props.onPreview();
  await h.tick();
  await h.send(repository);
  unmount();
  await h.tick();
  assert.equal(h.signal.aborted, true);
  assert.equal(h.cancelled, true);
  assert.equal(h.fetchSpy.mock.callCount(), 1);
});
