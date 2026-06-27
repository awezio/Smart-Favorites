import "server-only";

const README_BRANCHES = ["HEAD", "main", "master"] as const;
const README_MAX_CHARS = 12000;

export type GithubReadmeResult = {
  text: string;
  reachable: boolean;
  sourceUrl?: string;
  error?: string;
};

export async function fetchGithubReadme(owner: string, repo: string): Promise<GithubReadmeResult> {
  const safeOwner = encodeURIComponent(owner.trim());
  const safeRepo = encodeURIComponent(repo.trim());

  for (const branch of README_BRANCHES) {
    const candidates = [
      `https://raw.githubusercontent.com/${safeOwner}/${safeRepo}/${branch}/README.md`,
      `https://raw.githubusercontent.com/${safeOwner}/${safeRepo}/${branch}/readme.md`,
    ];

    for (const sourceUrl of candidates) {
      try {
        const response = await fetch(sourceUrl, {
          headers: { accept: "text/plain, text/markdown, */*" },
          redirect: "follow",
          signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
          continue;
        }

        const text = (await response.text()).slice(0, README_MAX_CHARS).trim();
        if (text.length > 0) {
          return { text, reachable: true, sourceUrl: response.url || sourceUrl };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Fetch failed";
        return { text: "", reachable: false, error: message };
      }
    }
  }

  return { text: "", reachable: false, error: "README not found" };
}

export function summarizeReadmeForEmbedding(text: string, maxChars = 900): string {
  const normalized = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}…`;
}
