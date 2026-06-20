import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    model: process.env.DEFAULT_LLM_PROVIDER || "not configured",
    embedding_model: process.env.USE_OPENAI_EMBEDDINGS === "true"
      ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
      : process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
    timestamp: new Date().toISOString(),
  });
}
