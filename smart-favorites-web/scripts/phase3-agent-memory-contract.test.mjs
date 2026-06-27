import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const memoryMigration = read("supabase", "migrations", "20260627200000_user_agent_memory.sql");
const ftsMigration = read("supabase", "migrations", "20260627210000_chat_session_fts.sql");
const memoryStore = read("lib", "agent", "memory", "memory-store.ts");
const memoryTool = read("lib", "agent", "memory", "memory-tool.ts");
const memoryIntent = read("lib", "agent", "memory", "memory-intent.ts");
const sessionSearch = read("lib", "agent", "memory", "session-search.ts");
const harness = read("lib", "agent", "harness.ts");
const agentPrompt = read("lib", "agent", "prompts", "agent-system.ts");
const memoryRoute = read("app", "api", "agent", "memory", "route.ts");
const settingsPage = read("app", "dashboard", "settings", "page.tsx");
const toolsRegistry = read("lib", "tools", "registry.ts");

assert.match(memoryMigration, /user_agent_memory/, "Migration should create user_agent_memory.");
assert.match(memoryMigration, /memory_entries TEXT\[\]/, "Migration should include memory_entries.");
assert.match(memoryMigration, /user_profile_entries TEXT\[\]/, "Migration should include user_profile_entries.");
assert.match(memoryMigration, /write_approval_required/, "Migration should include write approval flag.");

assert.match(ftsMigration, /messages_fts/, "FTS migration should add messages_fts.");
assert.match(ftsMigration, /session_search/, "FTS migration should define session_search RPC.");
assert.match(ftsMigration, /chat_session_messages_to_text/, "FTS migration should flatten chat messages.");

assert.match(memoryStore, /getMemorySnapshot/, "Memory store should expose frozen snapshot.");
assert.match(memoryStore, /memory_char_limit/, "Memory store should track char limits.");

assert.match(memoryTool, /addMemoryEntry/, "Memory tool should support add.");
assert.match(memoryTool, /replaceMemoryEntry/, "Memory tool should support replace.");
assert.match(memoryTool, /removeMemoryEntry/, "Memory tool should support remove.");
assert.match(memoryTool, /approvePendingEntries/, "Memory tool should support pending approval.");

assert.match(memoryIntent, /detectMemoryIntent/, "Memory intent should detect remember commands.");
assert.match(memoryIntent, /processMemoryIntent/, "Memory intent should apply memory writes.");
assert.match(memoryIntent, /updateStar/, "Memory intent should update preferred star tags.");

assert.match(sessionSearch, /searchUserSessions/, "Session search should query session_search RPC.");
assert.match(sessionSearch, /shouldSearchSessions/, "Session search should gate on-demand lookup.");

assert.match(harness, /getMemorySnapshot/, "Harness should inject memory snapshot.");
assert.match(harness, /processMemoryIntent/, "Harness should process memory intents.");
assert.match(harness, /searchUserSessions/, "Harness should support session search.");

assert.match(agentPrompt, /buildAgentSystemPrompt/, "Agent prompt should build memory-aware system prompt.");
assert.match(agentPrompt, /user_profile/, "Agent prompt should include user profile block.");
assert.match(agentPrompt, /agent_memory/, "Agent prompt should include agent memory block.");

assert.match(memoryRoute, /approve_pending/, "Memory API should approve pending entries.");
assert.match(memoryRoute, /write_approval_required/, "Memory API should manage write approval.");

assert.match(settingsPage, /\/api\/agent\/memory/, "Settings page should manage agent memory.");
assert.match(settingsPage, /pendingEntries/, "Settings page should show pending memory approvals.");

assert.match(toolsRegistry, /session_search/, "Tools registry should expose session_search.");
assert.match(toolsRegistry, /update_agent_memory/, "Tools registry should expose update_agent_memory.");

console.log("phase3 agent memory contract passed");
