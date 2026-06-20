import { NextRequest, NextResponse } from "next/server";
import { searchAll, searchBookmarks, searchDocuments, searchStars } from "@/lib/rag/search";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { query, type = "all", topK = 10, threshold = 0.3 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    let results;
    const supabase = await createServerSupabaseClient();

    switch (type) {
      case "bookmarks":
        results = await searchBookmarks(query, topK, threshold, userId, supabase);
        break;
      case "stars":
        results = await searchStars(query, topK, threshold, userId, supabase);
        break;
      case "documents":
        results = await searchDocuments(query, topK, threshold, userId, supabase);
        break;
      case "all":
      default:
        results = await searchAll(query, topK, threshold, userId, supabase);
        break;
    }

    return NextResponse.json({
      results,
      query,
      type,
      count: results.length,
    });
  } catch (error: any) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
