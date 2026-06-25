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
const bookmarkDescriptionPrompt = read("lib", "ai", "prompts", "bookmark-description.skill.ts");
const bookmarksDb = read("lib", "db", "bookmarks.ts");
const describeRoute = read("app", "api", "ai", "describe", "route.ts");
const bookmarksRoute = read("app", "api", "bookmarks", "route.ts");
const bookmarksPage = read("app", "dashboard", "bookmarks", "page.tsx");
const starsPage = read("app", "dashboard", "stars", "page.tsx");
const okfExporter = read("lib", "knowledge-format", "export.ts");
const ragEngine = read("lib", "rag", "rag-engine.ts");
const snapshotRoutePath = join(repoRoot, "app", "api", "bookmarks", "snapshot-page", "route.ts");
const snapshotServicePath = join(repoRoot, "lib", "snapshots", "bookmark-snapshot.ts");
const snapshotRedactionPath = join(repoRoot, "lib", "snapshots", "redaction.ts");

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

assert.match(
  migrations,
  /alter table public\.bookmarks[\s\S]*\btags\b[\s\S]*text\[\]/i,
  "Bookmarks migration should add editable tags as a text array."
);
assert.match(
  migrations,
  /alter table public\.bookmarks[\s\S]*snapshot_url[\s\S]*snapshot_storage_path[\s\S]*snapshot_taken_at[\s\S]*snapshot_status[\s\S]*snapshot_error[\s\S]*snapshot_metadata/i,
  "Bookmarks migration should add website snapshot fields."
);

for (const source of [types, supabaseTypes]) {
  assert.match(source, /description_zh/, "Types should expose Chinese AI descriptions.");
  assert.match(source, /description_en/, "Types should expose English AI descriptions.");
  assert.match(source, /description_metadata/, "Types should expose AI description metadata.");
  assert.match(source, /tags/, "Types should expose editable bookmark tags.");
  assert.match(source, /snapshot_url/, "Types should expose bookmark snapshot URLs.");
  assert.match(source, /snapshot_status/, "Types should expose bookmark snapshot status.");
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
  bookmarkDescriptionPrompt,
  /你是一位信息架构师/,
  "Bookmark prompt should be kept in a skill-like injection template."
);
assert.match(
  bookmarkDescriptionPrompt,
  /purpose[\s\S]*content[\s\S]*audience/,
  "Prompt template should require the structured purpose/content/audience JSON shape."
);
assert.match(
  generator,
  /BOOKMARK_DESCRIPTION_SYSTEM_PROMPT[\s\S]*role:\s*"system"/,
  "Bookmark description generation should inject the skill-like template as the system prompt."
);
assert.match(
  generator,
  /ai_description_prompt/,
  "Bookmark description generation should load the user's custom prompt from settings."
);
assert.match(
  generator,
  /descriptionPrompt[\s\S]*content:\s*selection\.descriptionPrompt \|\| BOOKMARK_DESCRIPTION_SYSTEM_PROMPT/,
  "Bookmark description generation should prefer the user's custom system prompt when configured."
);
assert.match(
  generator,
  /prompt_template:\s*selection\.descriptionPrompt[\s\S]*user_settings\.ai_description_prompt/,
  "Bookmark description metadata should record when a user settings prompt was used."
);
assert.match(
  generator,
  /structured_description[\s\S]*purpose[\s\S]*content[\s\S]*audience/,
  "Generator should normalize model output into the requested structured website description."
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
  /structuredDescriptionToRagText[\s\S]*generateEmbedding/,
  "AI describe API should embed structured website description JSON for RAG."
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
  describeRoute,
  /captureBookmarkSnapshot/,
  "AI describe API should capture and persist a website snapshot for bookmarks."
);
assert.match(
  describeRoute,
  /snapshot_url[\s\S]*snapshot_status/,
  "AI describe API should return snapshot metadata to the UI."
);

