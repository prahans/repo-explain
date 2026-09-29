import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { getContextPaths, parseImprovements } from "../lib/improvements.ts";
import { repositoryWithOpportunities, severalImprovements, smallRepository, smallImprovements } from "./fixtures/improvements.mjs";

const allowedPaths = getContextPaths(repositoryWithOpportunities);
const item = severalImprovements.improvements[0];

test("validates repository-specific suggestions without forcing a minimum count", () => {
  for (const [context, data] of [
    [repositoryWithOpportunities, severalImprovements],
    [smallRepository, smallImprovements],
  ]) {
    const result = parseImprovements(data, getContextPaths(context));
    assert.equal(result.status, "complete");
    assert.deepEqual(result.data, data);
  }
  const empty = parseImprovements({ summary: "Limited evidence.", improvements: [] }, allowedPaths);
  assert.equal(empty.status, "complete");
  assert.deepEqual(empty.data.improvements, []);
});

test("allows omitted relatedFiles, removes duplicate paths, and does not mutate input", () => {
  const { relatedFiles, ...withoutFiles } = item;
  assert.ok(relatedFiles);
  const original = { summary: "One suggestion.", improvements: [withoutFiles] };
  assert.deepEqual(parseImprovements(original, allowedPaths).data.improvements[0].relatedFiles, []);
  assert.equal(original.improvements[0].relatedFiles, undefined);
  const repeated = { ...item, relatedFiles: ["src/search.ts", "src/search.ts"] };
  assert.deepEqual(parseImprovements({ ...original, improvements: [repeated] }, allowedPaths).data.improvements[0].relatedFiles, ["src/search.ts"]);
  assert.equal(repeated.relatedFiles.length, 2);
});

for (const [label, invalid] of [
  ["non-string summary", { summary: 1, improvements: [] }],
  ["non-array suggestions", { summary: "Summary.", improvements: {} }],
  ["missing required fields", { summary: "Summary.", improvements: [{ title: "Missing fields" }] }],
  ["unknown category", { summary: "Summary.", improvements: [{ ...item, category: "other" }] }],
  ["unknown priority", { summary: "Summary.", improvements: [{ ...item, priority: "critical" }] }],
  ["blank recommendation", { summary: "Summary.", improvements: [{ ...item, recommendation: " \n " }] }],
  ["non-array relatedFiles", { summary: "Summary.", improvements: [{ ...item, relatedFiles: "src/search.ts" }] }],
  ["non-string relatedFiles", { summary: "Summary.", improvements: [{ ...item, relatedFiles: [123] }] }],
  ["duplicate ids", { summary: "Summary.", improvements: [item, item] }],
  ["too many items", { summary: "Summary.", improvements: Array.from({ length: 9 }, (_, i) => ({ ...item, id: `item-${i}` })) }],
]) {
  test(`rejects ${label} as a section error`, () => {
    assert.deepEqual(parseImprovements(invalid, allowedPaths), { status: "error", data: null });
  });
}

test("rejects invented or normalized file references and accepts only exact context paths", () => {
  for (const file of ["invented.ts", "search.ts", "./src/search.ts", "src/SEARCH.ts", "src\\search.ts", " src/search.ts "]) {
    const data = { summary: "A recommendation.", improvements: [{ ...item, relatedFiles: [file] }] };
    assert.equal(parseImprovements(data, allowedPaths).status, "error");
  }
  assert.deepEqual([...getContextPaths({ selectedFiles: [null, {}, { path: "source.ts" }], structure: { paths: [false, "config.json"] } })], ["source.ts", "config.json"]);
  assert.deepEqual(parseImprovements(undefined, allowedPaths), { status: "not-available", data: null });
  assert.deepEqual(parseImprovements(null, allowedPaths), { status: "error", data: null });
});

