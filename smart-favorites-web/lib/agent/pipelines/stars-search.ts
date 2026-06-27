import "server-only";

import { fetchGithubReadme } from "@/lib/github/readme";
import { getStars } from "@/lib/db/github-stars";
import { extractLexicalSearchTerms, searchStars, type SupabaseQueryClient } from "@/lib/rag/search";
import { rerankSearchResults } from "@/lib/rag/rerank";
import { webSearch, type WebSearchResult } from "@/lib/search/web-search";
import type { GitHubStar, SearchResult } from "@/types";

export type StarsSearchPipelineResult = {
  sources: SearchResult[];
  webResults: WebSearchResult[];
  indexCoverage: { total: number; indexed: number };
  pipeline: string;
  writebacks: Array<{ star: GitHubStar; readmeText: string; extraTags: string[] }>;
};

const RETRIEVE_TOP_K = 30;
const RETRIEVE_THRESHOLD = 0.2;
const MIN_RESULTS = 3;
const WEAK_SIMILARITY_THRESHOLD = 0.35;
const DEEP_READ_TOP_N = 5;
const WEB_FALLBACK_SIMILARITY = 0.25;
const README_EXCERPT_MAX_CHARS = 900;

export async function runStarsSearchPipeline(
  query: string,
  userId: string,
  client?: SupabaseQueryClient
): Promise<StarsSearchPipelineResult> {
  const indexCoverage = await getStarIndexCoverage(userId, client);
  let sources = await searchStars(query, RETRIEVE_TOP_K, RETRIEVE_THRESHOLD, userId, client);
  let pipeline = "stars-search:retrieve";

  const maxSimilarity = sources.reduce((max, item) => Math.max(max, item.similarity || 0), 0);
  if (sources.length < MIN_RESULTS || maxSimilarity < WEAK_SIMILARITY_THRESHOLD) {
    const broadMatches = await filterAllStarsByQuery(query, userId, RETRIEVE_TOP_K, client);
    if (broadMatches.length > sources.length) {
      sources = mergeSearchResults(sources, broadMatches).slice(0, RETRIEVE_TOP_K);
      pipeline = "stars-search:retrieve+broad-filter";
    }
  }

  const { enriched, writebacks } = await deepReadTopStars(sources, query, DEEP_READ_TOP_N);
  sources = await rerankSearchResults(query, enriched, Math.min(12, enriched.length), userId);

  let webResults: WebSearchResult[] = [];
  const postRerankMax = sources.reduce((max, item) => Math.max(max, item.similarity || 0), 0);

  if (sources.length === 0 || postRerankMax < WEB_FALLBACK_SIMILARITY) {
    const web = await webSearch(query, { maxResults: 5 });
    webResults = web.results;
    if (webResults.length > 0) {
      pipeline = `${pipeline}+web-fallback`;
    }
  }

  return {
    sources,
    webResults,
    indexCoverage,
    pipeline,
    writebacks,
  };
}

async function getStarIndexCoverage(
  userId: string,
  client?: SupabaseQueryClient
): Promise<{ total: number; indexed: number }> {
  const supabase = client;
  if (!supabase) {
    return { total: 0, indexed: 0 };
  }

  const [totalResult, indexedResult] = await Promise.all([
    supabase.from("github_stars").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("github_stars")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("embedding", "is", null),
  ]);

  if (totalResult.error) {
    throw new Error(totalResult.error.message);
  }
  if (indexedResult.error) {
    throw new Error(indexedResult.error.message);
  }

  return {
    total: totalResult.count || 0,
    indexed: indexedResult.count || 0,
  };
}

async function filterAllStarsByQuery(
  query: string,
  userId: string,
  topK: number,
  client?: SupabaseQueryClient
): Promise<SearchResult[]> {
  const terms = extractLexicalSearchTerms(query);
  if (terms.length === 0) {
    return [];
  }

  const stars = await getStars(2000, 0, userId, client);
  const normalizedQuery = query.trim().toLowerCase();

  return stars
    .map((star) => ({
      type: "star" as const,
      id: star.id,
      similarity: scoreStarMatch(normalizedQuery, terms, star),
      star,
    }))
    .filter((item) => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

function scoreStarMatch(query: string, terms: string[], star: GitHubStar): number {
  const haystack = [
    star.owner,
    star.repo,
    star.url,
    star.description,
    star.description_zh,
    star.description_en,
    star.language,
    star.readme_summary,
    star.readme_summary_zh,
    ...(star.topics || []),
    ...(star.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (query && haystack.includes(query)) {
    score += 0.45;
  }

  for (const term of terms) {
    if (haystack.includes(term)) {
      score += 0.18;
    }
  }

  return Math.min(0.95, score);
}

function mergeSearchResults(primary: SearchResult[], secondary: SearchResult[]): SearchResult[] {
  const merged = new Map<string, SearchResult>();

  for (const item of [...primary, ...secondary]) {
    const key = `${item.type}:${item.id}`;
    const existing = merged.get(key);
    if (!existing || (item.similarity || 0) > (existing.similarity || 0)) {
      merged.set(key, item);
    }
  }

  return Array.from(merged.values()).sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
}

async function deepReadTopStars(
  sources: SearchResult[],
  query: string,
  topN: number
): Promise<{
  enriched: SearchResult[];
  writebacks: Array<{ star: GitHubStar; readmeText: string; extraTags: string[] }>;
}> {
  const extraTags = extractLexicalSearchTerms(query).slice(0, 6);
  const writebacks: Array<{ star: GitHubStar; readmeText: string; extraTags: string[] }> = [];
  const enriched = await Promise.all(
    sources.map(async (source, index) => {
      if (source.type !== "star" || !source.star || index >= topN) {
        return source;
      }

      const star = source.star;
      const hasSummary = Boolean(star.readme_summary || star.readme_summary_zh);
      if (hasSummary) {
        return source;
      }

      const readme = await fetchGithubReadme(star.owner, star.repo);
      if (!readme.reachable || !readme.text) {
        return source;
      }

      writebacks.push({ star, readmeText: readme.text, extraTags });

      return {
        ...source,
        star: {
          ...star,
          description_metadata: {
            ...(star.description_metadata || {}),
            agent_readme_excerpt: readme.text.slice(0, README_EXCERPT_MAX_CHARS),
            agent_readme_source: readme.sourceUrl,
          },
        },
      };
    })
  );

  return { enriched, writebacks };
}

export async function fetchStarReadme(owner: string, repo: string) {
  return fetchGithubReadme(owner, repo);
}
