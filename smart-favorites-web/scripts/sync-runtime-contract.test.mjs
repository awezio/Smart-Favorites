import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const bookmarksSyncRoute = read("app", "api", "bookmarks", "sync", "route.ts");
const starsSyncRoute = read("app", "api", "stars", "sync", "route.ts");
const starsPage = read("app", "dashboard", "stars", "page.tsx");

for (const [name, source] of [
  ["bookmark sync", bookmarksSyncRoute],
  ["GitHub Stars sync", starsSyncRoute],
]) {
  assert.doesNotMatch(
    source,
    /@\/lib\/rag\/embedding|generateEmbedding/,
    `${name} must not generate embeddings inline during user-triggered sync.`
  );
  assert.doesNotMatch(
    source,
    /\bembedding\s*:/,
    `${name} should leave embedding backfill out of the sync response path.`
  );
}

assert.match(
  starsPage,
  /async function readApiError/,
  "GitHub Stars page should safely read JSON or plain-text API errors."
);
assert.doesNotMatch(
  starsPage,
  /const err = await response\.json\(\)/,
  "GitHub Stars page must not assume every failed sync response is JSON."
);

console.log("sync runtime contract passed");
