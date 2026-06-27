import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...parts) => readFileSync(join(repoRoot, ...parts), "utf8");

const chatPage = read("app", "dashboard", "chat", "page.tsx");
const sourcesPanel = read("components", "chat", "sources-panel.tsx");
const titleGenerator = read("lib", "chat", "title-generator.ts");
const sessionSources = read("lib", "chat", "session-sources.ts");
const generateTitleRoute = read(
  "app",
  "api",
  "chat",
  "sessions",
  "[id]",
  "generate-title",
  "route.ts"
);
const sourcesRoute = read("app", "api", "chat", "sessions", "[id]", "sources", "route.ts");
const exportRoute = read(
  "app",
  "api",
  "chat",
  "sessions",
  "[id]",
  "sources",
  "export",
  "route.ts"
);
const searchFile = read("lib", "rag", "search.ts");
const settingsRoute = read("app", "api", "settings", "route.ts");
const settingsPage = read("app", "dashboard", "settings", "page.tsx");
const markdownRenderer = read("components", "markdown-renderer.tsx");

const migrations = readdirSync(join(repoRoot, "supabase", "migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(repoRoot, "supabase", "migrations", file), "utf8"))
  .join("\n");

assert.match(migrations, /title_status/i, "Migrations should add chat session title status.");
assert.match(migrations, /auto_title_enabled/i, "Migrations should add auto title settings.");
assert.match(
  migrations,
  /Users can view own chat sessions/i,
  "Migrations should harden chat_sessions RLS."
);

assert.match(titleGenerator, /generateSessionTitle/, "Title generator should expose generateSessionTitle.");
assert.match(titleGenerator, /generateSessionTitleWithSource/, "Title generator should expose source-aware title generation.");
assert.match(titleGenerator, /maybeGenerateSessionTitleOnServer/, "Title generator should support server-side session title updates.");
assert.match(generateTitleRoute, /generateSessionTitleWithSource/, "Generate-title API should call source-aware title generator.");
assert.match(generateTitleRoute, /shouldRegenerateSessionTitle/, "Generate-title API should allow fallback title retries.");
assert.match(generateTitleRoute, /title_source/, "Generate-title API should persist title source metadata.");
assert.match(generateTitleRoute, /normalizeSessionMessages/, "Generate-title API should normalize stored messages.");
assert.match(sessionSources, /aggregateSessionSources/, "Session sources helper should aggregate citations.");
assert.match(sourcesRoute, /aggregateSessionSources/, "Sources API should aggregate session sources.");
assert.match(exportRoute, /exportSourcesAsMarkdown/, "Export API should support markdown export.");
assert.match(migrations, /chat_session_sources/i, "Migrations should add chat_session_sources table.");
assert.match(migrations, /rag_rerank_enabled/i, "Migrations should add rag rerank setting.");
assert.match(searchFile, /rerankSearchResults/, "Search should optionally rerank with Cohere.");
assert.match(read("lib", "rag", "rag-engine.ts"), /ragChatStream/, "RAG engine should support streaming.");
assert.match(read("app", "api", "chat", "route.ts"), /text\/event-stream/, "Chat API should support SSE streaming.");
assert.match(read("app", "api", "chat", "route.ts"), /maybeGenerateSessionTitleOnServer/, "Chat API should generate session titles server-side.");
assert.match(read("app", "dashboard", "layout.tsx"), /readDashboardNavCollapsed/, "Dashboard layout should persist nav collapse state.");
assert.match(chatPage, /ResizablePanelGroup/, "Chat page should use resizable panels on large screens.");
assert.match(chatPage, /CHAT_PANELS_AUTO_SAVE_ID/, "Chat page should persist panel sizes.");
assert.match(chatPage, /titleGenerating/, "Chat page should show a generating title state.");
assert.match(chatPage, /@container\/composer/, "Composer should use container queries for responsive controls.");
assert.match(read("lib", "admin", "chat-quality-metrics.ts"), /loadChatQualityMetrics/, "Admin should load chat quality metrics.");

assert.match(chatPage, /SourcesPanel/, "Chat page should render a dedicated sources panel.");
assert.match(chatPage, /generate-title/, "Chat page should trigger async session title generation.");
assert.match(chatPage, /maybeGenerateSessionTitle/, "Chat page should include title generation helper.");
assert.match(
  chatPage,
  /locale:\s*language/,
  "Chat page should pass locale when generating session titles."
);
assert.match(sourcesPanel, /exportMd/, "Sources panel should expose markdown export.");
assert.match(read("lib", "ai", "chat-stream-shared.ts"), /supportsProviderStreaming/, "Streaming capability check should be client-safe.");
assert.doesNotMatch(chatPage, /chat-stream-shared/, "Chat page should not import server-only provider stream module.");

assert.match(settingsRoute, /autoTitleEnabled/, "Settings GET should return auto title preference.");
assert.match(settingsRoute, /auto_title_enabled/, "Settings PUT should persist auto title preference.");

assert.match(
  chatPage,
  /<details[\s\S]*\{t\.sources\}\s*-\s*\{sources\.length\}/,
  "Chat citations should keep expandable message-level evidence as fallback."
);

console.log("chat-enhancements-contract.test.mjs passed");
