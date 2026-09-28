import assert from "node:assert/strict";
import test from "node:test";
import { filterFileExplanations } from "../lib/filterFileExplanations.ts";

const readable = (path, overrides = {}) => ({
  path,
  content: "export const value = 1;",
  error: null,
  truncated: false,
  ...overrides,
});
const explanation = (path, overrides = {}) => ({
  path,
  purpose: "Exports a value.",
  significance: "Provides a shared value for the project.",
  ...overrides,
});

test("accepts readable files and truncated excerpts, preserving exact paths", () => {
  const files = [
    readable("src/index.ts"),
    readable("app/(main)/[id]/page.tsx", { truncated: true }),
    readable(" spaced filename.ts "),
  ];
  const explanations = files.map(({ path }) => explanation(path));

  assert.deepEqual(filterFileExplanations(explanations, files), explanations);
});

test("rejects invented paths and does not normalize paths into matches", () => {
  const files = [readable("src/index.ts")];
  const explanations = [
    "src/missing.ts",
    "index.ts",
    "./src/index.ts",
    "/src/index.ts",
    "src/../src/index.ts",
    "src\\index.ts",
    "src/INDEX.ts",
    " src/index.ts ",
    "src/index.ts",
  ].map((path) => explanation(path));

  assert.deepEqual(filterFileExplanations(explanations, files), [
    explanation("src/index.ts"),
  ]);
});

test("excludes unreadable, empty, and errored files even when their paths match", () => {
  const files = [
    readable("missing.ts", { content: null, error: "File not found" }),
    readable("empty.ts", { content: "" }),
    readable("blank.ts", { content: " \n\t " }),
    readable("errored.ts", { error: "Could not read complete file" }),
    readable("invalid-content.ts", { content: 123 }),
    readable("invalid-error.ts", { error: { message: "Read failed" } }),
    readable("readable.ts"),
  ];

  assert.deepEqual(
    filterFileExplanations(files.map(({ path }) => explanation(path)), files),
    [explanation("readable.ts")],
  );
});

test("drops malformed explanations and keeps the first valid explanation per path", () => {
  const valid = explanation("src/index.ts");
  const explanations = [
    null,
    "not an object",
    [],
    {},
    explanation(5),
    explanation("src/index.ts", { purpose: undefined }),
    explanation("src/index.ts", { purpose: " \n " }),
    explanation("src/index.ts", { significance: 42 }),
    explanation("src/index.ts", { significance: "\t" }),
    { ...valid, purpose: ` ${valid.purpose}\n`, significance: `\t${valid.significance} ` },
    explanation("src/index.ts", { purpose: "Later duplicate." }),
  ];

  assert.deepEqual(filterFileExplanations(explanations, [readable(valid.path)]), [valid]);
});

test("returns an empty array for absent or malformed collections and selected files", () => {
  for (const invalid of [undefined, null, {}, "text", 1, []]) {
    assert.deepEqual(filterFileExplanations(invalid, [readable("src/index.ts")]), []);
    assert.deepEqual(filterFileExplanations([explanation("src/index.ts")], invalid), []);
  }

  assert.deepEqual(
    filterFileExplanations([explanation("src/index.ts")], [null, [], {}, "src/index.ts"]),
    [],
  );
});

test("does not mutate selected files or explanations", () => {
  const files = Object.freeze([Object.freeze(readable("src/index.ts"))]);
  const explanations = Object.freeze([
    Object.freeze(explanation("src/index.ts", { purpose: " Exports a value. " })),
  ]);

  assert.deepEqual(filterFileExplanations(explanations, files), [explanation("src/index.ts")]);
  assert.equal(explanations[0].purpose, " Exports a value. ");
  assert.equal(files[0].content, "export const value = 1;");
});
