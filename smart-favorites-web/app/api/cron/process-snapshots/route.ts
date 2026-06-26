import { NextRequest, NextResponse } from "next/server";
import { enforceCronAuth } from "@/lib/cron/enforce-auth";
import { processBookmarkSnapshots } from "@/lib/snapshots/processor";

const DEFAULT_BATCH_LIMIT = 3;

export async function GET(request: NextRequest) {
  try {
    enforceCronAuth(request);

    const limitParam = request.nextUrl.searchParams.get("limit") || "";
    const limit =
      Number.isFinite(Number(limitParam)) && Number(limitParam) > 0
        ? Number(limitParam)
        : DEFAULT_BATCH_LIMIT;
    const bookmarkId = request.nextUrl.searchParams.get("bookmarkId") || undefined;
    const userId = request.nextUrl.searchParams.get("userId") || undefined;

    const processed = await processBookmarkSnapshots({
      limit,
      bookmarkId,
      userId,
    });

    return NextResponse.json({ processed });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Snapshot cron processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
