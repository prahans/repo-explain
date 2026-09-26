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

      const importantSourceFolders = new Set([
        "routes",
        "controllers",
        "models",
        "middleware",
        "middlewares",
        "services",
        "config",
      ]);

      const isImportantSourceFile = folders.some((folder) =>
        importantSourceFolders.has(folder),
      );

      const isRootMiddleware = folders.length === 0 && name === "middleware";

      return (
        isCodeFile &&
        (entryNames.has(name) || isImportantSourceFile || isRootMiddleware)
      );
    })
    .map((item) => item.path)
    .sort((a, b) => {
      const rootPriority = (path: string): number => {
        const lowerPath = path.toLowerCase();

        if (lowerPath === "readme.md") return 0;
        if (lowerPath === "package.json") return 1;

        return 2;
      };

      // Root README first, root package.json second.
      const priorityDifference = rootPriority(a) - rootPriority(b);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      // Then prefer files closer to the repository root.
      const depthDifference = a.split("/").length - b.split("/").length;

      if (depthDifference !== 0) {
        return depthDifference;
      }

      // Keep selection predictable for files at the same depth.
      return a.localeCompare(b);
    })
    .slice(0, 20);
}
