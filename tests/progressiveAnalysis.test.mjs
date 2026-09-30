import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTypeScriptLoader } from "./helpers/loadTypeScript.mjs";

const load = createTypeScriptLoader();
const { StreamedJsonSections } = load("lib/streamedJsonSections.ts");
const { createProgressiveAnalysis, applyAnalysisUpdate, finishAnalysis } = load("lib/progressiveAnalysis.ts");
const { preparedSchema } = load("lib/analysisProtocol.ts");
const { AnalysisNavigation } = load("components/analysis/AnalysisNavigation.tsx");
const { HowItWorks } = load("components/analysis/HowItWorks.tsx");
const repository = { name: "example", fullName: "owner/example", description: null, language: "TypeScript", defaultBranch: "main", url: "https://github.com/owner/example" };
const overview = { type: "section", section: "overview", data: { summary: "Useful summary.", targetAudience: "Developers.", limitations: [] } };

test("model JSON parser handles every possible split, including escapes and nested structures", () => {
  const data = { overview: { text: 'Quoted "text", {braces}, [brackets], \\path\nCafé 🚀', nested: [{ x: [1, 2] }] }, techStack: ["TypeScript"], architecture: [] };
  const json = JSON.stringify(data);
  for (let split = 0; split <= json.length; split++) {
    const events = [];
    const parser = new StreamedJsonSections(Object.keys(data), (key, value) => events.push([key, value]));
    parser.push(json.slice(0, split));
    parser.push(json.slice(split));
    parser.finish();
    assert.deepEqual(events, Object.entries(data), `Split at ${split}`);
  }
  const events = [];
  const parser = new StreamedJsonSections(Object.keys(data), (key, value) => events.push([key, value]));
  for (const char of json) parser.push(char);
  parser.finish();
  assert.deepEqual(events, Object.entries(data));
});

test("model parser emits only complete properties and retains them after truncation", () => {
  const events = [];
  const parser = new StreamedJsonSections(["overview", "techStack"], (...event) => events.push(event));
  parser.push('{"overview":{"summary":"Complete');
  assert.deepEqual(events, []);
  parser.push('"},"techStack":["Type');
  assert.deepEqual(events, [["overview", { summary: "Complete" }]]);
  assert.throws(() => parser.finish(), /before all sections/);
  assert.equal(events.length, 1);
});

test("balanced malformed sections are isolated, while invalid envelopes/order fail closed", () => {
  const events = [];
  const parser = new StreamedJsonSections(["overview", "techStack"], (...event) => events.push(event));
  parser.push('{"overview":{"summary":},"techStack":["TypeScript"]}');
  parser.finish();
  assert.deepEqual(events, [["overview", undefined], ["techStack", ["TypeScript"]]]);
  for (const json of ['[]', '{}', '{"techStack":[],"overview":{}}', '{"overview":{},"overview":{}}', '{"overview":{},}', '{"overview":{}} trailing', '{"overview":{},"techStack":[']) {
    assert.throws(() => {
      const invalid = new StreamedJsonSections(["overview", "techStack"], () => {});
      invalid.push(json);
      invalid.finish();
    }, undefined, json);
  }
  assert.throws(() => new StreamedJsonSections([], () => {}).push(" ".repeat(2_000_001)), /size limit/);
});

test("early repository shell starts waiting and makes static How It Works available", () => {
  const analysis = createProgressiveAnalysis(repository);
  assert.ok(Object.values(analysis.sectionStatuses).every((value) => value === "waiting"));
  assert.equal(analysis.repository.name, "example");
  assert.equal(analysis.selectedFileCount, undefined);
  const sidebar = renderToStaticMarkup(createElement(AnalysisNavigation, { active: "overview", onChange() {}, statuses: analysis.sectionStatuses }));
  assert.match(sidebar, /id="nav-how-it-works"/);
  assert.match(sidebar, /How It Works/);
  assert.match(sidebar, /data-section-status="complete"/);
  assert.doesNotMatch(sidebar, /disabled/);
  const help = renderToStaticMarkup(createElement(HowItWorks, { repository: analysis.repository }));
  assert.match(help, /How repoExplain/);
  assert.doesNotMatch(help, /NaN|undefined/);
});

test("completed sections remain immutable and survive cancellation or a later stream error", () => {
  const initial = createProgressiveAnalysis(repository);
  const ready = applyAnalysisUpdate(initial, overview);
  assert.equal(initial.sectionStatuses.overview, "waiting");
  assert.equal(ready.sectionStatuses.overview, "complete");
  assert.equal(ready.overview.summary, "Useful summary.");
  const generating = applyAnalysisUpdate(ready, { type: "section-status", section: "techStack", status: "generating" });
  const failed = finishAnalysis(generating, "Stream interrupted.");
  assert.equal(failed.overview, ready.overview);
  assert.equal(failed.sectionStatuses.overview, "complete");
  assert.equal(failed.sectionStatuses["tech-stack"], "error");
  assert.equal(failed.sectionStatuses.improvements, "error");
  assert.equal(failed.sectionErrors.architecture, "Stream interrupted.");
  assert.equal(applyAnalysisUpdate(failed, { type: "section-status", section: "overview", status: "error" }), failed);
  const finished = finishAnalysis(ready);
  assert.equal(finished.sectionStatuses.overview, "complete");
  assert.equal(finished.sectionStatuses.architecture, "not-available");
});

test("prepared data removes source content and preserves the full tree beyond model context", () => {
  const prepared = preparedSchema.parse({
    tree: Array.from({ length: 205 }, (_, i) => ({ path: `file-${i}.ts`, type: "blob" })),
    importantFiles: [{ path: "file-0.ts", type: "blob" }],
    fileContents: [{ path: "file-0.ts", content: "private source content", truncated: false, error: null }],
    technologies: ["TypeScript", "React"],
  });
  assert.equal(Object.hasOwn(prepared.fileContents[0], "content"), false);
  let analysis = applyAnalysisUpdate(createProgressiveAnalysis(repository), { type: "prepared", data: prepared });
  assert.equal(analysis.selectedFileCount, 1);
  assert.equal(analysis.sectionStatuses["project-structure"], "waiting");
  analysis = applyAnalysisUpdate(analysis, { type: "section", section: "projectStructure", data: prepared.tree.slice(0, 200).map((file) => file.path) }, prepared);
  assert.equal(analysis.structure.children.length, 205);
  analysis = applyAnalysisUpdate(analysis, { type: "section", section: "techStack", data: ["TypeScript"] }, prepared);
  assert.equal(analysis.technologies.length, 2);
  analysis = applyAnalysisUpdate(analysis, { type: "section", section: "importantFiles", data: [{ path: "file-0.ts", purpose: "Starts the application.", significance: "Entry point." }] }, prepared);
  assert.equal(analysis.importantFiles[0].purpose, "Starts the application.");
});
