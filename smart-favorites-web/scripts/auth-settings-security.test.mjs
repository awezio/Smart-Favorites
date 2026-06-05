import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), "utf8");

const checks = [
  {
    name: "login page uses server OAuth entrypoint",
    file: "app/login/page.tsx",
    assert: (content) => content.includes("/auth/sign-in/"),
  },
  {
    name: "server OAuth route redirects to provider URL",
    file: "app/auth/sign-in/[provider]/route.ts",
    assert: (content) =>
      content.includes("signInWithOAuth") &&
      content.includes("NextResponse.redirect(data.url)"),
  },
  {
    name: "auth callback validates relative redirect targets",
    file: "app/auth/callback/route.ts",
    assert: (content) =>
      content.includes("getSafeRedirect") && content.includes('value.startsWith("//")'),
  },
  {
    name: "settings API encrypts stored user provider keys",
    file: "app/api/settings/route.ts",
    assert: (content) =>
      content.includes("encryptSecret(v)") &&
      content.includes("maskSecret(v)") &&
      !content.includes("newKeys[k] = v;"),
  },
  {
    name: "settings models route resolves models server-side",
    file: "app/api/settings/models/route.ts",
    assert: (content) =>
      content.includes("fetchProviderModels") && content.includes("decryptSecret(saved)"),
  },
  {
    name: "provider config fetches provider model lists",
    file: "lib/ai/provider-config.ts",
    assert: (content) =>
      content.includes('`${config.baseURL}/models`') &&
      content.includes('`${config.baseURL}/models?key=${apiKey}`'),
  },
  {
    name: "deployment docs require a stable encryption secret",
    file: ".env.local.example",
    assert: (content) => content.includes("USER_API_KEY_ENCRYPTION_SECRET"),
  },
  {
    name: "deployment docs explain Supabase custom domain for OAuth",
    file: "DEPLOYMENT.md",
    assert: (content) =>
      content.includes("Supabase Custom Domain") &&
      content.includes("https://api.example.com/auth/v1/callback"),
  },
  {
    name: "login page warns when OAuth uses default Supabase cloud host",
    file: "app/login/page.tsx",
    assert: (content) =>
      content.includes("usesDefaultSupabaseCloudDomain") &&
      content.includes("NEXT_PUBLIC_SUPABASE_URL"),
  },
];

const failures = checks.filter((check) => {
  const content = read(check.file);
  return !check.assert(content);
});

if (failures.length > 0) {
  console.error("Auth/settings security regression checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure.name} (${failure.file})`);
  }
  process.exit(1);
}

console.log(`Auth/settings security checks passed (${checks.length}).`);
