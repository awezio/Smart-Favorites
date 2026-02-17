import { NextRequest, NextResponse } from "next/server";
import { searchAll, searchBookmarks, searchStars } from "@/lib/rag/search";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, type = "all", topK = 10, threshold = 0.3 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    let results;

    switch (type) {
      case "bookmarks":
        results = await searchBookmarks(query, topK, threshold);
        break;
      case "stars":
        results = await searchStars(query, topK, threshold);
        break;
      case "all":
      default:
        results = await searchAll(query, topK, threshold);
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
