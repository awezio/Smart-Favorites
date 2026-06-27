import { NextRequest, NextResponse } from "next/server";
import { getStarsByIds } from "@/lib/db/github-stars";
import { enrichStarsByIds } from "@/lib/stars/enrich-star";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter(
          (value: unknown): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    if (ids.length > 50) {
      return NextResponse.json({ error: "Maximum 50 stars per batch" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const stars = await getStarsByIds(ids, userId, supabase);
    const results = await enrichStarsByIds(ids, userId, stars);

    const success = results.filter((result) => result.success).length;
    const failed = results.length - success;

    return NextResponse.json({
      success: failed === 0,
      summary: {
        total: results.length,
        success,
        failed,
      },
      results,
    });
  } catch (error: unknown) {
    console.error("Stars describe-batch error:", error);
    const message = error instanceof Error ? error.message : "Batch describe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
