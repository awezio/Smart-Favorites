import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");
const exists = (...segments) => existsSync(join(repoRoot, ...segments));

const providerRegistry = read("lib", "ai", "provider-registry.ts");
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
  modelsRoute,
  /getProviderDefinition/,
  "Models API should resolve providers from the registry."
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
