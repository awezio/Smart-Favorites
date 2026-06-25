import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...parts) => readFileSync(join(repoRoot, ...parts), "utf8");

const settingsPage = read("app", "dashboard", "settings", "page.tsx");
const chatPage = read("app", "dashboard", "chat", "page.tsx");
const markdownRenderer = read("components", "markdown-renderer.tsx");
const settingsRoute = read("app", "api", "settings", "route.ts");
const providerRegistry = read("lib", "ai", "provider-registry.ts");
const embedding = read("lib", "rag", "embedding.ts");
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
  migrations,
  /provider_models/i,
  "Database migrations should persist the latest fetched provider model lists."
);
assert.match(
  migrations,
  /ai_description_prompt/i,
  "Database migrations should persist the user's custom AI description prompt."
);
assert.match(
  migrations,
  /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+TABLE\s+public\.user_settings\s+TO\s+authenticated/i,
  "Database migrations should grant authenticated users Data API access to user_settings while RLS enforces row ownership."
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
  settingsRoute,
  /providerModels[\s\S]*provider_models/,
  "Settings GET should return cached provider model lists from user_settings."
);
assert.match(
  settingsRoute,
  /aiDescriptionPrompt[\s\S]*ai_description_prompt/,
  "Settings GET should return the user's custom AI description prompt."
);
assert.match(
  settingsRoute,
  /body\.ai_description_prompt[\s\S]*updateData\.ai_description_prompt/,
  "Settings PUT should persist the user's custom AI description prompt."
);
assert.match(
  settingsRoute,
  /normalizeDefaultProvider/,
  "Settings API should normalize stale saved default providers before returning them to the UI."
);
assert.doesNotMatch(
  providerRegistry,
  /id:\s*"github_copilot"/,
  "Settings provider list should not expose the removed GitHub Copilot OAuth provider."
);
assert.match(
  settingsPage,
  /setProviderModels\(data\.providerModels \|\| \{\}\)/,
  "Settings page should hydrate fetched provider models from saved backend state."
);
assert.match(
  chatPage,
  /setProviderModels\(data\.providerModels \|\| \{\}\)/,
  "Chat page should show saved provider model lists without requiring a fresh provider API call."
);
assert.match(
  chatPage,
  /normalizeAssistantAnswer\(data\.answer,\s*sources(?:,\s*language)?\)/,
  "Chat page should normalize assistant answers before saving messages so an empty model response cannot render as sources only."
);
assert.match(
  chatPage,
  /normalizeAssistantAnswer\(message\.content,\s*sources(?:,\s*language)?\)/,
  "Chat message rendering should keep a visible assistant answer even when a saved session has blank content with sources."
);
assert.match(
  chatPage,
  /<MarkdownRenderer[\s\S]*content=\{normalizeAssistantAnswer\(message\.content,\s*sources(?:,\s*language)?\)\}[\s\S]*\/>/,
  "Assistant messages should render the answer body before citations."
);
assert.match(
  markdownRenderer,
  /<ReactMarkdown[\s\S]*>\s*\{preparedContent\}\s*<\/ReactMarkdown>/,
  "MarkdownRenderer should pass prepared content into ReactMarkdown so assistant answer text is visible."
);
assert.match(
  chatPage,
  /<details[\s\S]*\{t\.sources\}\s*-\s*\{sources\.length\}/,
  "Chat citations should be a secondary expandable evidence block, not the only visible assistant content."
);
assert.match(
  settingsPage,
  /default_llm_provider:\s*selectedProvider/,
  "Saving AI provider settings should persist the provider currently being configured, not a stale previous default."
);
assert.doesNotMatch(
  settingsRoute,
  /settings:\s*data/,
  "Settings PUT responses should not return raw stored settings because api_keys contains encrypted secret material."
);
assert.match(
  settingsPage,
  /embeddingPreference/,
  "Settings page should expose the persisted embedding preference instead of only reporting it from the API."
);
assert.match(
  settingsPage,
  /aiDescriptionPrompt[\s\S]*setAiDescriptionPrompt[\s\S]*ai_description_prompt:\s*aiDescriptionPrompt/,
  "Settings page should let users edit and save a custom AI description prompt."
);
assert.match(
  settingsPage,
  /<textarea[\s\S]*ai-description-prompt[\s\S]*value=\{aiDescriptionPrompt\}/,
  "Settings page should expose the custom AI description prompt in a compact text area."
);
assert.match(
  embedding,
  /OPENAI_EMBEDDING_MODEL[\s\S]*dimensions/,
  "Embedding generation should support a configurable OpenAI embedding model while preserving the 384-dimensional vector schema."
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
