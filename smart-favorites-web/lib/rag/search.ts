import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbedding } from "@/lib/rag/embedding";
import type { SearchResult } from "@/types";

export type SupabaseQueryClient = {
  rpc: ReturnType<typeof createAdminClient>["rpc"];
};

export async function searchBookmarks(
  query: string,
  topK: number,
  threshold: number,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<SearchResult[]> {
  const supabase = client || createAdminClient();
  const [semantic, keyword] = await Promise.all([
    searchBookmarksByEmbedding(supabase, query, topK, threshold, userId),
    searchBookmarksByKeyword(supabase, query, topK, userId),
  ]);

  return mergeSearchResults([...semantic, ...keyword], topK);
}

export async function searchStars(
  query: string,
  topK: number,
  threshold: number,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<SearchResult[]> {
  const supabase = client || createAdminClient();
  const [semantic, keyword] = await Promise.all([
    searchStarsByEmbedding(supabase, query, topK, threshold, userId),
    searchStarsByKeyword(supabase, query, topK, userId),
  ]);

  return mergeSearchResults([...semantic, ...keyword], topK);
}

export async function searchAll(
  query: string,
  topK: number,
  threshold: number,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<SearchResult[]> {
  const [bookmarks, stars] = await Promise.all([
    searchBookmarks(query, topK, threshold, userId, client),
    searchStars(query, topK, threshold, userId, client),
  ]);

  return mergeSearchResults([...bookmarks, ...stars], topK);
}

async function searchBookmarksByEmbedding(
  supabase: SupabaseQueryClient,
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

  return ((data || []) as Array<any>)
    .filter((row) => !userId || row.user_id === userId)
    .map(toBookmarkResult);
}

async function searchStarsByEmbedding(
  supabase: SupabaseQueryClient,
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

  return ((data || []) as Array<any>)
    .filter((row) => !userId || row.user_id === userId)
    .map(toStarResult);
}

async function searchBookmarksByKeyword(
  supabase: SupabaseQueryClient,
  query: string,
  topK: number,
  userId?: string
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc("keyword_search_bookmarks", {
    query_text: query,
    filter_user_id: userId || null,
    match_count: topK,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Array<any>).map((row) =>
    toBookmarkResult({ ...row, similarity: row.rank ?? 0.5 })
  );
}

async function searchStarsByKeyword(
  supabase: SupabaseQueryClient,
  query: string,
  topK: number,
  userId?: string
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc("keyword_search_stars", {
    query_text: query,
    filter_user_id: userId || null,
    match_count: topK,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Array<any>).map((row) =>
    toStarResult({ ...row, similarity: row.rank ?? 0.5 })
  );
}

function mergeSearchResults(results: SearchResult[], topK: number): SearchResult[] {
  const merged = new Map<string, SearchResult>();

  for (const result of results) {
    const key = `${result.type}:${result.id}`;
    const existing = merged.get(key);
    if (!existing || result.similarity > existing.similarity) {
      merged.set(key, result);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

function toBookmarkResult(row: any): SearchResult {
  const now = new Date().toISOString();
  return {
    type: "bookmark",
    id: row.id,
    similarity: Number(row.similarity ?? 0),
    bookmark: {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      url: row.url,
      description: row.description,
      folder_path: row.folder_path,
      add_date: row.add_date,
      icon: row.icon,
      created_at: row.created_at || now,
      updated_at: row.updated_at || now,
    },
  };
}

function toStarResult(row: any): SearchResult {
  const now = new Date().toISOString();
  return {
    type: "star",
    id: row.id,
    similarity: Number(row.similarity ?? 0),
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
      updated: row.updated || now,
      created_at: row.created_at || now,
      updated_at: row.updated_at || now,
    },
  };
}
