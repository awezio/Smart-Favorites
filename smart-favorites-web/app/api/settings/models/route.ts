import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchProviderModels,
  getProviderDefinition,
  getEnvProviderKey,
  isSupportedProvider,
} from "@/lib/ai/provider-config";
import { getGitHubOAuthTokenFromSession, requiresGitHubOAuth } from "@/lib/ai/github-oauth";
import { MASKED_SECRET_PREFIX, decryptSecret } from "@/lib/server/secrets";

type StoredProviderModels = Record<string, { models: any[]; fetchedAt: string }>;

async function resolveProviderCredential(userId: string, provider: string, transientKey?: string) {
  if (!isSupportedProvider(provider)) {
    throw new Error("Invalid provider");
  }

  if (requiresGitHubOAuth(provider)) {
    const token = await getGitHubOAuthTokenFromSession();
    if (!token) {
      throw new Error("请先使用 GitHub 登录授权 GitHub Copilot。");
    }
    return token;
  }

  if (transientKey && !transientKey.startsWith(MASKED_SECRET_PREFIX)) {
    return transientKey;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_settings")
    .select("api_keys")
    .eq("user_id", userId)
    .maybeSingle();

  const saved = data?.api_keys?.[provider];
  if (saved) {
    return decryptSecret(saved);
  }

  return getEnvProviderKey(provider);
}

function normalizeModelsForStorage(models: any[]) {
  return models
    .filter((model) => model && typeof model.id === "string")
    .slice(0, 500)
    .map((model) => ({
      id: model.id,
      label: typeof model.label === "string" ? model.label : model.id,
      ...(model.webSearch ? { webSearch: true } : {}),
      ...(model.vision ? { vision: true } : {}),
    }));
}

async function saveProviderModels(userId: string, provider: string, models: any[], fetchedAt: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_settings")
    .select("provider_models")
    .eq("user_id", userId)
    .maybeSingle();

  const providerModels: StoredProviderModels =
    data?.provider_models && typeof data.provider_models === "object"
      ? data.provider_models
      : {};

  providerModels[provider] = {
    models: normalizeModelsForStorage(models),
    fetchedAt,
  };

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        provider_models: providerModels,
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

async function handleModels(request: NextRequest, bodyProvider?: string, bodyKey?: string) {
  const { userId } = await getAuthUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const provider = bodyProvider || request.nextUrl.searchParams.get("provider") || "";
  if (!isSupportedProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  const providerDefinition = getProviderDefinition(provider);
  if (!providerDefinition) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  try {
    const apiKey = await resolveProviderCredential(userId, provider, bodyKey);
    const models = await fetchProviderModels(provider, apiKey);
    const fetchedAt = new Date().toISOString();
    await saveProviderModels(userId, provider, models, fetchedAt);
    return NextResponse.json({
      success: true,
      provider,
      models,
      fetchedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, provider, error: error.message || "获取模型列表失败" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleModels(request);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return handleModels(request, body.provider, body.apiKey);
}
