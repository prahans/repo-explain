import type { ProjectNode } from "@/types/analysis";

type GitTreeEntry = { path: string; type: string };

// Keep this list explicit: source, docs, tests, assets, and useful dotfiles belong
// in the focused view. The full view can still reveal every valid repository path.
const excludedFolders = new Set([
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "target",
  "coverage",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".angular",
  ".cache",
  ".turbo",
  ".parcel-cache",
  ".vite",
  ".vercel",
  ".netlify",
  ".nyc_output",
  ".git",
  ".hg",
  ".svn",
  ".idea",
  ".vscode",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".tox",
  ".venv",
  "venv",
  ".gradle",
  ".dart_tool",
  ".expo",
]);

const excludedFiles = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "composer.lock",
  "gemfile.lock",
  "pipfile.lock",
  "poetry.lock",
  "uv.lock",
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  ".git",
  "next-env.d.ts",
]);

const folderOrder = new Map(
  [
    "src",
    "app",
    "pages",
    "components",
    "lib",
    "hooks",
    "services",
    "api",
    "server",
    "client",
    "public",
    "assets",
    "styles",
    "types",
    "tests",
    "test",
    "__tests__",
    "docs",
    "examples",
    "scripts",
    ".github",
  ].map((name, index) => [name, index]),
);

function fileRank(name: string) {
  if (/^readme(?:\.|$)/i.test(name)) return 0;
  if (name === "package.json") return 1;
  if (name === "pyproject.toml" || name === "Cargo.toml") return 2;
  if (name === "go.mod" || name === "composer.json") return 2;
  return 3;
}

function compareNodes(a: ProjectNode, b: ProjectNode) {
  const aIsFolder = a.children !== undefined;
  const bIsFolder = b.children !== undefined;
  if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;

  const rank = aIsFolder
    ? (folderOrder.get(a.name) ?? folderOrder.size) -
      (folderOrder.get(b.name) ?? folderOrder.size)
    : fileRank(a.name) - fileRank(b.name);

  return (
    rank ||
    a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }) ||
    a.name.localeCompare(b.name, "en")
  );
}

function validPathParts(entry: GitTreeEntry): string[] | null {
  // Git uses relative, slash-separated paths. Reject malformed entries instead
  // of turning empty/traversal segments into fabricated folders in the UI.
  if (
    !["blob", "tree", "commit"].includes(entry.type) ||
    !entry.path ||
    /^[a-z]:/i.test(entry.path) ||
    /[\\\u0000-\u001f\u007f]/.test(entry.path)
  ) {
    return null;
  }

  const parts = entry.path.split("/");
  return parts.some((part) => !part || part === "." || part === "..")
    ? null
    : parts;
}

export function buildProjectTree(
  name: string,
  entries: GitTreeEntry[],
): ProjectNode {
  const root: ProjectNode = { name, children: [] };
  const nodes = new Map<string, ProjectNode>([["", root]]);

  for (const entry of entries) {
    const parts = validPathParts(entry);
    if (!parts) continue;

    let parent = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFolder = index < parts.length - 1 || entry.type === "tree";
      let node = nodes.get(currentPath);

      if (!node) {
        node = isFolder ? { name: part, children: [] } : { name: part };
        nodes.set(currentPath, node);
        (parent.children ??= []).push(node);
      }

      if (isFolder) node.children ??= [];
      if (entry.type === "commit" && index === parts.length - 1) {
        node.description = "Git submodule";
      }
      parent = node;
    });
  }

  function sortChildren(node: ProjectNode) {
    node.children?.sort(compareNodes);
    node.children?.forEach(sortChildren);
  }

  sortChildren(root);
  return root;
}

function isExcluded(node: ProjectNode) {
  if (node.children !== undefined) return excludedFolders.has(node.name);

  const name = node.name.toLowerCase();
  return (
    excludedFiles.has(name) ||
    /\.(?:tsbuildinfo|pyc|pyo)$/.test(name) ||
    /\.(?:js|css)\.map$/.test(name) ||
    /^(?:npm-debug|yarn-debug|yarn-error|pnpm-debug)\.log(?:\.\d+)?$/.test(name)
  );
}

export function filterProjectTree(
  structure: ProjectNode,
  showExcluded = false,
): {
  root: ProjectNode;
  hiddenCount: number;
  fileCount: number;
  folderCount: number;
} {
  let hiddenCount = 0;
  let fileCount = 0;
  let folderCount = 0;

  function countHidden(node: ProjectNode) {
    hiddenCount += 1;
    node.children?.forEach(countHidden);
  }

  function visit(node: ProjectNode, isRoot = false): ProjectNode | null {
    if (!isRoot && !showExcluded && isExcluded(node)) {
      countHidden(node);
      return null;
    }

    if (!isRoot) {
      if (node.children !== undefined) folderCount += 1;
      else fileCount += 1;
    }

    if (node.children === undefined) return { ...node };

    const children: ProjectNode[] = [];
    for (const child of node.children) {
      const visibleChild = visit(child);
      if (visibleChild) children.push(visibleChild);
    }

    return { ...node, children: children.sort(compareNodes) };
  }

  // The repository itself always remains visible, even when it shares a name
  // with an excluded directory. Counts describe descendants, excluding root.
  const root = visit(structure, true)!;
  return { root, hiddenCount, fileCount, folderCount };
}
