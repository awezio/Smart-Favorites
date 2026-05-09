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
  owner: {
    login: string;
  };
  name: string;
};

export async function fetchUserStars(
  username: string,
  token?: string
): Promise<ParsedStar[]> {
  const results: ParsedStar[] = [];
  let page = 1;
  const perPage = 100;

  while (page <= 10) {
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=${perPage}&page=${page}`,
      {
        headers: buildGitHubHeaders(token),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = (await response.json()) as GitHubRepo[];
    if (data.length === 0) {
      break;
    }

    for (const repo of data) {
      results.push({
        owner: repo.owner.login,
        repo: repo.name,
        url: repo.html_url,
        description: repo.description || "",
        language: repo.language || "",
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        updated: repo.updated_at,
        embedding: undefined,
        source_hash: undefined,
      });
    }

    if (data.length < perPage) {
      break;
    }

    page += 1;
  }

  return results;
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

    if (descriptionChanged || languageChanged || starsChanged || forksChanged) {
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

function buildGitHubHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    "Accept": "application/vnd.github+json",
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
    embedding: item.embedding,
    source_hash: item.source_hash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
