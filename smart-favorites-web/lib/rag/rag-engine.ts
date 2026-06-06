import { searchAll, type SupabaseQueryClient } from "@/lib/rag/search";
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
  const answer = buildFallbackAnswer(query, sources, chatHistory);

  return {
    answer,
    sources,
  };
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
