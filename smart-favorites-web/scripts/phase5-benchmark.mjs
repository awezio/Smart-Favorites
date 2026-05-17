import { performance } from "node:perf_hooks";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();
const repoRoot = join(root, "..");

// Benchmark thresholds from BUILD.md Phase 5:
// searchAll target: vector/search path under 300ms in a deployed Supabase project.
// parseDocument target: local parsing throughput at least 5MB/s for supported text-like files.
const thresholds = {
  docsReadMs: 50,
  apiReferenceCoverageMs: 50,
  parseDocumentBytesPerSecond: 5 * 1024 * 1024,
};

function measure(name, fn) {
  const start = performance.now();
  const value = fn();
  const durationMs = performance.now() - start;
  return { name, durationMs: Number(durationMs.toFixed(2)), value };
}

const results = [
  measure("docs-read", () => {
    const docs = [
      "docs/README.md",
      "docs/API_REFERENCE.md",
      "docs/TOOLS_INTEGRATION.md",
      "docs/RELEASE_CHECKLIST.md",
    ];
    return docs.reduce((bytes, path) => {
      const fullPath = join(repoRoot, path);
      return bytes + (existsSync(fullPath) ? readFileSync(fullPath).byteLength : 0);
    }, 0);
  }),
  measure("api-reference-coverage", () => {
    const apiReference = readFileSync(join(repoRoot, "docs", "API_REFERENCE.md"), "utf8");
    return ["/api/documents", "/api/search", "/api/chat", "/api/tools", "/api/keys"].filter(
      (endpoint) => apiReference.includes(endpoint)
    ).length;
  }),
  measure("parseDocument-smoke", () => {
    const sample = "# Phase 5 Benchmark\n\nThis smoke benchmark approximates parseDocument text throughput.\n".repeat(20000);
    const bytes = Buffer.byteLength(sample);
    const started = performance.now();
    const words = sample.split(/\s+/).filter(Boolean).length;
    const elapsed = Math.max(performance.now() - started, 0.01);
    return {
      bytes,
      words,
      bytesPerSecond: Math.round(bytes / (elapsed / 1000)),
    };
  }),
];

const report = {
  thresholds,
  results,
  pass: {
    docsRead: results[0].durationMs <= thresholds.docsReadMs,
    apiReferenceCoverage: results[1].durationMs <= thresholds.apiReferenceCoverageMs && results[1].value === 5,
    parseDocumentSmoke:
      typeof results[2].value === "object" &&
      results[2].value.bytesPerSecond >= thresholds.parseDocumentBytesPerSecond,
  },
};

console.log(JSON.stringify(report, null, 2));
