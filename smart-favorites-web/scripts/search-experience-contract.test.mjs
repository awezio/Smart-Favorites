import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const dashboardPage = read("app", "dashboard", "page.tsx");
const searchRoute = read("app", "api", "search", "route.ts");
const chatRoute = read("app", "api", "chat", "route.ts");
const ragEngine = read("lib", "rag", "rag-engine.ts");
const searchLib = read("lib", "rag", "search.ts");

assert.match(
  searchRoute,
  /createClient as createServerSupabaseClient/,
  "Search API should create a logged-in Supabase session client."
);
assert.match(
  searchRoute,
  /searchBookmarks\(query, topK, threshold, userId, supabase\)/,
  "Bookmark search should use the logged-in Supabase session client."
);
assert.match(
  searchRoute,
  /searchStars\(query, topK, threshold, userId, supabase\)/,
  "GitHub Stars search should use the logged-in Supabase session client."
);
assert.match(
  searchRoute,
  /searchDocuments\(query, topK, threshold, userId, supabase\)/,
  "Document search should use the logged-in Supabase session client."
);
assert.match(
  searchRoute,
  /searchAll\(query, topK, threshold, userId, supabase\)/,
  "Unified search should use the logged-in Supabase session client."
);

assert.match(
  chatRoute,
  /createClient as createServerSupabaseClient/,
  "Chat API should create a logged-in Supabase session client for RAG."
);
assert.match(
  ragEngine,
  /client\?: SupabaseQueryClient/,
  "RAG search should accept an injected Supabase query client."
);

assert.match(
  searchLib,
  /type SupabaseQueryClient/,
  "Search helpers should accept an injected Supabase query client."
);
assert.match(
  searchLib,
  /keyword_search_bookmarks/,
  "Search should include keyword fallback for bookmark queries."
);
assert.match(
  searchLib,
  /keyword_search_stars/,
  "Search should include keyword fallback for GitHub Stars queries."
);
assert.match(
  searchLib,
  /match_document_chunks/,
  "Search should include semantic retrieval for document chunks."
);
assert.match(
  searchLib,
  /keyword_search_document_chunks/,
  "Search should include keyword fallback for document chunks."
);
assert.match(
  searchLib,
  /searchDocuments\(query, perTypeLimit, threshold, userId, client\)/,
  "Unified search should include document results with the expanded per-type limit."
);
assert.match(
  searchLib,
  /searchBookmarksByDirectMatch/,
  "Search should include direct bookmark field matching for short domain queries such as 3D."
);
assert.match(
  searchLib,
  /description_zh|description_en/,
  "Search should consider bilingual descriptions during direct matching."
);
assert.match(
  searchLib,
  /reciprocalRankFusion/,
  "Semantic and keyword results should be merged and deduplicated."
);
assert.match(
  ragEngine,
  /\[document\]/,
  "RAG prompt should format document evidence for the model."
);

assert.match(
  dashboardPage,
  /setError/,
  "Search page should surface API failures instead of silently showing no results."
);
assert.match(
  dashboardPage,
  /response\.ok/,
  "Search page should distinguish failed search responses from empty results."
);

console.log("search experience contract passed");
