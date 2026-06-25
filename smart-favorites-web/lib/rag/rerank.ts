import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getEnvProviderKey } from "@/lib/ai/provider-config";
import { decryptSecret } from "@/lib/server/secrets";
import type { SearchResult } from "@/types";

const RERANK_MODEL = process.env.COHERE_RERANK_MODEL || "rerank-v3.5";
const RERANK_POOL_SIZE = 30;

export function isRerankEnabled(): boolean {
  return process.env.RAG_RERANK_ENABLED !== "false";
}

function searchResultToDocument(source: SearchResult): string {
  if (source.type === "bookmark" && source.bookmark) {
    return `${source.bookmark.title}\n${source.bookmark.url}\n${source.bookmark.description_zh || source.bookmark.description || ""}`;
  }
  if (source.type === "star" && source.star) {
    return `${source.star.owner}/${source.star.repo}\n${source.star.url}\n${source.star.description || ""}`;
  }
  if (source.type === "document" && source.document) {
    return `${source.document.title}\n${source.document.content?.slice(0, 600) || ""}`;
  }
  return source.id;
}

async function resolveCohereKey(userId?: string): Promise<string | null> {
  if (userId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("user_settings")
      .select("api_keys, rag_rerank_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.rag_rerank_enabled === false) {
      return null;
    }

    const saved = data?.api_keys?.cohere;
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
  }

  const envKey = getEnvProviderKey("cohere");
  return envKey || null;
}

export async function rerankSearchResults(
  query: string,
  results: SearchResult[],
  topK: number,
  userId?: string
): Promise<SearchResult[]> {
  if (!isRerankEnabled() || results.length <= topK) {
    return results.slice(0, topK);
  }

  const apiKey = await resolveCohereKey(userId);
  if (!apiKey) {
    return results.slice(0, topK);
  }

  const pool = results.slice(0, RERANK_POOL_SIZE);
  const documents = pool.map(searchResultToDocument);

  try {
    const response = await fetch("https://api.cohere.com/v2/rerank", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        query,
        documents,
        top_n: topK,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return results.slice(0, topK);
    }

    const data = await response.json();
    const ranked = Array.isArray(data.results) ? data.results : [];
    if (ranked.length === 0) {
      return results.slice(0, topK);
    }

    return ranked
      .map((item: { index?: number; relevance_score?: number }) => {
        const index = Number(item.index);
        const source = pool[index];
        if (!source) return null;
        return {
          ...source,
          similarity: Math.max(
            source.similarity || 0,
            Math.min(0.99, Number(item.relevance_score) || source.similarity || 0)
          ),
        };
      })
      .filter((item: SearchResult | null): item is SearchResult => Boolean(item));
  } catch {
    return results.slice(0, topK);
  }
}

export function getRerankPoolSize(topK: number): number {
  return Math.max(topK * 3, RERANK_POOL_SIZE);
}
