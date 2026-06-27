import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const schemaMigration = read(
  "supabase",
  "migrations",
  "20260627160000_github_stars_enrichment.sql"
);
const keywordMigration = read(
  "supabase",
  "migrations",
  "20260627161000_keyword_search_stars_enriched.sql"
);
const parser = read("lib", "parsers", "github-stars.ts");
const enrichStar = read("lib", "stars", "enrich-star.ts");
const describeBatchRoute = read("app", "api", "stars", "describe-batch", "route.ts");
const starsPage = read("app", "dashboard", "stars", "page.tsx");
const searchLib = read("lib", "rag", "search.ts");

assert.match(schemaMigration, /topics TEXT\[\]/, "Schema migration should add topics.");
assert.match(schemaMigration, /readme_summary_zh/, "Schema migration should add readme summaries.");
assert.match(keywordMigration, /unnest\(s\.topics\)/, "Keyword search should match topics.");
assert.match(parser, /vnd\.github\.star\+json/, "Parser should request starred_at via star+json.");
assert.match(enrichStar, /fetchGithubReadme/, "Star enrichment should fetch README.");
assert.match(describeBatchRoute, /enrichStarsByIds/, "Describe-batch route should enrich stars.");
assert.match(starsPage, /\/api\/stars\/describe-batch/, "Stars page should call describe-batch API.");
assert.match(searchLib, /readme_summary_zh/, "Direct star search should include readme summaries.");

console.log("phase1 enrichment contract passed");
