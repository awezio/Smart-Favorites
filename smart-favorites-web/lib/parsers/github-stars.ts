import type { DiffResult, GitHubStar } from "@/types";

type ParsedStar = Omit<GitHubStar, "id" | "user_id" | "created_at" | "updated_at">;

type GitHubRepo = {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics?: string[];
  owner: {
    login: string;
  };
  name: string;
};

type GitHubStarredItem = {
  starred_at?: string;
  repo: GitHubRepo;
};

export async function fetchUserStars(
  username: string,
  token?: string
): Promise<ParsedStar[]> {
  return fetchStarsFromGitHub(
    `https://api.github.com/users/${encodeURIComponent(username)}/starred`,
    token
  );
}

export async function fetchAuthenticatedUserStars(
  token: string
): Promise<ParsedStar[]> {
  return fetchStarsFromGitHub("https://api.github.com/user/starred", token);
}

async function fetchStarsFromGitHub(
  baseUrl: string,
  token?: string
): Promise<ParsedStar[]> {
  const perPage = 100;
  const maxPages = 10;
  const pageResults = await Promise.all(
    Array.from({ length: maxPages }, (_, index) =>
      fetchStarPage(baseUrl, index + 1, perPage, token)
    )
  );

  const results: ParsedStar[] = [];
  for (const pageData of pageResults) {
    if (pageData.length === 0) {
      break;
    }
    results.push(...pageData);
    if (pageData.length < perPage) {
      break;
    }
  }

  return results;
}

async function fetchStarPage(
  baseUrl: string,
  page: number,
  perPage: number,
  token?: string
): Promise<ParsedStar[]> {
  const url = new URL(baseUrl);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: buildGitHubHeaders(token, true),
  });

  if (!response.ok) {
    const message = await readGitHubErrorMessage(response);
    throw new Error(`GitHub API error: ${response.status}${message ? ` - ${message}` : ""}`);
  }

  const data = (await response.json()) as Array<GitHubStarredItem | GitHubRepo>;
  return data.map((entry) => parseStarredEntry(entry));
}

export function diffStars(
  existing: GitHubStar[],
  incoming: ParsedStar[]
): DiffResult<GitHubStar> {
  const existingByUrl = new Map(existing.map((item) => [item.url, item]));
  const incomingByUrl = new Map(
    incoming.map((item) => [item.url, toStar(item)])
  );

  const added: GitHubStar[] = [];
  const removed: GitHubStar[] = [];
  const modified: DiffResult<GitHubStar>["modified"] = [];
  let unchangedCount = 0;

  for (const [url, newItem] of incomingByUrl.entries()) {
    const oldItem = existingByUrl.get(url);
    if (!oldItem) {
      added.push(newItem);
      continue;
    }

    const descriptionChanged = (oldItem.description || "") !== (newItem.description || "");
    const languageChanged = (oldItem.language || "") !== (newItem.language || "");
    const starsChanged = oldItem.stars !== newItem.stars;
    const forksChanged = oldItem.forks !== newItem.forks;
    const topicsChanged = !sameStringArray(oldItem.topics, newItem.topics);
    const starredAtChanged = (oldItem.starred_at || "") !== (newItem.starred_at || "");

    if (
      descriptionChanged ||
      languageChanged ||
      starsChanged ||
      forksChanged ||
      topicsChanged ||
      starredAtChanged
    ) {
      modified.push({
        old: oldItem,
        new: newItem,
        change_type: "data",
      });
    } else {
      unchangedCount += 1;
    }
  }

  for (const [url, oldItem] of existingByUrl.entries()) {
    if (!incomingByUrl.has(url)) {
      removed.push(oldItem);
    }
  }

  return {
    added,
    removed,
    modified,
    unchanged_count: unchangedCount,
  };
}

function parseStarredEntry(entry: GitHubStarredItem | GitHubRepo): ParsedStar {
  const repo: GitHubRepo = "repo" in entry ? entry.repo : entry;
  const starredAt = "repo" in entry ? entry.starred_at : undefined;

  return {
    owner: repo.owner.login,
    repo: repo.name,
    url: repo.html_url,
    description: repo.description || "",
    language: repo.language || "",
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    updated: repo.updated_at,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    starred_at: starredAt || undefined,
    index_status: "pending",
    embedding: undefined,
    source_hash: undefined,
  };
}

function sameStringArray(left?: string[], right?: string[]): boolean {
  const a = [...(left || [])].sort();
  const b = [...(right || [])].sort();
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

async function readGitHubErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.message === "string") return data.message;
  } catch {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }

  return "";
}

function buildGitHubHeaders(token?: string, starred = false): HeadersInit {
  const headers: HeadersInit = {
    Accept: starred
      ? "application/vnd.github.star+json"
      : "application/vnd.github+json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

function toStar(item: ParsedStar): GitHubStar {
  return {
    id: "",
    user_id: "",
    owner: item.owner,
    repo: item.repo,
    url: item.url,
    description: item.description || "",
    language: item.language || "",
    stars: item.stars || 0,
    forks: item.forks || 0,
    updated: item.updated,
    topics: item.topics || [],
    tags: item.tags || [],
    starred_at: item.starred_at,
    index_status: item.index_status || "pending",
    embedding: item.embedding,
    source_hash: item.source_hash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
