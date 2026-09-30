import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../", import.meta.url));

// Small test-only loader for Next aliases and CSS imports, using installed TS.
export function createTypeScriptLoader({ dependencies = {}, env = process.env, logger = console } = {}) {
  const cache = new Map();
  function load(relativePath) {
    const filename = path.resolve(root, relativePath);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    new Function("require", "module", "exports", "process", "console", outputText)((specifier) => {
      if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
      if (specifier.endsWith(".css")) return {};
      if (specifier.startsWith("@/") || specifier.startsWith(".")) {
        const target = specifier.startsWith("@/") ? path.resolve(root, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
        const resolved = [target, `${target}.ts`, `${target}.tsx`].find(existsSync);
        if (!resolved) throw new Error(`Cannot resolve test module: ${specifier}`);
        return load(resolved);
      }
      return require(specifier);
    }, loadedModule, loadedModule.exports, { env }, logger);
    return loadedModule.exports;
  }
  return load;
}