// Follow the existing tests' TypeScript transpilation approach; no test framework
// dependency or production test route is needed to exercise the React components.
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const modules = new Map();
let activeSection = "overview";
function load(relativePath) {
  const filename = path.resolve(root, relativePath);
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiledModule = { exports: {} };
  modules.set(filename, compiledModule);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  new Function("require", "module", "exports", outputText)((specifier) => {
    if (specifier.endsWith(".css")) return {};
    if (specifier === "react" && filename.endsWith("AnalysisReport.tsx")) {
      return { ...React, useState: () => [activeSection, (section) => { activeSection = section; }] };
    }
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const resolved = specifier.startsWith("@/") ? path.resolve(root, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
      return load([resolved, `${resolved}.tsx`, `${resolved}.ts`].find(existsSync));
    }
    return require(specifier);
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const { ImprovementsSection } = load("components/analysis/ImprovementsSection.tsx");
const { AnalysisReport } = load("components/analysis/AnalysisReport.tsx");
const { mapRepositoryResponse } = load("lib/mapRepositoryResponse.ts");
const render = (props) => renderToStaticMarkup(React.createElement(ImprovementsSection, { improvements: [], ...props }));

test("renders priorities, readable categories, reasons, recommendations, and optional file paths", () => {
  const html = render({ status: "complete", improvements: severalImprovements.improvements, summary: severalImprovements.summary });
  for (const text of ["HIGH", "MEDIUM", "LOW", "Security", "Code Quality", "Performance", "Testing", "Why this matters", "Recommendation", "Related files", "src/search.ts"]) {
    assert.ok(html.includes(text), text);
  }
  assert.equal((html.match(/<article/g) ?? []).length, 4);
  assert.doesNotMatch(html, /<a\b/);
  for (const [category, label] of [["architecture", "Architecture"], ["developer-experience", "Developer Experience"]]) {
    const withoutFiles = render({ status: "complete", improvements: [{ ...item, category, relatedFiles: undefined }] });
    assert.ok(withoutFiles.includes(label));
    assert.doesNotMatch(withoutFiles, /Related files/);
  }
  const escaped = render({ status: "complete", improvements: [{ ...item, title: "<script>alert(1)</script>" }] });
  assert.doesNotMatch(escaped, /<script>/);
});

test("keeps waiting, generating, missing, error, and completed-empty states distinct", () => {
  const empty = render({ status: "complete" });
  assert.match(empty, /No major improvements were identified/);
  assert.match(empty, /only evaluates the files included/);
  assert.doesNotMatch(empty, /role="alert"/);
  for (const [status, message] of [
    ["waiting", /Waiting for analysis/],
    ["generating", /Reviewing the repository for potential improvements/],
    ["error", /Improvements could not be displayed/],
    ["not-available", /finished without improvements data/],
  ]) {
    const html = render({ status, improvements: severalImprovements.improvements });
    assert.match(html, message);
    assert.doesNotMatch(html, /No major improvements|Parameterize the search query/);
    assert.match(html, /recommendations to investigate rather than definitive issues/);
    if (status === "generating") {
      assert.match(html, /aria-busy="true"/);
      assert.equal((html.match(/class="loading-skeleton"/g) ?? []).length, 2);
    }
    if (status === "error") assert.match(html, /role="alert"/);
  }
});

function find(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}

test("sidebar navigation renders every existing section and Improvements without any request", (t) => {
  const fetchSpy = t.mock.method(globalThis, "fetch", () => { throw new Error("Section navigation must not fetch"); });
  const analysis = mapRepositoryResponse({
    repository: { name: "fixture", fullName: "example/fixture", description: null, language: "TypeScript", defaultBranch: "main", url: "https://github.com/example/fixture" },
    technologies: ["TypeScript"],
    tree: repositoryWithOpportunities.structure.paths.map((path) => ({ path, type: "blob" })),
    importantFiles: repositoryWithOpportunities.structure.paths.map((path) => ({ path, type: "blob" })),
    overview: { summary: "Fixture overview.", targetAudience: "Developers.", limitations: [], architecture: [{ name: "Server API", description: "Handles search and reports.", layer: "Server" }], improvements: severalImprovements },
  });
  const headings = {
    overview: "The big picture", "tech-stack": "The tools behind the code", "project-structure": "Find your way around",
    "important-files": "Good places to start", architecture: "How the pieces connect", "how-it-works": "How It Works", improvements: "Improvements",
  };
  for (const [section, heading] of Object.entries(headings)) {
    const tree = AnalysisReport({ analysis });
    const nav = find(tree, (node) => node.type?.name === "AnalysisNavigation");
    const button = find(nav.type(nav.props), (node) => node.type === "button" && node.props.id === `nav-${section}`);
    button.props.onClick();
    const html = renderToStaticMarkup(AnalysisReport({ analysis }));
    assert.ok(html.includes(`id="nav-${section}" aria-pressed="true"`));
    assert.ok(html.includes(`>${heading}</h2>`), heading);
  }
  for (const [status, text] of [["waiting", "Waiting for analysis"], ["generating", "Generating improvements"], ["error", "Improvements unavailable"]]) {
    const html = renderToStaticMarkup(AnalysisReport({ analysis: { ...analysis, improvementsStatus: status } }));
    assert.ok(html.includes(text));
  }
  assert.equal(fetchSpy.mock.callCount(), 0);
});
