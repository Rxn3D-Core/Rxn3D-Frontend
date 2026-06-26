// Minimal module-resolution hook so `node --test` can resolve the project's
// "@/*" path alias (mapped to the repo root in tsconfig.json). Use with:
//   node --import ./test-alias-loader.mjs --test <file>
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./test-alias-resolver.mjs", pathToFileURL("./"));
