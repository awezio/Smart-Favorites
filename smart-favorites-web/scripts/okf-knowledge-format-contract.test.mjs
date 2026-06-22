import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();
const read = (...segments) => readFileSync(join(root, ...segments), "utf8");

const packageJson = read("package.json");
const types = read("lib", "knowledge-format", "types.ts");
const exporter = read("lib", "knowledge-format", "export.ts");
const route = read("app", "api", "knowledge", "export", "route.ts");

assert.match(
  packageJson,
  /"test:okf-knowledge-format":\s*"node scripts\/okf-knowledge-format-contract\.test\.mjs"/,
  "package scripts should expose the OKF knowledge format contract test."
);
assert.match(types, /export type SfkfManifest/, "OKF format should define a manifest type.");
assert.match(types, /export type KnowledgeNode/, "OKF format should define knowledge nodes.");
assert.match(types, /export type KnowledgeSource/, "OKF format should define knowledge sources.");
assert.match(types, /type:\s*"bookmark"\s*\|\s*"star"\s*\|\s*"document"\s*\|\s*"chunk"/, "OKF nodes should cover current knowledge item types.");
assert.match(exporter, /export async function exportKnowledgeAsSfkf/, "OKF exporter should expose a backend export function.");
assert.match(exporter, /manifest\.yaml/, "OKF exporter should generate manifest.yaml.");
assert.match(exporter, /indexes\/nodes\.yaml/, "OKF exporter should generate nodes.yaml.");
assert.match(exporter, /indexes\/sources\.yaml/, "OKF exporter should generate sources.yaml.");
assert.match(exporter, /fetchAllKnowledgeRows/, "OKF exporter should share a paginated fetch helper.");
assert.match(exporter, /\.range\(offset,\s*offset \+ EXPORT_PAGE_SIZE - 1\)/, "OKF exporter should page through all rows instead of relying on the PostgREST default page.");
assert.match(route, /exportKnowledgeAsSfkf/, "OKF export API should use the shared exporter.");
assert.match(route, /application\/json/, "OKF export API should return a machine-readable payload.");

console.log("okf knowledge format contract passed");
