import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();
const repoRoot = join(root, "..");

function readRepo(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function assertDoc(path, phrases) {
  const fullPath = join(repoRoot, path);
  assert.ok(existsSync(fullPath), `${path} must exist for Phase 5 release readiness`);
  const content = readFileSync(fullPath, "utf8");
  for (const phrase of phrases) {
    assert.match(content, new RegExp(phrase), `${path} must mention ${phrase}`);
  }
}

assertDoc("docs/README.md", ["Quick Start", "Supabase", "Vercel"]);
assertDoc("docs/ARCHITECTURE.md", ["Next\\.js", "Supabase", "pgvector"]);
assertDoc("docs/FEATURES.md", ["Bookmarks", "GitHub Stars", "Documents", "Square", "Tools"]);
assertDoc("docs/FILE_PARSING.md", ["PDF", "DOCX", "XLSX", "HTML"]);
assertDoc("docs/PLUGIN_DEVELOPMENT.md", ["SmartFavoritesPlugin", "permissions", "manifest"]);
assertDoc("docs/EXAMPLES.md", ["Paper Research Assistant", "Public Wiki", "Research Agent"]);
assertDoc("docs/TROUBLESHOOTING.md", ["Supabase", "Vercel", "extension token"]);
assertDoc("docs/FAQ.md", ["API key", "browser extension", "knowledge base"]);
assertDoc("docs/CHANGELOG.md", ["Phase 5", "release readiness"]);
assertDoc("docs/RELEASE_CHECKLIST.md", ["npm run test:phase5", "npm run build", "external release"]);

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert.equal(
  packageJson.scripts["test:phase5"],
  "node scripts/phase5-release-readiness.test.mjs",
  "package.json must expose the Phase 5 release readiness test"
);
assert.equal(
  packageJson.scripts["benchmark:phase5"],
  "node scripts/phase5-benchmark.mjs",
  "package.json must expose the Phase 5 benchmark script"
);

const benchmarkPath = join(root, "scripts", "phase5-benchmark.mjs");
assert.ok(existsSync(benchmarkPath), "Phase 5 benchmark script must exist");
const benchmark = readFileSync(benchmarkPath, "utf8");
for (const phrase of ["performance.now", "searchAll", "parseDocument", "Benchmark thresholds"]) {
  assert.match(benchmark, new RegExp(phrase), `benchmark script must include ${phrase}`);
}

const apiReference = readRepo("docs/API_REFERENCE.md");
for (const endpoint of ["/api/documents", "/api/search", "/api/chat", "/api/tools", "/api/keys"]) {
  assert.match(apiReference, new RegExp(endpoint.replaceAll("/", "\\/")), `API reference must document ${endpoint}`);
}

const buildPlan = readRepo("BUILD.md");
assert.match(buildPlan, /Phase 5.*本地发布就绪/s, "BUILD.md must record Phase 5 local release readiness");
assert.match(buildPlan, /外部发布待人工执行/, "BUILD.md must record external release follow-up");
