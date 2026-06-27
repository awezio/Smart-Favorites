import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const harness = read("lib", "agent", "harness.ts");
const starsPipeline = read("lib", "agent", "pipelines", "stars-search.ts");
const kbWriteback = read("lib", "agent", "kb-writeback.ts");
const agentPrompt = read("lib", "agent", "prompts", "agent-system.ts");
const webSearch = read("lib", "search", "web-search.ts");
const chatRoute = read("app", "api", "chat", "route.ts");
const toolsRegistry = read("lib", "tools", "registry.ts");
const routing = read("lib", "chat", "routing.ts");

assert.match(harness, /runStarsSearchPipeline/, "Harness should orchestrate stars search pipeline.");
assert.match(harness, /writebackStarFromReadme/, "Harness should schedule KB writeback.");
assert.match(harness, /\bafter\s*\(/, "Harness should use after() for async KB writeback.");
assert.match(harness, /AGENT_SYSTEM_PROMPT/, "Harness should use agent system prompt.");

assert.match(starsPipeline, /searchStars/, "Stars pipeline should run multi-strategy star search.");
assert.match(starsPipeline, /filterAllStarsByQuery/, "Stars pipeline should broad-filter all stars when weak.");
assert.match(starsPipeline, /deepReadTopStars/, "Stars pipeline should deep-read top READMEs.");
assert.match(starsPipeline, /webSearch/, "Stars pipeline should trigger web fallback.");

assert.match(kbWriteback, /readme_summary/, "KB writeback should update readme summaries.");
assert.match(kbWriteback, /generateEmbedding/, "KB writeback should refresh embeddings.");

assert.match(agentPrompt, /verified|suggested|inferred/, "Agent prompt should define evidence tiers.");
assert.match(agentPrompt, /网络推荐|Web suggestions/, "Agent prompt should label web suggestions separately.");

assert.match(webSearch, /TAVILY_API_KEY/, "Web search should support Tavily.");
assert.match(webSearch, /BRAVE_SEARCH_API_KEY/, "Web search should support Brave.");
assert.match(webSearch, /SERPAPI_API_KEY/, "Web search should support SerpAPI.");

assert.match(chatRoute, /mode === "agent"/, "Chat route should accept agent mode.");
assert.match(chatRoute, /agentChat/, "Chat route should call agent harness.");

assert.match(toolsRegistry, /search_stars/, "Tools registry should expose search_stars.");
assert.match(toolsRegistry, /fetch_readme/, "Tools registry should expose fetch_readme.");
assert.match(toolsRegistry, /web_search/, "Tools registry should expose web_search.");

assert.match(routing, /agentMode\?:/, "Routing metadata should include agentMode.");

console.log("phase2 agent harness contract passed");
