type TreeItem = {
  path: string;
  type: string;
};

export function getImportantFiles(tree: TreeItem[]): string[] {
  const ignoredFolders = new Set([
    "node_modules",
    ".next",
    "dist",
    "build",
    "coverage",
    ".git",
    "__tests__",
    "__mocks__",
    "__fixtures__",
    "fixtures",
  ]);

  const importantNames = new Set([
    "readme.md",
    "package.json",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "vite.config.js",
    "vite.config.ts",
    "schema.prisma",
  ]);

  const entryNames = new Set([
    "index",
    "main",
    "server",
    "app",
    "page",
    "layout",
    "route",
  ]);

  return tree
    .filter((item) => {
      // Only select files.
      if (item.type !== "blob") return false;

      const parts = item.path.toLowerCase().split("/");
      const fileName = parts[parts.length - 1];
      const folders = parts.slice(0, -1);

      // Skip generated files and installed dependencies.
      if (folders.some((folder) => ignoredFolders.has(folder))) {
        return false;
      }

      if (importantNames.has(fileName)) return true;

      const dotIndex = fileName.lastIndexOf(".");
      const name = fileName.slice(0, dotIndex);
      const extension = fileName.slice(dotIndex + 1);

      const isCodeFile = ["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(
        extension,
      );

      return isCodeFile && entryNames.has(name);
    })
    .map((item) => item.path);
}
