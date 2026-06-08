import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...parts) => readFileSync(join(repoRoot, ...parts), "utf8");

const settingsPage = read("app", "dashboard", "settings", "page.tsx");
const chatPage = read("app", "dashboard", "chat", "page.tsx");
const settingsRoute = read("app", "api", "settings", "route.ts");
const ragEngine = read("lib", "rag", "rag-engine.ts");
const extensionSidepanel = read("..", "extension", "sidepanel", "sidepanel.js");
const migrationsDir = join(repoRoot, "supabase", "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n");

assert.ok(
  existsSync(join(repoRoot, "lib", "secrets", "constants.ts")),
  "Client and server should share a non-server-only masked secret constant."
);
assert.match(
  settingsPage,
  /MASKED_SECRET_PREFIX/,
  "Settings page should use the shared masked secret prefix instead of a hardcoded masked string."
);
assert.doesNotMatch(
  settingsPage,
  /startsWith\(["']鈥|startsWith\(["']••••/,
  "Settings page should not hardcode a mojibake or display-only secret mask prefix."
);

assert.match(
  migrations,
  /default_llm_model/i,
  "Database migrations should persist the user's default LLM model."
);
assert.match(
  settingsRoute,
  /defaultModel[\s\S]*default_llm_model/,
  "Settings GET should return the stored default LLM model."
);
assert.match(
  settingsRoute,
  /body\.default_llm_model[\s\S]*updateData\.default_llm_model/,
  "Settings PUT should persist the default LLM model."
);
assert.match(
  ragEngine,
  /default_llm_provider[\s\S]*default_llm_model/,
  "RAG chat should resolve the saved default provider and model together."
);

assert.match(
  chatPage,
  /fetch\(["']\/api\/settings["']\)/,
  "Chat page should load settings before rendering provider/model choices."
);
assert.match(
  chatPage,
  /configuredProviders/,
  "Chat page should keep provider choices scoped to configured providers."
);
assert.doesNotMatch(
  chatPage,
  /CHAT_PROVIDER_OPTIONS\.forEach\(\(provider\)/,
  "Chat page should not fetch or display models for every built-in provider."
);

assert.doesNotMatch(
  extensionSidepanel,
  /currentProvider\s*=\s*data\.model/,
  "Extension should not overwrite the user's selected provider from the generic /api/health model field."
);
assert.match(
  extensionSidepanel,
  /syncProviderSelectorsFromSettings/,
  "Extension should sync provider selectors from /api/settings provider status."
);

console.log("AI settings/chat contract passed");
