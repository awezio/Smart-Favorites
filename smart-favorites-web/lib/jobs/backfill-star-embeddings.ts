import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbeddings } from "@/lib/rag/embedding";

const BATCH_SIZE = 40;

type StarRow = {
  id: string;
  owner: string;
  repo: string;
  url: string;
  description?: string | null;
  description_zh?: string | null;
  description_en?: string | null;
  language?: string | null;
  topics?: string[] | null;
  tags?: string[] | null;
  readme_summary?: string | null;
  readme_summary_zh?: string | null;
};

export function buildStarEmbeddingText(star: {
  owner: string;
  repo: string;
  description?: string | null;
  description_zh?: string | null;
  description_en?: string | null;
  language?: string | null;
  topics?: string[] | null;
  tags?: string[] | null;
  readme_summary?: string | null;
  readme_summary_zh?: string | null;
}): string {
  const topics = Array.isArray(star.topics) ? star.topics.join(" ") : "";
  const tags = Array.isArray(star.tags) ? star.tags.join(" ") : "";
  return `${star.owner}/${star.repo} ${star.description_zh || star.description || ""} ${star.description_en || ""} ${star.language || ""} ${topics} ${tags} ${star.readme_summary_zh || star.readme_summary || ""}`.trim();
}

export async function backfillStarEmbeddings(userId: string, urls?: string[]): Promise<void> {
  if (!userId) return;

  const supabase = createAdminClient();
  const stars = await loadStarsForBackfill(supabase, userId, urls);
  if (stars.length === 0) return;

  for (let index = 0; index < stars.length; index += BATCH_SIZE) {
    const batch = stars.slice(index, index + BATCH_SIZE);
    const texts = batch.map((star) => buildStarEmbeddingText(star));
    const embeddings = await generateEmbeddings(texts, { userId });

    await Promise.all(
      batch.map(async (star, batchIndex) => {
        const embedding = embeddings[batchIndex];
        if (!embedding?.length) return;

        const { error } = await supabase
          .from("github_stars")
          .update({ embedding, updated_at: new Date().toISOString() })
          .eq("id", star.id)
          .eq("user_id", userId);

        if (error) {
          console.error(`Star embedding backfill failed for ${star.owner}/${star.repo}:`, error.message);
        }
      })
    );
  }
}

async function loadStarsForBackfill(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  urls?: string[]
): Promise<StarRow[]> {
  const results: StarRow[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("github_stars")
      .select(
        "id,owner,repo,url,description,description_zh,description_en,language,topics,tags,readme_summary,readme_summary_zh"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + 999);

    if (urls?.length) {
      query = query.in("url", urls);
    } else {
      query = query.is("embedding", null);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) break;
    results.push(...(data as StarRow[]));

    if (data.length < 1000) break;
    offset += 1000;
  }

  return results;
}
