/** TEMP: resolve "@/..." and extensionless relative imports to .ts/.tsx files. */
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = "D:/Projects/Rxn3D-Frontend/";

function resolveFile(basePath) {
  for (const candidate of [basePath, `${basePath}.ts`, `${basePath}.tsx`, `${basePath}/index.ts`]) {
    try {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    } catch {}
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const found = resolveFile(ROOT + specifier.slice(2));
    if (found) return nextResolve(pathToFileURL(found).href, context);
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    const found = resolveFile(base);
    if (found) return nextResolve(pathToFileURL(found).href, context);
  }
  return nextResolve(specifier, context);
}
