import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { buildProjectTree } from "../lib/projectTree.ts";
import { parseImprovements } from "../lib/improvements.ts";
import { severalImprovements } from "./fixtures/improvements.mjs";

// Compile only the mapper so its Next.js alias can use the real tree builder
// without introducing a separate test runner or a general-purpose TS loader.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../lib/mapRepositoryResponse.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const compiledModule = { exports: {} };
new Function("require", "module", "exports", outputText)(
  (specifier) => {
    if (specifier === "@/lib/projectTree") return { buildProjectTree };
    if (specifier === "./improvements") return { parseImprovements };
    if (specifier === "zod") return require(specifier);
    throw new Error(`Unexpected mapper dependency: ${specifier}`);
  },
  compiledModule,
  compiledModule.exports,
);
const { mapRepositoryResponse } = compiledModule.exports;

test("maps validated Improvements and preserves the rest of the repository analysis", () => {
  const input = response(["src/search.ts", "src/report.ts", "package.json"]);
  input.overview.improvements = severalImprovements;
  const result = mapRepositoryResponse(input);
  assert.equal(result.improvementsStatus, "complete");
  assert.equal(result.improvementsSummary, severalImprovements.summary);
  assert.deepEqual(result.improvements, severalImprovements.improvements);
  assert.equal(result.repository.name, "example");
  assert.equal(result.technologies[0].name, "TypeScript");
  assert.equal(result.importantFiles.length, 3);
});

test("distinguishes an empty complete section, missing data, and a section-level error", () => {
  for (const [improvements, expected] of [
    [{ summary: "No strong recommendations from these files.", improvements: [] }, "complete"],
    [undefined, "not-available"],
    [null, "error"],
    [severalImprovements, "error"], // Paths are absent from this repository.
    [{ summary: 42, improvements: [] }, "error"],
  ]) {
    const input = response();
    input.overview.improvements = improvements;
    const result = mapRepositoryResponse(input);
    assert.equal(result.improvementsStatus, expected);
    assert.deepEqual(result.improvements, []);
    assert.equal(result.overview.summary, input.overview.summary);
  }
});

test("preserves server section errors and unavailable status after JSON serialization", () => {
  for (const status of ["error", "not-available"]) {
    const input = response();
    input.overview.improvements = null;
    input.overview.improvementsStatus = status;
    const result = mapRepositoryResponse(JSON.parse(JSON.stringify(input)));
    assert.equal(result.improvementsStatus, status);
    assert.equal(result.importantFiles.length, 1);
  }
});

const file = (path) => ({ path, type: "blob" });
const explanation = (path, purpose = "Exports the application entry point.", significance = "Connects the application's main components.") => ({
  path,
  purpose,
  significance,
});

function response(paths = ["src/index.ts"], fileExplanations) {
  return {
    repository: {
      name: "example",
      fullName: "owner/example",
      description: "An example repository.",
      language: "TypeScript",
      defaultBranch: "main",
      url: "https://github.com/owner/example",
    },
    technologies: ["TypeScript"],
    tree: paths.map(file),
    importantFiles: paths.map(file),
    overview: {
      summary: "An example application.",
      targetAudience: "Application developers.",
      limitations: [],
      ...(fileExplanations === undefined ? {} : { fileExplanations }),
    },
  };
}

function assertUnavailable(item) {
  assert.equal(item.explanationStatus, "unavailable");
  assert.ok(item.purpose.trim(), "An unavailable file should have an honest fallback purpose.");
  assert.ok(item.significance.trim(), "An unavailable file should have an honest fallback significance.");
}

test("legacy and empty explanations keep important files with unavailable fallbacks", () => {
  for (const explanations of [undefined, []]) {
    const result = mapRepositoryResponse(response(["src/index.ts", "README.md"], explanations));

    assert.deepEqual(result.overview.fileExplanations, []);
    assert.deepEqual(result.importantFiles.map(({ path }) => path), ["src/index.ts", "README.md"]);
    for (const item of result.importantFiles) {
      assertUnavailable(item);
      assert.equal(item.truncated, false);
    }
  }
});

test("joins explanations by path while preserving selected file order and types", () => {
  const first = explanation("src/index.ts", "Starts the app.", "Provides the entry point.");
  const second = explanation("src/config.ts", "Defines settings.", "Controls configuration.");
  const input = response([first.path, second.path], [second, first]);
  input.importantFiles[1].type = "configuration";
  const result = mapRepositoryResponse(input);

  assert.deepEqual(result.importantFiles.map(({ path, type, purpose, significance, explanationStatus }) => ({
    path, type, purpose, significance, explanationStatus,
  })), [
    { ...first, type: "blob", explanationStatus: "available" },
    { ...second, type: "configuration", explanationStatus: "available" },
  ]);
});

