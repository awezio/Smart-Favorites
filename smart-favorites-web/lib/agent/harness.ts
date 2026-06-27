import "server-only";

import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ProviderApiError,
  callProviderChat,
  getEnvProviderKey,
  isSupportedProvider,
} from "@/lib/ai/provider-config";
import {
  classifyChatRoute,
  type ChatKnowledgeMode,
  type ChatRoutingMetadata,
} from "@/lib/chat/routing";
import { AGENT_SYSTEM_PROMPT, buildAgentSystemPrompt, buildAgentUserPrompt } from "@/lib/agent/prompts/agent-system";
import { detectMemoryIntent, processMemoryIntent } from "@/lib/agent/memory/memory-intent";
import { getMemorySnapshot } from "@/lib/agent/memory/memory-store";
import {
  extractSessionSearchQuery,
  searchUserSessions,
  shouldSearchSessions,
} from "@/lib/agent/memory/session-search";
import { writebackStarFromReadme } from "@/lib/agent/kb-writeback";
import { runStarsSearchPipeline } from "@/lib/agent/pipelines/stars-search";
import { type RagResponse } from "@/lib/rag/rag-engine";
import { parseCitationsFromAnswer } from "@/lib/rag/citations";
import { searchAll, searchBookmarks, searchDocuments, searchStars, type SupabaseQueryClient } from "@/lib/rag/search";
import { decryptSecret } from "@/lib/server/secrets";
import type { LLMMessage, SearchResult } from "@/types";

export type AgentChatMode = "rag" | "agent";

export async function agentChat(
  query: string,
  chatHistory: LLMMessage[] = [],
  topK: number,
  userId: string,
  provider?: string,
  model?: string,
  client?: SupabaseQueryClient,
  knowledgeMode: ChatKnowledgeMode = "auto"
): Promise<RagResponse> {
  const supabase = client || createAdminClient();
  const memoryIntent = detectMemoryIntent(query);
  let memoryNotice = "";

  if (memoryIntent) {
    const memoryResult = await processMemoryIntent(userId, memoryIntent, supabase);
    if (memoryResult.applied) {
      memoryNotice = memoryResult.message;
    }
  }

  const memorySnapshot = await getMemorySnapshot(userId, supabase);
  const sessionHits = shouldSearchSessions(query)
    ? await searchUserSessions(userId, extractSessionSearchQuery(query), 5, supabase)
    : [];

  const route = classifyChatRoute(query, knowledgeMode);

  if (!route.useKnowledge) {
    return generateAgentAnswer({
      query,
      chatHistory,
      userId,
      provider,
      model,
      route,
      sources: [],
      pipeline: "agent:direct-chat",
      memorySnapshot,
      memoryNotice,
      sessionHits,
    });
  }

  if (route.scope !== "stars") {
    return runGenericAgentPipeline(
      query,
      chatHistory,
      topK,
      userId,
      provider,
      model,
      supabase,
      route,
      memorySnapshot,
      memoryNotice,
      sessionHits
    );
  }

  return runStarsAgentPipeline(
    query,
    chatHistory,
    userId,
    provider,
    model,
    supabase,
    route,
    memorySnapshot,
    memoryNotice,
    sessionHits
  );
}

