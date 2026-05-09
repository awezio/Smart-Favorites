import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbedding } from "@/lib/rag/embedding";
import type { SearchResult } from "@/types";

const supabase = createAdminClient();

export async function searchBookmarks(
  query: string,
  topK: number,
  threshold: number,
  userId?: string
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  const { data, error } = await supabase.rpc("match_bookmarks", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as Array<any>;
  const filtered = userId
    ? rows.filter((row) => row.user_id === userId)
    : rows;

  return filtered.map((row) => ({
    type: "bookmark",
    id: row.id,
    similarity: row.similarity,
    bookmark: {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      url: row.url,
      description: row.description,
      folder_path: row.folder_path,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    },
  }));
}

export async function searchStars(
  query: string,
  topK: number,
  threshold: number,
  userId?: string
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  const { data, error } = await supabase.rpc("match_stars", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as Array<any>;
  const filtered = userId
    ? rows.filter((row) => row.user_id === userId)
    : rows;

  return filtered.map((row) => ({
    type: "star",
    id: row.id,
    similarity: row.similarity,
    star: {
      id: row.id,
      user_id: row.user_id,
      owner: row.owner,
      repo: row.repo,
      url: row.url,
      description: row.description,
      language: row.language,
      stars: row.stars,
      forks: row.forks,
      updated: row.updated || new Date().toISOString(),
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    },
  }));
}

export async function searchAll(
  query: string,
  topK: number,
  threshold: number,
  userId?: string
): Promise<SearchResult[]> {
  const [bookmarks, stars] = await Promise.all([
    searchBookmarks(query, topK, threshold, userId),
    searchStars(query, topK, threshold, userId),
  ]);

  const combined = [...bookmarks, ...stars].sort(
    (a, b) => b.similarity - a.similarity
  );

  return combined.slice(0, topK);
}
