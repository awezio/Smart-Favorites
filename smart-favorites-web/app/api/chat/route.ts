import { NextRequest, NextResponse } from "next/server";
import { ragChat } from "@/lib/rag/rag-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, sessionId, chatHistory = [] } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    // Perform RAG-powered chat
    const result = await ragChat(query, chatHistory);

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      sessionId,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Chat failed" },
      { status: 500 }
    );
  }
}