async function runStarsAgentPipeline(
  query: string,
  chatHistory: LLMMessage[],
  userId: string,
  provider: string | undefined,
  model: string | undefined,
  client: SupabaseQueryClient,
  route: ChatRoutingMetadata,
  memorySnapshot: Awaited<ReturnType<typeof getMemorySnapshot>>,
  memoryNotice: string,
  sessionHits: Awaited<ReturnType<typeof searchUserSessions>>
): Promise<RagResponse> {
  const pipelineResult = await runStarsSearchPipeline(query, userId, client);

  if (pipelineResult.writebacks.length > 0) {
    after(async () => {
      for (const item of pipelineResult.writebacks) {
        try {
          await writebackStarFromReadme(item.star, userId, {
            readmeText: item.readmeText,
            extraTags: item.extraTags,
          });
        } catch (error: unknown) {
          console.error(
            `Agent KB writeback failed for ${item.star.owner}/${item.star.repo}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    });
  }

  return generateAgentAnswer({
    query,
    chatHistory,
    userId,
    provider,
    model,
    route: {
      ...route,
      agentMode: true,
      pipeline: pipelineResult.pipeline,
      evidenceLevel: pipelineResult.webResults.length > 0 ? "inferred" : "verified",
    },
    sources: pipelineResult.sources,
    webResults: pipelineResult.webResults,
    indexCoverage: pipelineResult.indexCoverage,
    pipeline: pipelineResult.pipeline,
    memorySnapshot,
    memoryNotice,
    sessionHits,
  });
}

async function runGenericAgentPipeline(
  query: string,
  chatHistory: LLMMessage[],
  topK: number,
  userId: string,
  provider: string | undefined,
  model: string | undefined,
  client: SupabaseQueryClient,
  route: ChatRoutingMetadata,
  memorySnapshot: Awaited<ReturnType<typeof getMemorySnapshot>>,
  memoryNotice: string,
  sessionHits: Awaited<ReturnType<typeof searchUserSessions>>
): Promise<RagResponse> {
  const sources = await searchByScope(query, topK, userId, client, route.scope);

  return generateAgentAnswer({
    query,
    chatHistory,
    userId,
    provider,
    model,
    route: {
      ...route,
      agentMode: true,
      pipeline: `agent:${route.scope}`,
      evidenceLevel: sources.length > 0 ? "verified" : "inferred",
    },
    sources,
    pipeline: `agent:${route.scope}`,
    memorySnapshot,
    memoryNotice,
    sessionHits,
  });
}

async function generateAgentAnswer(input: {
  query: string;
  chatHistory: LLMMessage[];
  userId: string;
  provider?: string;
  model?: string;
  route: ChatRoutingMetadata;
  sources: SearchResult[];
  webResults?: import("@/lib/search/web-search").WebSearchResult[];
  indexCoverage?: { total: number; indexed: number };
  pipeline: string;
  memorySnapshot: Awaited<ReturnType<typeof getMemorySnapshot>>;
  memoryNotice?: string;
  sessionHits?: Awaited<ReturnType<typeof searchUserSessions>>;
}): Promise<RagResponse> {
  const savedDefaults = await getDefaultAiSelection(input.userId);
  const selectedProvider =
    input.provider && isSupportedProvider(input.provider)
      ? input.provider
      : savedDefaults.provider;
  const selectedModel = input.model || (!input.provider ? savedDefaults.model : undefined);
  const apiKey = await resolveProviderKey(input.userId, selectedProvider);

  const prompt = buildAgentUserPrompt({
    query: input.query,
    sources: input.sources,
    webResults: input.webResults,
    indexCoverage: input.indexCoverage,
    pipeline: input.pipeline,
    sessionHits: input.sessionHits,
  });

  const systemPrompt = buildAgentSystemPrompt(input.memorySnapshot, {
    memoryNotice: input.memoryNotice,
  });

  const fallback = buildAgentFallback(input.query, input.sources, input.webResults);

  try {
    const response = await callProviderChat({
      provider: selectedProvider,
      apiKey,
      model: selectedModel,
      maxTokens: 2200,
      timeoutMs: 300_000,
      messages: [
        { role: "system", content: systemPrompt },
        ...input.chatHistory.slice(-8),
        { role: "user", content: prompt },
      ],
    });

    const answer = response.content?.trim() || fallback;
    const citations =
      input.sources.length > 0
        ? parseCitationsFromAnswer(answer, input.sources.slice(0, 12))
        : undefined;

    return {
      answer,
      sources: input.sources,
      citations,
      routing: input.route,
    };
  } catch (error: unknown) {
    const providerError = classifyProviderError(error);
    return {
      answer: providerError.userMessage,
      sources: input.sources,
      routing: input.route,
      error: {
        type: providerError.type,
        message: providerError.userMessage,
      },
    };
  }
}

async function searchByScope(
  query: string,
  topK: number,
  userId: string,
  client: SupabaseQueryClient | undefined,
  scope: ChatRoutingMetadata["scope"]
): Promise<SearchResult[]> {
  const perTypeLimit = Math.max(topK, 12);

  switch (scope) {
    case "stars":
      return searchStars(query, perTypeLimit, 0.3, userId, client);
    case "bookmarks":
      return searchBookmarks(query, perTypeLimit, 0.3, userId, client);
    case "documents":
      return searchDocuments(query, perTypeLimit, 0.3, userId, client);
    case "all":
      return searchAll(query, topK, 0.3, userId, client);
    default: {
      const exhaustiveScope: never = scope;
      throw new Error(`Unsupported search scope: ${exhaustiveScope}`);
    }
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
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_settings")
    .select("api_keys")
    .eq("user_id", userId)
    .maybeSingle();

  const saved = data?.api_keys?.[provider];
  if (saved) {
    try {
      const decrypted = decryptSecret(saved);
      if (decrypted) {
        return decrypted;
      }
    } catch {
      // fall through
    }
  }

  return getEnvProviderKey(provider);
}

function buildAgentFallback(
  query: string,
  sources: SearchResult[],
  webResults?: import("@/lib/search/web-search").WebSearchResult[]
): string {
  const lines: string[] = [];

  if (sources.length > 0) {
    lines.push(`以下是与「${query}」最相关的已索引结果：`);
    for (const [index, source] of sources.slice(0, 8).entries()) {
      if (source.type === "star" && source.star) {
        lines.push(`${index + 1}. ${source.star.owner}/${source.star.repo} (${source.star.url})`);
      } else if (source.type === "bookmark" && source.bookmark) {
        lines.push(`${index + 1}. ${source.bookmark.title} (${source.bookmark.url})`);
      }
    }
  }

  if (webResults?.length) {
    lines.push("\n网络推荐（未保存到你的库）：");
    for (const [index, result] of webResults.slice(0, 5).entries()) {
      lines.push(`W${index + 1}. ${result.title} (${result.url})`);
    }
  }

  if (lines.length === 0) {
    return `未在你的已索引内容中找到与「${query}」足够相关的结果。`;
  }

  return lines.join("\n");
}

function classifyProviderError(error: unknown): {
  type: "rate_limited" | "provider_error";
  userMessage: string;
} {
  const status = error instanceof ProviderApiError ? error.status : undefined;
  const body = error instanceof ProviderApiError ? error.body : "";
  const message = error instanceof Error ? error.message : String(error);
  const diagnostic = `${message} ${body}`;
  const isRateLimited =
    status === 429 ||
    /rate limit|too many requests|速率限制|限流/i.test(diagnostic);

  if (isRateLimited) {
    return {
      type: "rate_limited",
      userMessage:
        "当前模型达到请求速率限制。请稍后再试，或切换到另一个已配置模型。",
    };
  }

  return {
    type: "provider_error",
    userMessage: "当前模型调用失败。请稍后重试，或切换到另一个已配置模型。",
  };
}
