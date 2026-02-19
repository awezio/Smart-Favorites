import { NextRequest, NextResponse } from "next/server";
import { fetchUserStars, diffStars } from "@/lib/parsers/github-stars";
import { bulkInsertStars, getStars, updateStar, deleteStar } from "@/lib/db/github-stars";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { username, token } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "GitHub username is required" },
        { status: 400 }
      );
    }

    // Fetch stars from GitHub
    const fetchedStars = await fetchUserStars(username, token);

    // Get existing stars for this user
    const existingStars = await getStars(10000, 0, userId);

    // Perform diff
    const diff = diffStars(existingStars, fetchedStars);

    // Process additions
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

    if (addedWithEmbeddings.length > 0) {
      await bulkInsertStars(addedWithEmbeddings as any);
    }

    // Process modifications
    for (const { old: oldStar, new: newStar } of diff.modified) {
      const textToEmbed = `${newStar.owner}/${newStar.repo} ${newStar.description || ""} ${newStar.language || ""}`;
      const embedding = await generateEmbedding(textToEmbed);

      await updateStar(oldStar.id, {
        owner: newStar.owner,
        repo: newStar.repo,
        url: newStar.url,
        description: newStar.description,
        language: newStar.language,
        stars: newStar.stars,
        forks: newStar.forks,
        updated: newStar.updated,
        embedding,
      });
    }

    // Process removals
    for (const star of diff.removed) {
      await deleteStar(star.id);
    }

    return NextResponse.json({
      success: true,
      summary: {
        added: diff.added.length,
        modified: diff.modified.length,
        removed: diff.removed.length,
        unchanged: diff.unchanged_count,
      },
    });
  } catch (error: any) {
    console.error("Stars sync error:", error);
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
