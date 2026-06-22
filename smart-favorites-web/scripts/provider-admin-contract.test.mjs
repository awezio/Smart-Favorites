import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");
const exists = (...segments) => existsSync(join(repoRoot, ...segments));

const providerRegistry = read("lib", "ai", "provider-registry.ts");
const providerConfig = read("lib", "ai", "provider-config.ts");
const settingsPage = read("app", "dashboard", "settings", "page.tsx");
const dashboardLayout = read("app", "dashboard", "layout.tsx");
const landingPage = read("app", "page.tsx");
const modelsRoute = read("app", "api", "settings", "models", "route.ts");
const testRoute = read("app", "api", "settings", "test", "route.ts");
const chatRoute = read("app", "api", "chat", "route.ts");
const ragEngine = read("lib", "rag", "rag-engine.ts");
const adminAuth = read("lib", "auth", "admin.ts");
const aiAdminPage = read("app", "admin", "ai", "page.tsx");
const aiAdminProvidersRoute = read("app", "api", "admin", "ai", "providers", "route.ts");
const aiAdminMetricsRoute = read("app", "api", "admin", "ai", "metrics", "route.ts");
const accountMergeRoute = read("app", "api", "admin", "accounts", "merge", "route.ts");
const migrations = read("supabase", "migrations", "013_extension_ai_admin.sql");

const requiredProviders = [
  "openai",
  "deepseek",
  "kimi",
  "qwen",
  "claude",
  "gemini",
  "glm",
  "ollama",
  "github_models",
  "minimax",
  "nvidia",
  "siliconflow",
  "volcengine",
  "openrouter",
  "custom_openai",
  "mistral",
  "groq",
  "together",
  "fireworks",
  "perplexity",
  "xai",
  "cerebras",
  "huggingface",
  "azure_openai",
  "vertex_ai",
  "bedrock",
  "cohere",
  "baidu_qianfan",
  "tencent_hunyuan",
  "iflytek_spark",
  "stepfun",
  "vllm",
  "lm_studio",
];

for (const provider of requiredProviders) {
  assert.match(
    providerRegistry,
    new RegExp(`id:\\s*"${provider}"`),
    `Provider registry should include ${provider}.`
  );
}

for (const field of [
  "protocol",
  "baseURL",
  "defaultModel",
  "envKey",
  "authType",
  "capabilities",
  "docsUrl",
]) {
  assert.match(
    providerRegistry,
    new RegExp(`${field}:`),
    `Provider definitions should include ${field}.`
  );
}

for (const protocol of [
  "openai-compatible",
  "anthropic",
  "gemini",
  "cohere",
  "azure-openai",
  "vertex-openai",
  "bedrock-converse",
  "ollama",
]) {
  assert.match(
    providerRegistry,
    new RegExp(`"${protocol}"`),
    `Provider registry should support the ${protocol} protocol.`
  );
}

assert.match(
  providerRegistry,
  /id:\s*"github_models"[\s\S]*?baseURL:\s*"https:\/\/models\.github\.ai"[\s\S]*?modelsEndpoint:\s*"\/catalog\/models"[\s\S]*?chatEndpoint:\s*"\/inference\/chat\/completions"[\s\S]*?authType:\s*"bearer"/,
  "GitHub Models should use the official REST catalog and inference endpoints with a bearer token."
);
assert.match(
  providerRegistry,
  /models:read/,
  "GitHub Models settings should tell users to use a GitHub token with models:read."
);
assert.doesNotMatch(providerRegistry, /id:\s*"github_copilot"/, "GitHub Copilot should not be exposed as a broken OAuth-backed chat provider.");
assert.match(providerRegistry, /docs\.github\.com\/en\/rest\/models/, "GitHub Models should link to the official REST API docs.");
assert.match(providerConfig, /X-GitHub-Api-Version/, "GitHub Models requests should include GitHub's REST API version header.");
assert.match(providerConfig, /item\.name/, "GitHub catalog model names should be used as display labels.");
assert.match(
  settingsPage,
  /DEFAULT_OLLAMA_BASE_URL[\s\S]*http:\/\/localhost:11434/,
  "Settings page should expose the default local Ollama endpoint."
);
assert.match(
  settingsPage,
  /testLocalOllama[\s\S]*\/api\/tags/,
  "Settings page should test local Ollama from the browser against /api/tags."
);

assert.match(
  modelsRoute,
  /getProviderDefinition/,
  "Models API should resolve providers from the registry."
);
assert.match(
  modelsRoute,
  /provider_models[\s\S]*upsert/,
  "Models API should save the latest fetched provider model list to backend settings."
);
assert.match(
  testRoute,
  /testProviderConnection/,
  "Provider test API should use the registry test strategy."
);
assert.match(
  chatRoute,
  /isSupportedProvider/,
  "Chat API should validate providers through the registry."
);
assert.match(
  ragEngine,
  /callProviderChat/,
  "RAG chat should call the selected provider instead of only returning fallback text."
);

assert.match(
  settingsPage,
  /SelectTrigger|providerSelector|selectedProvider/,
  "Settings page should collapse provider configuration behind a provider selector."
);
assert.doesNotMatch(
  settingsPage,
  /PROVIDERS\.map\(\(p\) =>\s*\(/,
  "Settings page should not render every provider as an expanded list."
);

assert.ok(exists("app", "admin", "ai", "page.tsx"), "Hidden admin AI page should exist.");
assert.match(adminAuth, /app_metadata/, "Admin auth should use trusted app_metadata.");
assert.match(adminAuth, /ADMIN_EMAILS/, "Admin auth should support ADMIN_EMAILS bootstrap.");
assert.doesNotMatch(adminAuth, /user_metadata/, "Admin auth must not trust user_metadata.");
assert.match(aiAdminPage, /requireAdminUser/, "Admin AI page should require admin access.");
assert.match(aiAdminProvidersRoute, /requireAdminUser/, "Admin provider API should require admin access.");
assert.match(aiAdminMetricsRoute, /requireAdminUser/, "Admin metrics API should require admin access.");
assert.match(accountMergeRoute, /requireAdminUser/, "Account merge API should require admin access.");
assert.match(accountMergeRoute, /bookmarks|github_stars|chat_sessions|documents|document_chunks|user_settings|profiles/, "Account merge should cover user-owned data tables.");
assert.doesNotMatch(
  `${dashboardLayout}\n${landingPage}\n${settingsPage}`,
  /\/admin\/ai/,
  "The hidden admin page should not be linked from user-facing navigation."
);

assert.match(migrations, /create table if not exists public\.extension_sessions/i, "Migration should create extension sessions.");
assert.match(migrations, /create table if not exists public\.ai_call_logs/i, "Migration should create AI call logs.");
assert.match(migrations, /unique\s*\(user_id,\s*url\)/i, "Migration should make stars unique per user and URL.");

console.log("provider/admin contract passed");
