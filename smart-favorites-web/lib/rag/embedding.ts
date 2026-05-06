import { pipeline, env } from "@xenova/transformers";

let embeddingPipeline: any = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    env.cacheDir = "./.cache/transformers";
    embeddingPipeline = await pipeline(
      "feature-extraction",
      process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embeddingPipeline;
}

async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const model =
    process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ input: text, model, dimensions: 384 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embedding error: ${err}`);
  }

  const json = await response.json();
  return json.data[0].embedding as number[];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (process.env.USE_OPENAI_EMBEDDINGS === "true") {
    return generateOpenAIEmbedding(text);
  }

  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data) as number[];
}
