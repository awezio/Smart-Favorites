import { searchAll, type SupabaseQueryClient } from "@/lib/rag/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { callProviderChat, getEnvProviderKey, isSupportedProvider } from "@/lib/ai/provider-config";
import { getGitHubOAuthTokenFromSession, requiresGitHubOAuth } from "@/lib/ai/github-oauth";
import { decryptSecret } from "@/lib/server/secrets";
import type { SearchResult, LLMMessage } from "@/types";

type RagResponse = {
  answer: string;
  sources: SearchResult[];
};

export async function ragChat(
  query: string,
  chatHistory: LLMMessage[] = [],
  topK: number,
  userId: string,
  provider?: string,
  model?: string,
  client?: SupabaseQueryClient
): Promise<RagResponse> {
  const sources = await searchAll(query, topK, 0.3, userId, client);
  const fallback = buildFallbackAnswer(query, sources, chatHistory);
  const savedDefaults = await getDefaultAiSelection(userId);
  const selectedProvider = provider && isSupportedProvider(provider) ? provider : savedDefaults.provider;
  const selectedModel = model || (!provider ? savedDefaults.model : undefined);

  try {
    const apiKey = await resolveProviderKey(userId, selectedProvider);
    const prompt = buildRagPrompt(query, sources);
    const response = await callProviderChat({
      provider: selectedProvider,
      apiKey,
      model: selectedModel,
      messages: [
        {
          role: "system",
          content:
            "You are Smart Favorites, a concise personal knowledge assistant. Answer from the provided bookmarks, GitHub stars, and documents. If evidence is thin, say so.",
        },
        ...chatHistory.slice(-8),
        { role: "user", content: prompt },
      ],
    });

    await logAiCall({
      userId,
      provider: selectedProvider,
      model: response.model,
      status: "success",
      usage: response.usage,
    });

    const answer = response.content?.trim() || fallback;
    return { answer, sources };
  } catch (error: any) {
    await logAiCall({
      userId,
      provider: selectedProvider,
      model: selectedModel || "",
      status: "error",
      error: error.message,
    });
    const answer = `${fallback}\n\n(Model call failed: ${error.message})`;
    return { answer, sources };
  }

}

async function getDefaultAiSelection(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_settings")
    .select("default_llm_provider, default_llm_model")
    .eq("user_id", userId)
    .maybeSingle();

  const provider = data?.default_llm_provider || process.env.DEFAULT_LLM_PROVIDER || "deepseek";
  return {
    provider: isSupportedProvider(provider) ? provider : "deepseek",
    model: typeof data?.default_llm_model === "string" ? data.default_llm_model : undefined,
  };
}

async function resolveProviderKey(userId: string, provider: string) {
  if (requiresGitHubOAuth(provider)) {
    const token = await getGitHubOAuthTokenFromSession();
    if (!token) {
      throw new Error("请先使用 GitHub 登录授权 GitHub Copilot。");
    }
    return token;
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

function buildRagPrompt(query: string, sources: SearchResult[]) {
  const evidence = sources.slice(0, 8).map((source, index) => {
    if (source.type === "bookmark" && source.bookmark) {
      return `${index + 1}. [bookmark] ${source.bookmark.title}\nURL: ${source.bookmark.url}\nDescription: ${source.bookmark.description || ""}`;
    }

    if (source.type === "star" && source.star) {
      return `${index + 1}. [github_star] ${source.star.owner}/${source.star.repo}\nURL: ${source.star.url}\nLanguage: ${source.star.language || ""}\nDescription: ${source.star.description || ""}`;
    }

    return `${index + 1}. ${source.id}`;
  });

  return `Question: ${query}\n\nPersonal knowledge evidence:\n${evidence.join("\n\n") || "No matching evidence."}\n\nAnswer in the user's language. Include concrete item names and URLs when useful.`;
}

async function logAiCall({
  userId,
  provider,
  model,
  status,
  usage,
  error,
}: {
  userId: string;
  provider: string;
  model: string;
  status: "success" | "error";
  usage?: any;
  error?: string;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("ai_call_logs").insert({
      user_id: userId,
      provider,
      model,
      status,
      prompt_tokens: usage?.prompt_tokens || usage?.input_tokens || 0,
      completion_tokens: usage?.completion_tokens || usage?.output_tokens || 0,
      total_tokens: usage?.total_tokens || 0,
      error_message: error ? String(error).slice(0, 500) : null,
    });
  } catch {
    // Metrics should never break chat.
  }
}

function buildFallbackAnswer(
  query: string,
  sources: SearchResult[],
  chatHistory: LLMMessage[]
): string {
  const historyHint = chatHistory.length > 0 ? "Based on your recent context, " : "";

  if (sources.length === 0) {
    return `${historyHint}I could not find matching items for "${query}". Try refining keywords or syncing more data.`;
  }

  const topLines = sources.slice(0, 3).map((source, index) => {
    if (source.type === "bookmark" && source.bookmark) {
      return `${index + 1}. ${source.bookmark.title} (${source.bookmark.url})`;
    }

    if (source.type === "star" && source.star) {
      return `${index + 1}. ${source.star.owner}/${source.star.repo} (${source.star.url})`;
    }

    return `${index + 1}. Result ${source.id}`;
  });

  return `${historyHint}Here are the closest matches for "${query}":\n${topLines.join("\n")}`;
}
