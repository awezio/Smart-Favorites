import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...parts) => readFileSync(join(repoRoot, ...parts), "utf8");

const routingPath = join(repoRoot, "lib", "chat", "routing.ts");
assert.ok(
  existsSync(routingPath),
  "Chat should have a shared routing classifier so ordinary greetings do not search the knowledge base."
);

const routing = read("lib", "chat", "routing.ts");
const ragEngine = read("lib", "rag", "rag-engine.ts");
const chatRoute = read("app", "api", "chat", "route.ts");
const chatPage = read("app", "dashboard", "chat", "page.tsx");
const providerConfig = read("lib", "ai", "provider-config.ts");
const types = read("types", "index.ts");

assert.match(
  routing,
  /export function classifyChatRoute/,
  "Routing classifier should expose classifyChatRoute."
);
assert.match(
  routing,
  /普通聊天|ordinary chat|direct chat/i,
  "Routing classifier should explicitly support ordinary direct chat."
);
assert.match(
  routing,
  /寻找|搜索|查找|知识库|书签|收藏|GitHub Stars/,
  "Routing classifier should include Chinese knowledge-search triggers."
);
assert.match(
  routing,
  /query\.trim\(\)\.length <= 12[\s\S]*chat/,
  "Short greetings should default to direct chat instead of knowledge search."
);

assert.match(
  ragEngine,
  /classifyChatRoute\(query/,
  "RAG engine should classify each query before searching."
);
assert.match(
  ragEngine,
  /if\s*\(route\.useKnowledge\)[\s\S]*searchAll/,
  "RAG engine should only call searchAll when the route requires knowledge search."
);
assert.match(
  ragEngine,
  /classifyProviderError/,
  "RAG engine should classify provider failures before returning an answer."
);
assert.doesNotMatch(
  ragEngine,
  /Model call failed:/,
  "Provider errors should not be appended verbatim to user-facing answers."
);
assert.match(
  providerConfig,
  /ProviderApiError/,
  "Provider chat calls should throw structured provider API errors with status/body metadata."
);

assert.match(
  chatRoute,
  /routing:\s*result\.routing/,
  "Chat API should return routing metadata so the UI can explain whether it searched knowledge."
);
assert.match(
  chatPage,
  /routing:\s*normalizeChatRouting\(data\.routing\)/,
  "Chat page should persist normalized routing metadata on assistant messages."
);
assert.match(
  chatPage,
  /未搜索知识库|已搜索知识库/,
  "Chat UI should show whether a response used the personal knowledge base."
);
assert.match(
  types,
  /routing\?:\s*ChatRoutingMetadata/,
  "ChatMessage should carry optional routing metadata."
);

console.log("chat routing contract passed");
