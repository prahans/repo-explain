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
  const technologies: string[] = [];

  const paths = tree.map((item) => item.path);

  const allDependencies = {
    ...dependencies,
    ...devDependencies,
  };

  function addTechnology(name: string) {
    if (!technologies.includes(name)) {
      technologies.push(name);
    }
  }

  function hasPackage(...packages: string[]) {
    return packages.some((pkg) => Boolean(allDependencies[pkg]));
  }

  function hasExtension(...extensions: string[]) {
    return paths.some((path) =>
      extensions.some((extension) => path.endsWith(extension)),
    );
  }

  function hasFile(...files: string[]) {
    return files.some((file) =>
      paths.some((path) => path === file || path.endsWith(`/${file}`)),
    );
  }

  // =====================================================
  // JavaScript / TypeScript frameworks
  // =====================================================

  const usesNext = hasPackage("next");
  const usesReact = hasPackage("react");
  const usesExpress = hasPackage("express");
  const usesNest = hasPackage("@nestjs/core");
  const usesVue = hasPackage("vue");
  const usesNuxt = hasPackage("nuxt");
  const usesSvelte = hasPackage("svelte");
  const usesSvelteKit = hasPackage("@sveltejs/kit");

  // Next.js already implies React
  if (usesNext) {
    addTechnology("Next.js");
  } else if (usesReact) {
    addTechnology("React");
  }

  if (usesNest) {
    addTechnology("NestJS");
  } else if (usesExpress) {
    addTechnology("Express");
  }

  // Nuxt already implies Vue
  if (usesNuxt) {
    addTechnology("Nuxt");
  } else if (usesVue) {
    addTechnology("Vue");
  }

  // SvelteKit already implies Svelte
  if (usesSvelteKit) {
    addTechnology("SvelteKit");
  } else if (usesSvelte) {
    addTechnology("Svelte");
  }

  // =====================================================
  // Language
  // =====================================================

  const usesTypeScript =
    hasPackage("typescript") || hasExtension(".ts", ".tsx");

  const usesJavaScript =
    hasExtension(".js", ".jsx", ".mjs", ".cjs") || hasFile("package.json");

  if (usesTypeScript) {
    // Show TypeScript instead of both JS + TS
    addTechnology("TypeScript");
  } else if (
    usesJavaScript &&
    !usesNext &&
    !usesReact &&
    !usesExpress &&
    !usesNest &&
    !usesVue &&
    !usesNuxt &&
    !usesSvelte &&
    !usesSvelteKit
  ) {
    // Only show JavaScript for a vanilla JS project
    addTechnology("JavaScript");
  }

  // =====================================================
  // Other languages
  // =====================================================

  if (
    hasExtension(".py") ||
    hasFile("requirements.txt", "pyproject.toml", "Pipfile")
  ) {
    addTechnology("Python");
  }

  if (hasExtension(".go") || hasFile("go.mod")) {
    addTechnology("Go");
  }

  if (hasExtension(".rs") || hasFile("Cargo.toml")) {
    addTechnology("Rust");
  }

  if (
    hasExtension(".java") ||
    hasFile("pom.xml", "build.gradle", "build.gradle.kts")
  ) {
    addTechnology("Java");
  }

  if (hasExtension(".rb") || hasFile("Gemfile")) {
    addTechnology("Ruby");
  }

  // =====================================================
  // Styling
  // =====================================================

  if (hasPackage("tailwindcss")) {
    addTechnology("Tailwind CSS");
  }

  // =====================================================
  // Databases
  // =====================================================

  // Mongoose means MongoDB, so don't display both
  if (hasPackage("mongoose", "mongodb")) {
    addTechnology("MongoDB");
  }

  if (hasPackage("pg", "postgres")) {
    addTechnology("PostgreSQL");
  }

  if (hasPackage("mysql", "mysql2")) {
    addTechnology("MySQL");
  }

  if (hasPackage("sqlite3", "better-sqlite3")) {
    addTechnology("SQLite");
  }

  if (hasPackage("redis", "ioredis")) {
    addTechnology("Redis");
  }

  // =====================================================
  // ORM
  // =====================================================

  if (hasPackage("prisma", "@prisma/client")) {
    addTechnology("Prisma");
  }

  return technologies;
}
