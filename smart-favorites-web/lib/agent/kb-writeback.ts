import "server-only";

import { summarizeReadmeForEmbedding } from "@/lib/github/readme";
import { buildStarEmbeddingText } from "@/lib/jobs/backfill-star-embeddings";
import { updateStar } from "@/lib/db/github-stars";
import { generateEmbedding } from "@/lib/rag/embedding";
import type { GitHubStar } from "@/types";

type WritebackClient = Parameters<typeof updateStar>[3];

export async function writebackStarFromReadme(
  star: GitHubStar,
  userId: string,
  options: {
    readmeText: string;
    extraTags?: string[];
  },
  client?: WritebackClient
): Promise<void> {
  const readmeSummary = summarizeReadmeForEmbedding(options.readmeText);
  if (!readmeSummary) {
    return;
  }

  const tags = mergeTags(star.tags, star.topics, options.extraTags);
  const embedding = await generateEmbedding(
    buildStarEmbeddingText({
      owner: star.owner,
      repo: star.repo,
      description: star.description,
      description_zh: star.description_zh,
      description_en: star.description_en,
      language: star.language,
      topics: star.topics,
      tags,
      readme_summary: readmeSummary,
      readme_summary_zh: star.readme_summary_zh,
    }),
    { userId }
  );

  await updateStar(
    star.id,
    {
      readme_summary: readmeSummary,
      tags,
      embedding,
      index_status: "indexed",
      last_crawled_at: new Date().toISOString(),
      description_metadata: {
        ...(star.description_metadata || {}),
        agent_writeback_at: new Date().toISOString(),
      },
    },
    userId,
    client
  );
}

function mergeTags(
  existingTags: string[] | undefined,
  topics: string[] | undefined,
  extraTags: string[] | undefined
): string[] {
  const merged = new Set<string>();

  for (const value of [...(existingTags || []), ...(topics || []), ...(extraTags || [])]) {
    const tag = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (tag) {
      merged.add(tag);
    }
  }

  return Array.from(merged).slice(0, 12);
}
