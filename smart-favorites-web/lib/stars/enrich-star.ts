import "server-only";

import { generateStarDescription } from "@/lib/ai/description-generator";
import { fetchGithubReadme, summarizeReadmeForEmbedding } from "@/lib/github/readme";
import { buildStarEmbeddingText } from "@/lib/jobs/backfill-star-embeddings";
import { generateEmbedding } from "@/lib/rag/embedding";
import { updateStar } from "@/lib/db/github-stars";
import type { GitHubStar } from "@/types";

export type StarEnrichmentResult = {
  starId: string;
  owner: string;
  repo: string;
  success: boolean;
  error?: string;
};

export async function enrichStarRecord(
  star: GitHubStar,
  userId: string,
  client?: Parameters<typeof updateStar>[3]
): Promise<StarEnrichmentResult> {
  const title = `${star.owner}/${star.repo}`;

  try {
    const readme = await fetchGithubReadme(star.owner, star.repo);
    const readmeSummary = summarizeReadmeForEmbedding(readme.text);

    const generated = await generateStarDescription(
      {
        owner: star.owner,
        repo: star.repo,
        url: star.url,
        description: star.description,
        language: star.language,
        stars: star.stars,
        forks: star.forks,
        topics: star.topics,
        readmeSummary,
        readmeReachable: readme.reachable,
      },
      { userId }
    );

    const tags = normalizeTags(generated.tags, star.topics);
    const embedding = await generateEmbedding(
      buildStarEmbeddingText({
        owner: star.owner,
        repo: star.repo,
        description: star.description,
        description_zh: generated.description_zh,
        description_en: generated.description_en,
        language: star.language,
        topics: star.topics,
        tags,
        readme_summary: readmeSummary,
        readme_summary_zh: generated.readme_summary_zh,
      }),
      { userId }
    );

    await updateStar(
      star.id,
      {
        description: generated.description_zh,
        description_zh: generated.description_zh,
        description_en: generated.description_en,
        description_metadata: generated.description_metadata,
        readme_summary: readmeSummary || generated.readme_summary_en || null,
        readme_summary_zh: generated.readme_summary_zh || null,
        tags,
        embedding,
        index_status: "indexed",
        last_crawled_at: new Date().toISOString(),
      },
      userId,
      client
    );

    return { starId: star.id, owner: star.owner, repo: star.repo, success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Star enrichment failed";
    try {
      await updateStar(
        star.id,
        {
          index_status: "failed",
          last_crawled_at: new Date().toISOString(),
          description_metadata: {
            ...(star.description_metadata || {}),
            enrichment_error: message,
          },
        },
        userId,
        client
      );
    } catch {
      // Best-effort failure marker.
    }

    return {
      starId: star.id,
      owner: star.owner,
      repo: star.repo,
      success: false,
      error: message,
    };
  }
}

export async function enrichStarsByIds(
  starIds: string[],
  userId: string,
  stars: GitHubStar[]
): Promise<StarEnrichmentResult[]> {
  const byId = new Map(stars.map((star) => [star.id, star]));
  const results: StarEnrichmentResult[] = [];

  for (const starId of starIds) {
    const star = byId.get(starId);
    if (!star) {
      results.push({
        starId,
        owner: "",
        repo: "",
        success: false,
        error: "Star not found",
      });
      continue;
    }

    results.push(await enrichStarRecord(star, userId));
  }

  return results;
}

function normalizeTags(generatedTags: string[] | undefined, topics: string[] | undefined): string[] {
  const merged = new Set<string>();

  for (const value of [...(generatedTags || []), ...(topics || [])]) {
    const tag = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (tag) {
      merged.add(tag);
    }
  }

  return Array.from(merged).slice(0, 12);
}
