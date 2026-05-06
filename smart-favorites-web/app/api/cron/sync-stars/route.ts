import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchUserStars, diffStars } from "@/lib/parsers/github-stars";
import { bulkInsertStars, getStars, updateStar, deleteStar } from "@/lib/db/github-stars";
import { generateEmbedding } from "@/lib/rag/embedding";

/**
 * POST /api/cron/sync-stars
 * Vercel Cron Job: runs daily to sync GitHub Stars for all users
 * who have a GitHub username configured in their settings.
 *
 * Secured by CRON_SECRET environment variable.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch all users who have a GitHub username configured
  const { data: settingsList, error } = await admin
    .from("user_settings")
    .select("user_id, github_username, github_token")
    .not("github_username", "is", null)
    .neq("github_username", "");

  if (error) {
    console.error("[cron/sync-stars] Failed to fetch user settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{
    userId: string;
    username: string;
    added: number;
    modified: number;
    removed: number;
    error?: string;
  }> = [];

  for (const settings of settingsList ?? []) {
    const { user_id: userId, github_username: username, github_token: token } = settings;

    try {
      const fetchedStars = await fetchUserStars(username, token ?? undefined);
      const existingStars = await getStars(10000, 0, userId);
      const diff = diffStars(existingStars, fetchedStars);

      // Add new stars with embeddings
      if (diff.added.length > 0) {
        const addedWithEmbeddings = await Promise.all(
          diff.added.map(async (star: any) => {
            const textToEmbed = `${star.owner}/${star.repo} ${star.description || ""} ${star.language || ""}`;
            const embedding = await generateEmbedding(textToEmbed);
            return {
              user_id: userId,
              owner: star.owner,
              repo: star.repo,
              url: star.url,
              description: star.description,
              language: star.language,
              stars: star.stars || 0,
              forks: star.forks || 0,
              updated: star.updated,
              embedding,
              updated_at: new Date().toISOString(),
            };
          })
        );
        await bulkInsertStars(addedWithEmbeddings as any);
      }

      // Update modified stars
      for (const { old: oldStar, new: newStar } of diff.modified) {
        const textToEmbed = `${newStar.owner}/${newStar.repo} ${newStar.description || ""} ${newStar.language || ""}`;
        const embedding = await generateEmbedding(textToEmbed);
        await updateStar(oldStar.id, {
          description: newStar.description,
          language: newStar.language,
          stars: newStar.stars,
          forks: newStar.forks,
          updated: newStar.updated,
          embedding,
        });
      }

      // Remove deleted stars
      for (const star of diff.removed) {
        await deleteStar(star.id);
      }

      results.push({
        userId,
        username,
        added: diff.added.length,
        modified: diff.modified.length,
        removed: diff.removed.length,
      });

      console.log(
        `[cron/sync-stars] ${username}: +${diff.added.length} ~${diff.modified.length} -${diff.removed.length}`
      );
    } catch (err: any) {
      console.error(`[cron/sync-stars] Error syncing ${username}:`, err.message);
      results.push({
        userId,
        username,
        added: 0,
        modified: 0,
        removed: 0,
        error: err.message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

// Also allow GET for Vercel cron (Vercel uses GET by default for cron jobs)
export async function GET(request: NextRequest) {
  return POST(request);
}
