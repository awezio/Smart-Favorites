import { NextRequest, NextResponse, after } from "next/server";
import { describeBookmark, resolveDescribeSnapshotMode } from "@/lib/ai/describe-bookmark";
import { enrichStarRecord } from "@/lib/stars/enrich-star";
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
      const result = await enrichStarRecord(item, userId, supabase);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Star description generation failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        starId: result.starId,
        owner: result.owner,
        repo: result.repo,
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
