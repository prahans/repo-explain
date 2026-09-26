type TreeItem = {
  path: string;
  type: string;
};

type Dependencies = Record<string, string>;

export function detectTechnologies(
  tree: TreeItem[],
  dependencies: Dependencies = {},
  devDependencies: Dependencies = {},
) {
  const technologies = new Set<string>();

  const paths = tree.map((item) => item.path);

  const allDependencies = {
    ...dependencies,
    ...devDependencies,
  };

  // -------------------------
  // Languages / ecosystems
  // -------------------------

  // JavaScript
  if (
    paths.some((path) => path.endsWith(".js")) ||
    paths.includes("package.json")
  ) {
    technologies.add("JavaScript");
  }

  // TypeScript
  if (
    paths.some((path) => path.endsWith(".ts") || path.endsWith(".tsx")) ||
    allDependencies["typescript"]
  ) {
    technologies.add("TypeScript");
  }

  // Python
  if (
    paths.some((path) => path.endsWith(".py")) ||
    paths.includes("requirements.txt") ||
    paths.includes("pyproject.toml") ||
    paths.includes("Pipfile")
  ) {
    technologies.add("Python");
  }

  // Go
  if (paths.some((path) => path.endsWith(".go")) || paths.includes("go.mod")) {
    technologies.add("Go");
  }

  // Rust
  if (
    paths.some((path) => path.endsWith(".rs")) ||
    paths.includes("Cargo.toml")
  ) {
    technologies.add("Rust");
  }

  // Java
  if (
    paths.some((path) => path.endsWith(".java")) ||
    paths.includes("pom.xml") ||
    paths.includes("build.gradle")
  ) {
    technologies.add("Java");
  }

  // Ruby
  if (paths.some((path) => path.endsWith(".rb")) || paths.includes("Gemfile")) {
    technologies.add("Ruby");
  }

  // -------------------------
  // JavaScript frameworks
  // -------------------------

  if (allDependencies["react"]) {
    technologies.add("React");
  }

  if (allDependencies["next"]) {
    technologies.add("Next.js");
  }

  if (allDependencies["express"]) {
    technologies.add("Express");
  }

  if (allDependencies["vite"]) {
    technologies.add("Vite");
  }

  if (allDependencies["tailwindcss"]) {
    technologies.add("Tailwind CSS");
  }

  if (allDependencies["node"]) {
    technologies.add("Node.js");
  }

  // -------------------------
  // Databases / ORMs
  // -------------------------

  if (allDependencies["mongoose"]) {
    technologies.add("MongoDB");
    technologies.add("Mongoose");
  }

  if (allDependencies["mongodb"]) {
    technologies.add("MongoDB");
  }

  if (allDependencies["pg"]) {
    technologies.add("PostgreSQL");
  }

  if (allDependencies["prisma"] || allDependencies["@prisma/client"]) {
    technologies.add("Prisma");
  }

  return Array.from(technologies);
}
