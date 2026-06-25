import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getRerankPoolSize, rerankSearchResults } from "@/lib/rag/rerank";
import type { SearchResult } from "@/types";

export type SupabaseQueryClient = {
  rpc: ReturnType<typeof createAdminClient>["rpc"];
  from: ReturnType<typeof createAdminClient>["from"];
};

export async function searchBookmarks(
  query: string,
  topK: number,
  threshold: number,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<SearchResult[]> {
  const supabase = client || createAdminClient();
  const results = await Promise.allSettled([
    searchBookmarksByEmbedding(supabase, query, topK, threshold, userId),
    searchBookmarksByKeyword(supabase, query, topK, userId),
    searchBookmarksByDirectMatch(supabase, query, topK, userId),
  ]);

  return reciprocalRankFusion(
    results
      .filter((result): result is PromiseFulfilledResult<SearchResult[]> => result.status === "fulfilled")
      .map((result) => result.value),
    topK
  );
}

export async function searchStars(
  query: string,
  topK: number,
  threshold: number,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<SearchResult[]> {
  const supabase = client || createAdminClient();
  const results = await Promise.allSettled([
    searchStarsByEmbedding(supabase, query, topK, threshold, userId),
    searchStarsByKeyword(supabase, query, topK, userId),
    searchStarsByDirectMatch(supabase, query, topK, userId),
  ]);

  return reciprocalRankFusion(
    results
      .filter((result): result is PromiseFulfilledResult<SearchResult[]> => result.status === "fulfilled")
      .map((result) => result.value),
    topK
  );
}

export async function searchDocuments(
  query: string,
  topK: number,
  threshold: number,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<SearchResult[]> {
  if (!userId) {
    return [];
  }

  const supabase = client || createAdminClient();
  const [semanticResult, keywordResult] = await Promise.allSettled([
    searchDocumentsByEmbedding(supabase, query, topK, threshold, userId),
    searchDocumentsByKeyword(supabase, query, topK, userId),
  ]);

  // Keyword document search is a newer RPC and may not exist on all
  // environments yet. Degrade gracefully to semantic-only when it fails.
  const semantic =
    semanticResult.status === "fulfilled" ? semanticResult.value : [];
  const keyword =
    keywordResult.status === "fulfilled" ? keywordResult.value : [];

  return reciprocalRankFusion([semantic, keyword].filter((list) => list.length > 0), topK);
}

export async function searchAll(
  query: string,
  topK: number,
  threshold: number,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<SearchResult[]> {
  const perTypeLimit = Math.max(topK, 12);
  const [bookmarksResult, starsResult, documentsResult] = await Promise.allSettled([
    searchBookmarks(query, perTypeLimit, threshold, userId, client),
    searchStars(query, perTypeLimit, threshold, userId, client),
    searchDocuments(query, perTypeLimit, threshold, userId, client),
  ]);

  // Each search type degrades independently so one missing RPC
  // (e.g. document keyword search) never fails the whole query.
  const bookmarks =
    bookmarksResult.status === "fulfilled" ? bookmarksResult.value : [];
  const stars =
    starsResult.status === "fulfilled" ? starsResult.value : [];
  const documents =
    documentsResult.status === "fulfilled" ? documentsResult.value : [];

  return rerankSearchResults(
    query,
    reciprocalRankFusion(
      [bookmarks, stars, documents].filter((list) => list.length > 0),
      getRerankPoolSize(topK)
    ),
    topK,
    userId
  );
}

async function searchBookmarksByEmbedding(
  supabase: SupabaseQueryClient,
  query: string,
  topK: number,
  threshold: number,
  userId?: string
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query, { userId });
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
  const embedding = await generateEmbedding(query, { userId });
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

async function searchDocumentsByEmbedding(
  supabase: SupabaseQueryClient,
  query: string,
  topK: number,
  threshold: number,
  userId: string
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query, { userId });
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    user_id_param: userId,
    match_count: topK,
    similarity_threshold: threshold,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Array<any>).map(toDocumentResult);
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

async function searchBookmarksByDirectMatch(
  supabase: SupabaseQueryClient,
  query: string,
  topK: number,
  userId?: string
): Promise<SearchResult[]> {
  const terms = extractLexicalSearchTerms(query);
  if (terms.length === 0) {
    return [];
  }

  const orFilter = terms
    .flatMap((term) => [
      `title.ilike.%${escapeIlikeTerm(term)}%`,
      `url.ilike.%${escapeIlikeTerm(term)}%`,
      `description.ilike.%${escapeIlikeTerm(term)}%`,
      `description_zh.ilike.%${escapeIlikeTerm(term)}%`,
      `description_en.ilike.%${escapeIlikeTerm(term)}%`,
      `folder_path.ilike.%${escapeIlikeTerm(term)}%`,
      `tags.cs.{${escapePostgrestArrayTerm(term)}}`,
    ])
    .join(",");

  let request = supabase
    .from("bookmarks")
    .select(
      "id,user_id,title,url,description,description_zh,description_en,description_metadata,tags,folder_path,snapshot_url,snapshot_storage_path,snapshot_taken_at,snapshot_status,snapshot_error,snapshot_metadata,add_date,icon,created_at,updated_at"
    )
    .or(orFilter)
    .limit(Math.max(topK * 3, 24));

  if (userId) {
    request = request.eq("user_id", userId);
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Array<any>)
    .map((row) =>
      toBookmarkResult({
        ...row,
        similarity: scoreDirectMatch(query, terms, [
          row.title,
          row.url,
          row.description,
          row.description_zh,
          row.description_en,
          Array.isArray(row.tags) ? row.tags.join(" ") : "",
          row.folder_path,
        ]),
      })
    )
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
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

async function searchStarsByDirectMatch(
  supabase: SupabaseQueryClient,
  query: string,
  topK: number,
  userId?: string
): Promise<SearchResult[]> {
  const terms = extractLexicalSearchTerms(query);
  if (terms.length === 0) {
    return [];
  }

  const orFilter = terms
    .flatMap((term) => [
      `owner.ilike.%${escapeIlikeTerm(term)}%`,
      `repo.ilike.%${escapeIlikeTerm(term)}%`,
      `url.ilike.%${escapeIlikeTerm(term)}%`,
      `description.ilike.%${escapeIlikeTerm(term)}%`,
      `description_zh.ilike.%${escapeIlikeTerm(term)}%`,
      `description_en.ilike.%${escapeIlikeTerm(term)}%`,
      `language.ilike.%${escapeIlikeTerm(term)}%`,
    ])
    .join(",");

  let request = supabase
    .from("github_stars")
    .select(
      "id,user_id,owner,repo,url,description,description_zh,description_en,description_metadata,language,stars,forks,updated,created_at,updated_at"
    )
    .or(orFilter)
    .limit(Math.max(topK * 3, 24));

  if (userId) {
    request = request.eq("user_id", userId);
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Array<any>)
    .map((row) =>
      toStarResult({
        ...row,
        similarity: scoreDirectMatch(query, terms, [
          row.owner,
          row.repo,
          row.url,
          row.description,
          row.description_zh,
          row.description_en,
          row.language,
        ]),
      })
    )
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

async function searchDocumentsByKeyword(
  supabase: SupabaseQueryClient,
  query: string,
  topK: number,
  userId: string
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc("keyword_search_document_chunks", {
    query_text: query,
    filter_user_id: userId,
    match_count: topK,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Array<any>).map((row) =>
    toDocumentResult({ ...row, similarity: row.rank ?? row.similarity ?? 0.5 })
  );
}

function flattenSettledResults(
  results: PromiseSettledResult<SearchResult[]>[]
): SearchResult[] {
  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
}

function extractLexicalSearchTerms(query: string): string[] {
  const normalized = query.trim().toLowerCase();
  const terms = new Set<string>();

  for (const match of normalized.matchAll(/[a-z0-9][a-z0-9.+#-]*/gi)) {
    const term = match[0].toLowerCase();
    if (term.length >= 2 && !ENGLISH_STOP_WORDS.has(term)) {
      terms.add(term);
    }
  }

  for (const term of CHINESE_DOMAIN_TERMS) {
    if (normalized.includes(term.toLowerCase())) {
      terms.add(term);
    }
  }

  if (normalized.includes("3d") || normalized.includes("3D".toLowerCase())) {
    terms.add("3d");
  }

  return Array.from(terms).slice(0, 8);
}

function escapeIlikeTerm(term: string): string {
  return term.replace(/[%_,]/g, "");
}

function escapePostgrestArrayTerm(term: string): string {
  return term.replace(/[{}"',\\]/g, "").trim();
}

function scoreDirectMatch(
  query: string,
  terms: string[],
  fields: Array<string | null | undefined>
): number {
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const matchedTerms = terms.filter((term) => haystack.includes(term.toLowerCase()));
  if (matchedTerms.length === 0) {
    return 0.4;
  }

  const coverage = matchedTerms.length / Math.max(terms.length, 1);
  const exactQueryBoost =
    normalizedQuery.length >= 2 && haystack.includes(normalizedQuery) ? 0.08 : 0;
  const compactQueryBoost =
    normalizedQuery.includes("3d") && /3d|3d模型|3d建模/i.test(haystack) ? 0.08 : 0;

  return Math.min(0.98, 0.72 + coverage * 0.14 + exactQueryBoost + compactQueryBoost);
}

const ENGLISH_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "find",
  "search",
  "bookmarks",
  "bookmark",
  "my",
  "about",
  "related",
]);

const CHINESE_DOMAIN_TERMS = [
  "3D",
  "3d",
  "建模",
  "模型",
  "渲染",
  "纹理",
  "材质",
  "贴图",
  "动画",
  "点云",
  "生成器",
  "设计",
];

function reciprocalRankFusion(lists: SearchResult[][], topK: number, k = 60): SearchResult[] {
  const scores = new Map<string, { score: number; result: SearchResult }>();

  for (const list of lists) {
    list.forEach((result, rank) => {
      const key = `${result.type}:${result.id}`;
      const contribution = 1 / (k + rank + 1);
      const existing = scores.get(key);
      if (existing) {
        existing.score += contribution;
        if (result.similarity > existing.result.similarity) {
          existing.result = result;
        }
      } else {
        scores.set(key, { score: contribution, result });
      }
    });
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      ...entry.result,
      similarity: Math.max(entry.result.similarity, Math.min(0.99, entry.score)),
    }))
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
      description_zh: row.description_zh,
      description_en: row.description_en,
      description_metadata: row.description_metadata,
      tags: Array.isArray(row.tags) ? row.tags : [],
      folder_path: row.folder_path,
      snapshot_url: row.snapshot_url,
      snapshot_storage_path: row.snapshot_storage_path,
      snapshot_taken_at: row.snapshot_taken_at,
      snapshot_status: row.snapshot_status,
      snapshot_error: row.snapshot_error,
      snapshot_metadata: row.snapshot_metadata,
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
      description_zh: row.description_zh,
      description_en: row.description_en,
      description_metadata: row.description_metadata,
      language: row.language,
      stars: row.stars,
      forks: row.forks,
      updated: row.updated || now,
      created_at: row.created_at || now,
      updated_at: row.updated_at || now,
    },
  };
}

function toDocumentResult(row: any): SearchResult {
  const chunkId = row.id || row.chunk_id;
  const documentId = row.document_id;
  const title = row.title || row.document_title || row.section_title || row.file_name || "Document";

  return {
    type: "document",
    id: chunkId,
    similarity: Number(row.similarity ?? row.rank ?? 0),
    document: {
      id: chunkId,
      document_id: documentId,
      user_id: row.user_id,
      title,
      file_name: row.file_name,
      content: row.content,
      page_number: row.page_number,
      section_title: row.section_title,
    },
  };
}