assert.match(
  bookmarksRoute,
  /description_zh[\s\S]*description_en[\s\S]*tags/,
  "Bookmarks API should accept bilingual descriptions and editable tags."
);
assert.match(
  bookmarksRoute,
  /description_zh[\s\S]*description_en[\s\S]*generateEmbedding/,
  "Manual bookmark edits should update embeddings from bilingual descriptions."
);
assert.match(
  bookmarksDb,
  /SYNC_BOOKMARK_COLUMNS[\s\S]*tags[\s\S]*snapshot_url[\s\S]*snapshot_status/,
  "Bookmark sync/select helpers should keep tags and snapshot fields."
);

assert.ok(existsSync(snapshotRoutePath), "Snapshot API route should exist.");
assert.ok(existsSync(snapshotServicePath), "Bookmark snapshot capture service should exist.");
assert.ok(existsSync(snapshotRedactionPath), "Snapshot redaction helper should exist.");

const snapshotRoute = read("app", "api", "bookmarks", "snapshot-page", "route.ts");
const snapshotService = read("lib", "snapshots", "bookmark-snapshot.ts");
const snapshotRedaction = read("lib", "snapshots", "redaction.ts");

assert.match(
  snapshotRoute,
  /captureBookmarkSnapshot[\s\S]*updateBookmark/,
  "Snapshot API should capture a page snapshot and persist it on the bookmark."
);
assert.match(
  snapshotService,
  /maskSensitiveSnapshotText[\s\S]*storage[\s\S]*upload/,
  "Snapshot capture should redact likely sensitive content before uploading."
);
assert.match(
  snapshotService,
  /import\("playwright-core"\)/,
  "Snapshot runtime should dynamically import playwright-core."
);
assert.match(
  snapshotService,
  /import\("@sparticuz\/chromium"\)/,
  "Snapshot runtime should dynamically import serverless Chromium for Vercel."
);
assert.match(
  snapshotService,
  /isServerlessSnapshotEnvironment|VERCEL|PLAYWRIGHT_CHROMIUM_CHANNEL/,
  "Snapshot runtime should branch between local Chrome/Edge and serverless Chromium."
);
assert.doesNotMatch(
  snapshotService,
  /import\("playwright"\)|dynamicImport\("playwright"\)/,
  "Snapshot runtime should not import the undeclared full playwright package in production."
);
assert.match(
  snapshotRedaction,
  /password|card|credit|称号|密码|卡号|account/i,
  "Snapshot redaction should cover likely sensitive account, password, and card labels."
);
assert.match(
  snapshotRedaction,
  /\{13,19\}/,
  "Snapshot redaction should mask long payment-card-like numbers."
);

assert.match(
  bookmarksPage,
  /description_zh[\s\S]*description_en/,
  "Bookmark management should display/search bilingual AI descriptions."
);
assert.match(
  bookmarksPage,
  /tags[\s\S]*handleSaveBookmark[\s\S]*description_zh[\s\S]*description_en/,
  "Bookmark management should let users edit tags and bilingual descriptions together."
);
assert.match(
  bookmarksPage,
  /aria-label=\{language === "zh" \? "编辑描述" : "Edit description"\}[\s\S]*openBookmarkEditor\(b\)/,
  "Bookmark management should expose per-item edit controls without entering a separate bulk edit mode."
);
assert.match(
  bookmarksPage,
  /snapshot_url[\s\S]*snapshot_status[\s\S]*captureSnapshot/,
  "Bookmark management should show website snapshots and let users refresh them."
);
assert.match(
  bookmarksPage,
  /existingDescriptionCount[\s\S]*confirm\(t\.confirmOverwriteDescriptions\(existingDescriptionCount\)\)/,
  "Batch AI description generation should ask before overwriting selected bookmarks that already have descriptions."
);
assert.match(
  bookmarksPage,
  /const targets = selected;/,
  "Batch AI description generation should include selected bookmarks after overwrite confirmation instead of silently skipping described items."
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
assert.match(
  ragEngine,
  /structuredDescriptionToRagText[\s\S]*Description details/,
  "RAG prompt should include structured website description JSON details."
);

console.log("AI description contract passed");
