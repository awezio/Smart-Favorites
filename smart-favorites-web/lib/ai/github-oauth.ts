import "server-only";

import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export function requiresGitHubOAuth(provider: string) {
  return false;
}

export function normalizeGitHubOAuthToken(value: unknown) {
  if (typeof value !== "string") return "";
  const token = value.trim().replace(/^Bearer\s+/i, "");
  return isUsableGitHubOAuthToken(token) ? token : "";
}

export function isUsableGitHubOAuthToken(token: string) {
  if (!token) return false;
  const lowered = token.toLowerCase();
  if (lowered === "undefined" || lowered === "null") return false;

  return /^(gho_|ghu_|github_pat_)[A-Za-z0-9_]+$/.test(token);
}

export async function getGitHubOAuthTokenFromSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return normalizeGitHubOAuthToken(session?.provider_token);
}

export async function requireGitHubOAuthTokenFromSession(provider: string) {
  if (!requiresGitHubOAuth(provider)) return "";

  const token = await getGitHubOAuthTokenFromSession();
  if (!token) {
    throw new Error("This provider no longer supports GitHub OAuth token authentication.");
  }

  return token;
}
