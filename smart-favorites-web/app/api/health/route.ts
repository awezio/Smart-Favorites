import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Test database connection
    const { count: bookmarksCount } = await supabase
      .from("bookmarks")
      .select("*", { count: "exact", head: true });

    const { count: starsCount } = await supabase
      .from("github_stars")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      status: "ok",
      database: "connected",
      bookmarks_count: bookmarksCount || 0,
      stars_count: starsCount || 0,
      model: process.env.DEFAULT_LLM_PROVIDER || "not configured",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
