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

    const data = await response.json();

    // With star+json header, each item has a { starred_at, repo } shape
    const repos: RawStarredRepo[] = data.map((item: any) =>
      item.repo ? item.repo : item
    );

    allStars.push(...repos.map(mapRepo));

    if (repos.length < 100) break;

    // Check Link header for next page
    const linkHeader = response.headers.get("link");
    if (!linkHeader || !linkHeader.includes('rel="next"')) break;

    page++;
  }

  return allStars;
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
    } else if (
      es.stars !== fs.stars ||
      es.forks !== fs.forks ||
      es.description !== (fs.description ?? undefined)
    ) {
      modified.push({
        old: es,
        new: {
          ...es,
          owner: fs.owner,
          repo: fs.repo,
          description: fs.description ?? undefined,
          language: fs.language ?? undefined,
          stars: fs.stars,
          forks: fs.forks,
          updated: fs.updated,
        },
        change_type: "data",
      });
    } else {
      unchanged_count++;
    }
  }

  for (const es of existing) {
    const fs = fetchedByUrl.get(es.url);
    if (!fs) {
      removed.push(es);
    } else if (
      es.stars !== fs.stars ||
      es.forks !== fs.forks ||
      es.description !== (fs.description ?? undefined)
    ) {
      modified.push({
        old: es,
        new: {
          ...es,
          stars: fs.stars,
          forks: fs.forks,
          description: fs.description ?? undefined,
          language: fs.language ?? undefined,
          updated: fs.updated,
        },
        change_type: "data",
      });
    } else {
      unchanged_count++;
    }
  }

  return { added, removed, modified, unchanged_count };
}
