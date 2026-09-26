type TreeItem = {
  path: string;
  type: string;
};

type Dependencies = Record<string, string>;

export function detectTechnologies(
  primaryLanguage: string | null,
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

  function hasFile(...files: string[]) {
    return files.some((file) =>
      paths.some((path) => path === file || path.endsWith(`/${file}`)),
    );
  }

  // --------------------------------
  // Frameworks
  // --------------------------------

  const usesNext = hasPackage("next");
  const usesReact = hasPackage("react");
  const usesExpress = hasPackage("express");
  const usesNest = hasPackage("@nestjs/core");

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

  if (hasPackage("nuxt")) {
    addTechnology("Nuxt");
  } else if (hasPackage("vue")) {
    addTechnology("Vue");
  }

  if (hasPackage("@sveltejs/kit")) {
    addTechnology("SvelteKit");
  } else if (hasPackage("svelte")) {
    addTechnology("Svelte");
  }

  // --------------------------------
  // Primary language
  // --------------------------------

  if (primaryLanguage === "TypeScript") {
    addTechnology("TypeScript");
  }

  if (
    primaryLanguage === "JavaScript" &&
    !usesNext &&
    !usesReact &&
    !usesExpress &&
    !usesNest
  ) {
    addTechnology("JavaScript");
  }

  if (primaryLanguage === "Python") {
    addTechnology("Python");
  }

  if (primaryLanguage === "Go") {
    addTechnology("Go");
  }

  if (primaryLanguage === "Rust") {
    addTechnology("Rust");
  }

  if (primaryLanguage === "Java") {
    addTechnology("Java");
  }

  if (primaryLanguage === "Ruby") {
    addTechnology("Ruby");
  }

  // Fallback for repositories where GitHub language is missing
  if (!primaryLanguage) {
    if (hasFile("requirements.txt", "pyproject.toml", "Pipfile")) {
      addTechnology("Python");
    }

    if (hasFile("go.mod")) {
      addTechnology("Go");
    }

    if (hasFile("Cargo.toml")) {
      addTechnology("Rust");
    }

    if (hasFile("Gemfile")) {
      addTechnology("Ruby");
    }

    if (hasFile("pom.xml", "build.gradle", "build.gradle.kts")) {
      addTechnology("Java");
    }
  }

  // --------------------------------
  // Styling
  // --------------------------------

  if (hasPackage("tailwindcss")) {
    addTechnology("Tailwind CSS");
  }

  // --------------------------------
  // Databases
  // --------------------------------

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

  // --------------------------------
  // ORM
  // --------------------------------

  if (hasPackage("prisma", "@prisma/client")) {
    addTechnology("Prisma");
  }

  return technologies;
}
