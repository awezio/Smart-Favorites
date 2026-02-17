import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const settings = {
      defaultProvider: process.env.DEFAULT_LLM_PROVIDER || "deepseek",
      embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
      useOpenAIEmbeddings: process.env.USE_OPENAI_EMBEDDINGS === "true",
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
        kimi: !!process.env.KIMI_API_KEY,
        qwen: !!process.env.QWEN_API_KEY,
        claude: !!process.env.CLAUDE_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        glm: !!process.env.GLM_API_KEY,
        ollama: !!process.env.OLLAMA_BASE_URL,
      },
      github: {
        configured: !!process.env.GITHUB_TOKEN,
      },
    };

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
