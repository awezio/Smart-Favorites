import { generateEmbedding } from "@/lib/rag/embedding";
import { createAdminClient } from "@/lib/supabase/admin";
import { Bookmark, GitHubStar, SearchResult } from "@/types";

const DEFAULT_THRESHOLD = 0.3;
const DEFAULT_TOP_K = 10;

interface KeywordBookmarkRow extends Bookmark {
  rank?: number;
}

interface KeywordStarRow extends GitHubStar {
  rank?: number;
}

export async function searchBookmarks(
  query: string,
  topK: number = DEFAULT_TOP_K,
  threshold: number = DEFAULT_THRESHOLD,
  userId?: string
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("match_bookmarks", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) throw error;

  let results = (data ?? []) as Array<{
    id: string;
    user_id: string;
    title: string;
    url: string;
    description: string;
    folder_path: string;
    similarity: number;
  }>;

  if (userId) {
    results = results.filter((r) => r.user_id === userId);
  }

  if (results.length === 0) {
    return keywordSearchBookmarks(query, topK, userId);
  }

  return results.map((r) => ({
    type: "bookmark" as const,
    id: r.id,
    similarity: r.similarity,
    bookmark: r as unknown as Bookmark,
  }));
}

export async function searchStars(
  query: string,
  topK: number = DEFAULT_TOP_K,
  threshold: number = DEFAULT_THRESHOLD,
  userId?: string
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("match_stars", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) throw error;

  let results = (data ?? []) as Array<{
    id: string;
    user_id: string;
    owner: string;
    repo: string;
    url: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    similarity: number;
  }>;

  if (userId) {
    results = results.filter((r) => r.user_id === userId);
  }

  if (results.length === 0) {
    return keywordSearchStars(query, topK, userId);
  }

  return results.map((r) => ({
    type: "star" as const,
    id: r.id,
    similarity: r.similarity,
    star: r as unknown as GitHubStar,
  }));
}

async function keywordSearchBookmarks(
  query: string,
  topK: number,
  userId?: string
): Promise<SearchResult[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("keyword_search_bookmarks", {
    query_text: query,
    filter_user_id: userId ?? null,
    match_count: topK,
  });

  if (error) return [];

  return (data ?? []).map((r: KeywordBookmarkRow, i: number) => ({
    type: "bookmark" as const,
    id: r.id,
    similarity: Math.max(0, 1 - i * 0.05),
    bookmark: r as Bookmark,
  }));
}

async function keywordSearchStars(
  query: string,
  topK: number,
  userId?: string
): Promise<SearchResult[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("keyword_search_stars", {
    query_text: query,
    filter_user_id: userId ?? null,
    match_count: topK,
  });

  if (error) return [];

  return (data ?? []).map((r: KeywordStarRow, i: number) => ({
    type: "star" as const,
    id: r.id,
    similarity: Math.max(0, 1 - i * 0.05),
    star: r as GitHubStar,
  }));
}

export async function searchAll(
  query: string,
  topK: number = DEFAULT_TOP_K,
  threshold: number = DEFAULT_THRESHOLD,
  userId?: string
): Promise<SearchResult[]> {
  const [bookmarkResults, starResults] = await Promise.all([
    searchBookmarks(query, topK, threshold, userId),
    searchStars(query, topK, threshold, userId),
  ]);

  return [...bookmarkResults, ...starResults].sort(
    (a, b) => b.similarity - a.similarity
  );
}
