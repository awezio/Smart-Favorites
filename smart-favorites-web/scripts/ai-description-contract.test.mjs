import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...parts) => readFileSync(join(repoRoot, ...parts), "utf8");

const migrationsDir = join(repoRoot, "supabase", "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n");
const types = read("types", "index.ts");
const supabaseTypes = read("types", "supabase.ts");
const generator = read("lib", "ai", "description-generator.ts");
const describeRoute = read("app", "api", "ai", "describe", "route.ts");
const bookmarksPage = read("app", "dashboard", "bookmarks", "page.tsx");
const starsPage = read("app", "dashboard", "stars", "page.tsx");
const okfExporter = read("lib", "knowledge-format", "export.ts");

for (const table of ["bookmarks", "github_stars"]) {
  assert.match(
    migrations,
    new RegExp(`alter table public\\.${table}[\\s\\S]*description_zh`, "i"),
    `${table} migration should add description_zh.`
  );
  assert.match(
    migrations,
    new RegExp(`alter table public\\.${table}[\\s\\S]*description_en`, "i"),
    `${table} migration should add description_en.`
  );
  assert.match(
    migrations,
    new RegExp(`alter table public\\.${table}[\\s\\S]*description_metadata`, "i"),
    `${table} migration should add description_metadata for reachability and generation metadata.`
  );
}

for (const source of [types, supabaseTypes]) {
  assert.match(source, /description_zh/, "Types should expose Chinese AI descriptions.");
  assert.match(source, /description_en/, "Types should expose English AI descriptions.");
  assert.match(source, /description_metadata/, "Types should expose AI description metadata.");
}

assert.match(
  generator,
  /export type GeneratedDescription/,
  "Description generator should return a structured bilingual result."
);
assert.match(
  generator,
  /fetchPageContext[\s\S]*fetch\(/,
  "Bookmark description generation should fetch reachable webpages before summarizing."
);
assert.match(
  generator,
  /callProviderChat/,
  "Description generation should use the configured AI provider instead of a string template."
);
assert.match(
  generator,
  /用途[\s\S]*内容[\s\S]*服务人群/,
  "Prompt should require purpose, content, and audience coverage."
);
assert.match(
  generator,
  /description_zh[\s\S]*description_en/,
  "Generator should normalize model output into Chinese and English descriptions."
);

assert.match(
  describeRoute,
  /description_zh[\s\S]*description_en[\s\S]*description_metadata/,
  "AI describe API should persist both languages and metadata."
);
assert.match(
  describeRoute,
  /description:\s*generated\.description_zh/,
  "Legacy description should keep the Chinese version for existing UI/search compatibility."
);
assert.match(
  describeRoute,
  /generated\.description_zh[\s\S]*generated\.description_en[\s\S]*embedding/,
  "Embeddings should include both bilingual descriptions."
);

assert.match(
  bookmarksPage,
  /description_zh[\s\S]*description_en/,
  "Bookmark management should display/search bilingual AI descriptions."
);
assert.match(
  starsPage,
  /description_zh[\s\S]*description_en/,
  "Stars view should understand bilingual descriptions too."
);
assert.match(
  okfExporter,
  /description_zh[\s\S]*description_en[\s\S]*bilingualDescriptionMarkdown/,
  "OKF export should include bilingual AI descriptions in frontmatter and markdown body."
);

console.log("AI description contract passed");
