import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectTree, filterProjectTree } from "../lib/projectTree.ts";

const blob = (path) => ({ path, type: "blob" });

function paths(root, prefix = "") {
  return (root.children ?? []).flatMap((child) => {
    const path = prefix ? `${prefix}/${child.name}` : child.name;
    return [path, ...paths(child, path)];
  });
}

test("focused view removes nested build and dependency output and counts every hidden node", () => {
  const tree = buildProjectTree("example", [
    blob("src/index.ts"),
    blob("packages/site/.next/cache/data.json"),
    blob("packages/site/node_modules/react/index.js"),
    blob("packages/site/dist/app.js"),
    blob("packages/site/package-lock.json"),
    blob("packages/site/package.json"),
    blob(".git/objects/abc"),
    blob(".vscode/settings.json"),
    blob("tsconfig.tsbuildinfo"),
    blob(".DS_Store"),
  ]);

  const result = filterProjectTree(tree);
  assert.deepEqual(paths(result.root), [
    "src",
    "src/index.ts",
    "packages",
    "packages/site",
    "packages/site/package.json",
  ]);
  assert.equal(result.hiddenCount, 16);
  assert.equal(result.fileCount, 2);
  assert.equal(result.folderCount, 3);

  const full = filterProjectTree(tree, true);
  assert.deepEqual(full.root, tree);
  assert.equal(full.hiddenCount, 0);
  assert.equal(
    result.hiddenCount + result.fileCount + result.folderCount,
    full.fileCount + full.folderCount,
  );
});

test("keeps real Next.js route conventions, dotfiles, tests, docs and assets", () => {
  const entries = [
    "app/(marketing)/page.tsx",
    "app/blog/[slug]/page.tsx",
    "app/docs/[[...slug]]/page.tsx",
    "app/@modal/(..)photo/[id]/page.tsx",
    "app/_components/card.tsx",
    ".github/workflows/check.yml",
    ".gitignore",
    ".env.example",
    ".env.local",
    ".npmrc",
    "tests/fixtures/example.lock",
    "docs/building.md",
    "public/logo.svg",
    "src/cache.ts",
    "scripts/build.ts",
    "lib/lock.ts",
  ].map(blob);
  const result = filterProjectTree(buildProjectTree("example", entries));
  const visible = new Set(paths(result.root));

  for (const { path } of entries) assert.ok(visible.has(path), path);
  assert.equal(result.hiddenCount, 0);
  assert.equal(result.fileCount, entries.length);
});

test("rejects malformed Git paths without inventing folders", () => {
  const malformed = [
    "",
    "/absolute/file.ts",
    "//server/file.ts",
    "C:/absolute/file.ts",
    "C:\\absolute\\file.ts",
    "src\\file.ts",
    "src//file.ts",
    "src/",
    ".",
    "..",
    "./src/file.ts",
    "../file.ts",
    "src/../file.ts",
    "src/./file.ts",
    "src/\u0000bad.ts",
    "src/\nfile.ts",
  ].map(blob);
  const tree = buildProjectTree("example", [
    ...malformed,
    { path: "strange/folder.ts", type: "unknown" },
    blob("src/real file.ts"),
    blob("src/real file.ts"),
  ]);

  assert.deepEqual(paths(tree), ["src", "src/real file.ts"]);
});

test("keeps folders before files and prioritizes source and project entry points", () => {
  const tree = buildProjectTree("example", [
    blob("zebra.ts"),
    blob("package.json"),
    blob("a.ts"),
    blob("README.md"),
    blob("other/file.ts"),
    blob("docs/setup.md"),
    blob("src/file10.ts"),
    blob("src/file2.ts"),
    blob("app/page.tsx"),
    { path: "empty", type: "tree" },
  ]);

  assert.deepEqual(tree.children.map((node) => node.name), [
    "src", "app", "docs", "empty", "other", "README.md", "package.json", "a.ts", "zebra.ts",
  ]);
  assert.deepEqual(tree.children[0].children.map((node) => node.name), [
    "file2.ts", "file10.ts",
  ]);
  assert.deepEqual(filterProjectTree(tree).root, tree);
});

test("does not mutate input nodes, descriptions, order, or entries", () => {
  const sourceFile = Object.freeze({ name: "index.ts", description: "Entry point" });
  const sourceFolder = Object.freeze({
    name: "src", children: Object.freeze([sourceFile]),
  });
  const root = Object.freeze({
    name: "example",
    description: "Repository",
    children: Object.freeze([
      Object.freeze({ name: "package-lock.json" }),
      sourceFolder,
    ]),
  });

  const result = filterProjectTree(root);
  assert.equal(root.children.length, 2);
  assert.equal(root.children[0].name, "package-lock.json");
  assert.notEqual(result.root, root);
  assert.notEqual(result.root.children[0], sourceFolder);
  assert.notEqual(result.root.children[0].children[0], sourceFile);
  assert.equal(result.root.children[0].children[0].description, "Entry point");

  const entries = Object.freeze([Object.freeze(blob("src/index.ts"))]);
  assert.deepEqual(paths(buildProjectTree("example", entries)), ["src", "src/index.ts"]);
});

test("handles an empty repository, all-hidden files, and a root named like an excluded directory", () => {
  assert.deepEqual(filterProjectTree(buildProjectTree("empty", [])), {
    root: { name: "empty", children: [] },
    hiddenCount: 0,
    fileCount: 0,
    folderCount: 0,
  });
  assert.deepEqual(filterProjectTree(buildProjectTree("example", [blob("yarn.lock")])), {
    root: { name: "example", children: [] },
    hiddenCount: 1,
    fileCount: 0,
    folderCount: 0,
  });
  const result = filterProjectTree(buildProjectTree("dist", [blob("src/index.ts")]));
  assert.equal(result.root.name, "dist");
  assert.equal(result.fileCount, 1);
  assert.equal(result.folderCount, 1);
});

test("represents Git submodules as real entries without fabricating child folders", () => {
  const tree = buildProjectTree("example", [
    { path: "packages/shared", type: "commit" },
    { path: "packages", type: "tree" },
  ]);
  const result = filterProjectTree(tree);
  assert.deepEqual(result.root.children[0].children, [
    { name: "shared", description: "Git submodule" },
  ]);
  assert.equal(result.fileCount, 1);
  assert.equal(result.folderCount, 1);
});
