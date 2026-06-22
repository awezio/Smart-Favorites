import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

const route = read("app/api/documents/route.ts");
assert.equal(
  countMatches(route, /export\s+async\s+function\s+GET\b/g),
  1,
  "documents route must export exactly one GET handler"
);
assert.equal(
  countMatches(route, /export\s+async\s+function\s+POST\b/g),
  1,
  "documents route must export exactly one POST handler"
);

const detailRoute = read("app/api/documents/[id]/route.ts");
assert.equal(
  countMatches(detailRoute, /export\s+async\s+function\s+GET\b/g),
  1,
  "document detail route must export exactly one GET handler"
);
assert.equal(
  countMatches(detailRoute, /export\s+async\s+function\s+DELETE\b/g),
  1,
  "document detail route must export exactly one DELETE handler"
);

const processRoute = read("app/api/documents/process/route.ts");
assert.equal(
  countMatches(processRoute, /export\s+async\s+function\s+POST\b/g),
  1,
  "document process route must expose an authenticated POST handler"
);
assert.match(
  processRoute,
  /getAuthUser[\s\S]*processDocuments/,
  "document process route must process only the authenticated user's documents"
);

const processor = read("lib/documents/processor.ts");
assert.match(
  processor,
  /parseDocument[\s\S]*generateEmbeddings[\s\S]*insertDocumentChunks/,
  "document processor must parse files, embed chunks, and insert them into the knowledge base"
);
assert.match(
  processor,
  /deleteDocumentChunks[\s\S]*insertDocumentChunks/,
  "document reprocessing must replace old chunks instead of duplicating them"
);

const cronRoute = read("app/api/cron/process-documents/route.ts");
assert.match(
  cronRoute,
  /processDocuments/,
  "cron processing should reuse the shared document processor"
);

const parserTypes = read("lib/file-parsers/types.ts");
assert.equal(
  countMatches(parserTypes, /export\s+(interface|type)\s+DocumentChunk\b/g),
  1,
  "file parser types must define DocumentChunk once"
);
assert.match(parserTypes, /\bcontent:\s*string\b/, "DocumentChunk must expose content");
assert.match(parserTypes, /\bchunk_index:\s*number\b/, "DocumentChunk must expose chunk_index");

const parserIndex = read("lib/file-parsers/index.ts");
assert.equal(
  countMatches(parserIndex, /export\s+async\s+function\s+parseDocument\b/g),
  1,
  "file parser index must export exactly one parseDocument function"
);

const dashboardLayout = read("app/dashboard/layout.tsx");
const documentsPage = read("app/dashboard/documents/page.tsx");
assert.match(
  dashboardLayout,
  /\/dashboard\/documents[\s\S]*Documents/,
  "dashboard navigation should expose document management"
);
assert.match(
  documentsPage,
  /type="file"/,
  "documents page should expose a file picker"
);
assert.match(
  documentsPage,
  /fetch\("\/api\/documents"/,
  "documents page should upload files through the documents API"
);
assert.match(
  documentsPage,
  /fetch\("\/api\/documents\/process"/,
  "documents page should trigger parsing into the knowledge base"
);
assert.match(
  documentsPage,
  /Ready for RAG/,
  "documents page should show when parsed documents are ready for RAG"
);

const documentsMigration = [
  "supabase/migrations/008_create_documents.sql",
  "supabase/migrations/011_harden_documents_rls.sql",
].map(read).join("\n");
assert.equal(
  countMatches(documentsMigration, /USING\s*\(\s*true\s*\)|WITH\s+CHECK\s*\(\s*true\s*\)/g),
  0,
  "documents migration must not use permissive RLS policies"
);
assert.match(
  documentsMigration,
  /auth\.uid\(\)\s*=\s*user_id/,
  "documents migration must enforce user-scoped RLS"
);

for (const path of [
  "lib/file-parsers/chunk-splitter.ts",
  "lib/file-parsers/pdf-parser.ts",
  "lib/file-parsers/office-parser.ts",
]) {
  const source = read(path);
  assert.equal(
    countMatches(source, /import\s+[^;]+splitIntoChunks/g),
    path.endsWith("chunk-splitter.ts") ? 0 : 1,
    `${path} must not contain duplicate splitIntoChunks imports`
  );
}
