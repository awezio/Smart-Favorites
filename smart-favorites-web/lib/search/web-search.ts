import "server-only";

export type WebSearchProvider = "tavily" | "brave" | "serpapi";

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  provider: WebSearchProvider;
};

export type WebSearchResponse = {
  results: WebSearchResult[];
  provider: WebSearchProvider | null;
  skippedReason?: string;
};

const DEFAULT_MAX_RESULTS = 5;

function resolveWebSearchProvider(): WebSearchProvider | null {
  if (process.env.TAVILY_API_KEY?.trim()) {
    return "tavily";
  }
  if (process.env.BRAVE_SEARCH_API_KEY?.trim()) {
    return "brave";
  }
  if (process.env.SERPAPI_API_KEY?.trim()) {
    return "serpapi";
  }
  return null;
}

export function isWebSearchAvailable(): boolean {
  return resolveWebSearchProvider() !== null;
}

export async function webSearch(
  query: string,
  options: { maxResults?: number } = {}
): Promise<WebSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], provider: null, skippedReason: "empty_query" };
  }

  const provider = resolveWebSearchProvider();
  if (!provider) {
    return {
      results: [],
      provider: null,
      skippedReason: "missing_api_key",
    };
  }

  const maxResults = Math.min(10, Math.max(1, options.maxResults ?? DEFAULT_MAX_RESULTS));

  try {
    switch (provider) {
      case "tavily":
        return {
          results: await searchTavily(trimmed, maxResults),
          provider,
        };
      case "brave":
        return {
          results: await searchBrave(trimmed, maxResults),
          provider,
        };
      case "serpapi":
        return {
          results: await searchSerpApi(trimmed, maxResults),
          provider,
        };
      default: {
        const exhaustiveProvider: never = provider;
        throw new Error(`Unsupported web search provider: ${exhaustiveProvider}`);
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Web search failed";
    return {
      results: [],
      provider,
      skippedReason: message.slice(0, 200),
    };
  }
}

async function searchTavily(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed (${response.status})`);
  }

  const data = await response.json();
  const rows = Array.isArray(data.results) ? data.results : [];

  return rows
    .map((row: { title?: string; url?: string; content?: string }) => ({
      title: typeof row.title === "string" ? row.title : "Untitled",
      url: typeof row.url === "string" ? row.url : "",
      snippet: typeof row.content === "string" ? row.content.slice(0, 400) : "",
      provider: "tavily" as const,
    }))
    .filter((row: WebSearchResult) => row.url)
    .slice(0, maxResults);
}

async function searchBrave(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) return [];

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(maxResults));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Brave search failed (${response.status})`);
  }

  const data = await response.json();
  const rows = Array.isArray(data.web?.results) ? data.web.results : [];

  return rows
    .map((row: { title?: string; url?: string; description?: string }) => ({
      title: typeof row.title === "string" ? row.title : "Untitled",
      url: typeof row.url === "string" ? row.url : "",
      snippet: typeof row.description === "string" ? row.description.slice(0, 400) : "",
      provider: "brave" as const,
    }))
    .filter((row: WebSearchResult) => row.url)
    .slice(0, maxResults);
}

async function searchSerpApi(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY?.trim();
  if (!apiKey) return [];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(maxResults));

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`SerpAPI search failed (${response.status})`);
  }

  const data = await response.json();
  const rows = Array.isArray(data.organic_results) ? data.organic_results : [];

  return rows
    .map((row: { title?: string; link?: string; snippet?: string }) => ({
      title: typeof row.title === "string" ? row.title : "Untitled",
      url: typeof row.link === "string" ? row.link : "",
      snippet: typeof row.snippet === "string" ? row.snippet.slice(0, 400) : "",
      provider: "serpapi" as const,
    }))
    .filter((row: WebSearchResult) => row.url)
    .slice(0, maxResults);
}
