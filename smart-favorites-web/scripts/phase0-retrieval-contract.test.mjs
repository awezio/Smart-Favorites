import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const routing = read("lib", "chat", "routing.ts");
const ragEngine = read("lib", "rag", "rag-engine.ts");
const searchLib = read("lib", "rag", "search.ts");
const rerank = read("lib", "rag", "rerank.ts");
const chatRag = read("lib", "prompts", "chat-rag.ts");
const migration = read(
  "supabase",
  "migrations",
  "20260627150000_keyword_search_tokenized.sql"
);
const backfillJob = read("lib", "jobs", "backfill-star-embeddings.ts");

assert.match(migration, /tokenize_search_query/, "Keyword migration should tokenize queries.");
assert.match(migration, /description_zh/, "Tokenized star keyword search should match bilingual descriptions.");

assert.match(backfillJob, /buildStarEmbeddingText/, "Star backfill job should build embedding text.");
assert.match(backfillJob, /generateEmbeddings/, "Star backfill job should batch-generate embeddings.");

assert.match(routing, /scope:\s*ChatSearchScope/, "Routing metadata should include search scope.");
assert.match(routing, /stars里|stars 里/, "Routing should detect stars-only Chinese scope triggers.");

assert.match(searchLib, /DOMAIN_SYNONYMS/, "Search should expand domain synonyms for Chinese technical queries.");
assert.match(searchLib, /爬虫/, "Search synonym map should include crawler-related Chinese terms.");

assert.match(rerank, /description_zh/, "Rerank should include Chinese star descriptions.");

assert.match(ragEngine, /getStarIndexCoverage/, "RAG engine should compute star index coverage.");
assert.match(ragEngine, /Indexed coverage/, "RAG prompt should expose index coverage to the model.");

assert.match(chatRag, /indexCoverage/, "RAG answer instructions should mention index coverage when relevant.");

console.log("phase0 retrieval contract passed");
