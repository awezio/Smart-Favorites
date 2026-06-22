import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildKnowledgeGraph } from "@/lib/knowledge-format/links";
import { fetchAllKnowledgeRows } from "@/lib/knowledge-format/records";
import type { Bookmark, DocumentRecord, GitHubStar } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const maxNodes = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get("limit") || "280", 10) || 280, 40),
      500
    );
    const supabase = createAdminClient();
    const [bookmarks, stars, documents] = await Promise.all([
      fetchAllKnowledgeRows<Bookmark>(supabase, "bookmarks", userId, [
        { column: "created_at", ascending: false },
      ]),
      fetchAllKnowledgeRows<GitHubStar>(supabase, "github_stars", userId, [
        { column: "created_at", ascending: false },
      ]),
      fetchAllKnowledgeRows<DocumentRecord>(supabase, "documents", userId, [
        { column: "created_at", ascending: false },
      ]),
    ]);

    return NextResponse.json(
      buildKnowledgeGraph({ bookmarks, stars, documents }, { maxNodes })
    );
  } catch (error: any) {
    console.error("Knowledge graph API error:", error);
    return NextResponse.json(
      { error: error.message || "Knowledge graph failed" },
      { status: 500 }
    );
  }
}
