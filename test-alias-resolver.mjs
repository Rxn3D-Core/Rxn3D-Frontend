// Resolver hook: rewrite "@/..." specifiers to absolute file URLs under the
// repo root, appending ".ts" when the import omits an extension (matching how
// the tsconfig "@/*" -> "./*" alias resolves source files in tests).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = new URL("./", import.meta.url);

function firstExisting(baseHref) {
  const candidates = [baseHref, `${baseHref}.ts`, `${baseHref}.tsx`, `${baseHref}/index.ts`];
  for (const candidate of candidates) {
    try {
      if (existsSync(fileURLToPath(candidate))) return candidate;
    } catch {
      // ignore non-file URLs
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // "@/..." alias -> repo root.
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), ROOT);
    return nextResolve(firstExisting(base.href) ?? `${base.href}.ts`, context);
  }
  // Extensionless relative imports inside resolved TS sources.
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z]+$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL);
    const resolved = firstExisting(base.href);
    if (resolved) return nextResolve(resolved, context);
  }
  return nextResolve(specifier, context);
}