test("requires exact paths without matching basenames, case, slashes, or whitespace", () => {
  const input = response([
    "src/index.ts",
    "src/Config.ts",
    "src/routes.ts",
    "src/format.ts",
    "src/exact.ts",
  ], [
    explanation("index.ts"),
    explanation("src/config.ts"),
    explanation("src\\routes.ts"),
    explanation(" src/format.ts "),
    explanation("src/exact.ts"),
  ]);
  const result = mapRepositoryResponse(input);

  for (const item of result.importantFiles.slice(0, 4)) assertUnavailable(item);
  assert.equal(result.importantFiles[4].explanationStatus, "available");
  assert.deepEqual(result.importantFiles.map(({ path }) => path), input.importantFiles.map(({ path }) => path));
});

test("invented model paths never create additional important-file cards", () => {
  const result = mapRepositoryResponse(response(["src/index.ts"], [
    explanation("src/invented.ts", "Invented purpose.", "Invented significance."),
    explanation("src/index.ts", "Real purpose.", "Real significance."),
  ]));

  assert.equal(result.importantFiles.length, 1);
  assert.equal(result.importantFiles[0].path, "src/index.ts");
  assert.equal(result.importantFiles[0].purpose, "Real purpose.");
  assert.equal(mapRepositoryResponse(response([], [explanation("src/invented.ts")])).importantFiles.length, 0);
});

test("uses the first complete nonblank duplicate and trims explanation text", () => {
  const result = mapRepositoryResponse(response(["src/index.ts", "src/blank.ts"], [
    explanation("src/index.ts", " \t\n", "Has a significance."),
    explanation("src/index.ts", "Has a purpose.", " \n"),
    explanation("src/index.ts", "  First valid purpose.\n", "\tFirst valid significance.  "),
    explanation("src/index.ts", "Later purpose.", "Later significance."),
    explanation("src/blank.ts", "", ""),
  ]));

  assert.equal(result.importantFiles[0].purpose, "First valid purpose.");
  assert.equal(result.importantFiles[0].significance, "First valid significance.");
  assert.equal(result.importantFiles[0].explanationStatus, "available");
  assertUnavailable(result.importantFiles[1]);
});

test("carries truncation metadata only to the exact matching important file", () => {
  const input = response(["src/excerpt.ts", "src/full.ts", "src/Other.ts", "src/unexplained.ts"], [
    explanation("src/excerpt.ts"),
    explanation("src/full.ts"),
    explanation("src/Other.ts"),
  ]);
  input.fileContents = [
    { path: "src/excerpt.ts", truncated: true, error: null },
    { path: "src/full.ts", truncated: false, error: null },
    { path: "src/other.ts", truncated: true, error: null },
    { path: "src/unexplained.ts", truncated: true, error: null },
  ];
  const result = mapRepositoryResponse(input);

  assert.deepEqual(result.importantFiles.map(({ truncated }) => truncated), [true, false, false, true]);
  assert.equal(result.importantFiles[0].explanationStatus, "available");
  assertUnavailable(result.importantFiles[3]);
});

test("suppresses explanations for read errors while allowing absent, null, or empty errors", () => {
  const paths = ["src/failed.ts", "src/null.ts", "src/empty.ts", "src/absent.ts", "src/Case.ts"];
  const input = response(paths, paths.map((path) => explanation(path, `Purpose for ${path}.`, `Significance for ${path}.`)));
  input.fileContents = [
    { path: "src/failed.ts", truncated: false, error: "File could not be read." },
    { path: "src/null.ts", truncated: false, error: null },
    { path: "src/empty.ts", truncated: false, error: "" },
    { path: "src/absent.ts", truncated: false },
    { path: "src/case.ts", truncated: false, error: "Another file could not be read." },
  ];
  const result = mapRepositoryResponse(input);

  assertUnavailable(result.importantFiles[0]);
  assert.notEqual(result.importantFiles[0].purpose, "Purpose for src/failed.ts.");
  assert.notEqual(result.importantFiles[0].significance, "Significance for src/failed.ts.");
  for (const item of result.importantFiles.slice(1)) {
    assert.equal(item.explanationStatus, "available");
    assert.equal(item.purpose, `Purpose for ${item.path}.`);
  }
});
