import { NextRequest, NextResponse, after } from "next/server";
import {
  describeBookmark,
  resolveDescribeSnapshotMode,
} from "@/lib/ai/describe-bookmark";
import { generateStarDescription } from "@/lib/ai/description-generator";
import { updateStar } from "@/lib/db/github-stars";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runQueuedBookmarkSnapshot } from "@/lib/snapshots/processor";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { type, item, batch = false, runSnapshotInline, snapshotMode } = body;
    const supabase = await createServerSupabaseClient();

    if (!type || !item) {
      return NextResponse.json(
        { error: "Type and item are required" },
        { status: 400 }
      );
    }

    if (type === "bookmark") {
      const resolvedSnapshotMode = resolveDescribeSnapshotMode({
        runSnapshotInline,
        snapshotMode,
        batch,
      });

      const result = await describeBookmark({
        userId,
        item,
        snapshotMode: resolvedSnapshotMode,
      });

      if (result.asyncSnapshotJob) {
        const job = result.asyncSnapshotJob;
        after(async () => {
          try {
            await runQueuedBookmarkSnapshot({
              bookmarkId: job.id,
              userId: job.userId,
              url: job.url,
              title: job.title,
            });
          } catch (workerError: unknown) {
            const message =
              workerError instanceof Error
                ? workerError.message
                : "Snapshot capture failed.";
            const admin = createAdminClient();
            await admin
              .from("bookmarks")
              .update({
                snapshot_status: "failed",
                snapshot_error: message,
                snapshot_taken_at: new Date().toISOString(),
              })
              .eq("id", job.id)
              .eq("user_id", job.userId);
          }
        });
      }

      return NextResponse.json({
        success: true,
        snapshot_mode: resolvedSnapshotMode,
        ...result,
      });
    } else if (type === "star") {
      const generated = await generateStarDescription(item, { userId });
      const textToEmbed = `${item.owner}/${item.repo} ${generated.description_zh} ${generated.description_en} ${item.language || ""}`;
      const embedding = await generateEmbedding(textToEmbed, { userId });

      await updateStar(
        item.id,
        {
          description: generated.description_zh,
          description_zh: generated.description_zh,
          description_en: generated.description_en,
          description_metadata: generated.description_metadata,
          embedding,
        },
        userId,
        supabase
      );

      return NextResponse.json({
        success: true,
        description: generated.description_zh,
        ...generated,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: unknown) {
    console.error("AI describe error:", error);
    const message =
      error instanceof Error ? error.message : "Description generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
