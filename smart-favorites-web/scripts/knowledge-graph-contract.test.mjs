import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();
const read = (...segments) => readFileSync(join(root, ...segments), "utf8");

const packageJson = read("package.json");
const types = read("lib", "knowledge-format", "types.ts");
const links = read("lib", "knowledge-format", "links.ts");
const records = read("lib", "knowledge-format", "records.ts");
const exporter = read("lib", "knowledge-format", "export.ts");
const routePath = join(root, "app", "api", "knowledge", "graph", "route.ts");
const pagePath = join(root, "app", "dashboard", "knowledge", "page.tsx");
const route = read("app", "api", "knowledge", "graph", "route.ts");
const page = read("app", "dashboard", "knowledge", "page.tsx");
const layout = read("app", "dashboard", "layout.tsx");

assert.match(
  packageJson,
  /"test:knowledge-graph":\s*"node scripts\/knowledge-graph-contract\.test\.mjs"/,
  "package scripts should expose the knowledge graph contract test."
);

assert.ok(existsSync(routePath), "Knowledge graph API route should exist.");
assert.ok(existsSync(pagePath), "Dashboard knowledge graph page should exist.");
assert.match(types, /export type KnowledgeEdge/, "OKF types should define portable graph edges.");
assert.match(types, /same_domain[\s\S]*same_folder[\s\S]*same_language[\s\S]*shared_topic/, "Knowledge edges should encode relationship reasons.");
assert.match(records, /KNOWLEDGE_PAGE_SIZE[\s\S]*\.range\(offset,\s*offset \+ KNOWLEDGE_PAGE_SIZE - 1\)/, "Knowledge graph data fetches should page through all records.");
assert.match(links, /export function buildKnowledgeEdges/, "Graph links should be reusable by OKF export.");
assert.match(links, /export function buildKnowledgeGraph/, "API should use a bounded graph payload builder.");
assert.match(links, /selectGraphNodes[\s\S]*bookmark[\s\S]*star[\s\S]*document/, "Graph sampling should preserve bookmarks, stars, and documents.");
assert.match(exporter, /indexes\/links\.yaml[\s\S]*serializeLinks/, "OKF export should include links.yaml.");
assert.match(route, /buildKnowledgeGraph/, "Graph API should return the shared graph payload.");
assert.match(route, /fetchAllKnowledgeRows/, "Graph API should use paginated knowledge record loading.");
assert.match(page, /Link Map[\s\S]*GraphCanvas[\s\S]*<svg/, "Knowledge page should render a graph visualization.");
assert.match(page, /kanban[\s\S]*column\.nodeIds/, "Knowledge page should include a kanban-style linked item view.");
assert.match(layout, /\/dashboard\/knowledge[\s\S]*Knowledge Graph/, "Dashboard nav should link to the knowledge graph.");

console.log("knowledge graph contract passed");
