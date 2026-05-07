import { GitHubStar, DiffResult } from "@/types";

interface RawStarredRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

interface FetchedStar {
  owner: string;
  repo: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updated: string;
}

interface StarredItem {
  starred_at?: string;
  repo?: RawStarredRepo;
}

function mapRepo(raw: RawStarredRepo): FetchedStar {
  const [owner, repo] = raw.full_name.split("/");
  return {
    owner,
    repo,
    url: raw.html_url,
    description: raw.description,
    language: raw.language,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    updated: raw.updated_at,
  };
}

export async function fetchUserStars(
  username: string,
  token?: string
): Promise<FetchedStar[]> {
  const allStars: FetchedStar[] = [];
  let page = 1;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.star+json",
    "User-Agent": "Smart-Favorites",
  };

  const authToken = token || process.env.GITHUB_TOKEN;
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  while (true) {
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=100&page=${page}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `GitHub API error ${response.status}: ${await response.text()}`
      );
    }

    const data: (StarredItem | RawStarredRepo)[] = await response.json();

    // With star+json header, each item has a { starred_at, repo } shape
    const repos: RawStarredRepo[] = data.map((item) => {
      const starredItem = item as StarredItem;
      return starredItem.repo ? starredItem.repo : (item as RawStarredRepo);
    });

    allStars.push(...repos.map(mapRepo));

    if (repos.length < 100) break;

    // Check Link header for next page
    const linkHeader = response.headers.get("link");
    if (!linkHeader || !linkHeader.includes('rel="next"')) break;

    page++;
  }

  return allStars;
}

function applyFetchedData(existing: GitHubStar, fetched: FetchedStar): GitHubStar {
  return {
    ...existing,
    owner: fetched.owner,
    repo: fetched.repo,
    description: fetched.description ?? undefined,
    language: fetched.language ?? undefined,
    stars: fetched.stars,
    forks: fetched.forks,
    updated: fetched.updated,
  };
}

function hasDataChanged(existing: GitHubStar, fetched: FetchedStar): boolean {
  return (
    existing.stars !== fetched.stars ||
    existing.forks !== fetched.forks ||
    existing.description !== (fetched.description ?? undefined)
  );
}

export function diffStars(
  existing: GitHubStar[],
  fetched: FetchedStar[]
): DiffResult<GitHubStar> {
  const existingByUrl = new Map(existing.map((s) => [s.url, s]));
  const fetchedByUrl = new Map(fetched.map((s) => [s.url, s]));

  const added: GitHubStar[] = [];
  const removed: GitHubStar[] = [];
  const modified: DiffResult<GitHubStar>["modified"] = [];
  let unchanged_count = 0;

  for (const fs of fetched) {
    const es = existingByUrl.get(fs.url);
    if (!es) {
      added.push({
        id: "",
        user_id: "",
        owner: fs.owner,
        repo: fs.repo,
        url: fs.url,
        description: fs.description ?? undefined,
        language: fs.language ?? undefined,
        stars: fs.stars,
        forks: fs.forks,
        updated: fs.updated,
        created_at: "",
        updated_at: "",
      } as GitHubStar);
    } else if (hasDataChanged(es, fs)) {
      modified.push({ old: es, new: applyFetchedData(es, fs), change_type: "data" });
    } else {
      unchanged_count++;
    }
  }

  for (const es of existing) {
    if (!fetchedByUrl.has(es.url)) {
      removed.push(es);
    }
  }

  return { added, removed, modified, unchanged_count };
}
