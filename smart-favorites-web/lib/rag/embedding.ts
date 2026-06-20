import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/server/secrets";

type EmbeddingPreference = "local" | "openai";
type EmbeddingOptions = {
  userId?: string;
  preference?: EmbeddingPreference;
};

const DEFAULT_LOCAL_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 384;
const embeddingPipelines = new Map<string, Promise<any>>();

async function getEmbeddingPipeline(modelName: string) {
  if (!embeddingPipelines.has(modelName)) {
    embeddingPipelines.set(
      modelName,
      (async () => {
        const { pipeline } = await import("@xenova/transformers");
        return pipeline("feature-extraction", modelName, {
          quantized: false,
        });
      })()
    );
  }

  return embeddingPipelines.get(modelName)!;
}

export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text], options);
  return embedding || [];
}

export async function generateEmbeddings(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const config = await resolveEmbeddingConfig(options);
  if (config.preference === "openai") {
    return generateOpenAIEmbeddings(texts, config.openaiApiKey);
  }

  const extractor = await getEmbeddingPipeline(config.localModel);
  const output = await extractor(texts, {
    pooling: "mean",
    normalize: true,
  });

  if (Array.isArray(output)) {
    return output.map((item) => toVector(item));
  }

  return [toVector(output)];
}

function toVector(item: any): number[] {
  if (Array.isArray(item)) {
    return item as number[];
  }

  if (item?.data) {
    return Array.from(item.data as Iterable<number>);
  }

  if (typeof item?.tolist === "function") {
    return item.tolist() as number[];
  }

  return [];
}

async function resolveEmbeddingConfig(options: EmbeddingOptions) {
  const localModel = process.env.EMBEDDING_MODEL || DEFAULT_LOCAL_EMBEDDING_MODEL;
  let preference: EmbeddingPreference =
    options.preference ||
    (process.env.USE_OPENAI_EMBEDDINGS === "true" ? "openai" : "local");
  let openaiApiKey = process.env.OPENAI_API_KEY || "";

  if (options.userId) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("user_settings")
        .select("embedding_preference, api_keys")
        .eq("user_id", options.userId)
        .maybeSingle();

      if (data?.embedding_preference === "openai" || data?.embedding_preference === "local") {
        preference = data.embedding_preference;
      }

      const savedOpenAIKey = data?.api_keys?.openai;
      if (savedOpenAIKey) {
        openaiApiKey = decryptSecret(savedOpenAIKey) || openaiApiKey;
      }
    } catch {
      // Fall back to environment-level embedding configuration.
    }
  }

  return {
    preference,
    localModel,
    openaiApiKey,
  };
}

async function generateOpenAIEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  if (!apiKey) {
    throw new Error("OpenAI embedding requires an OpenAI API key.");
  }

  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_EMBEDDING_MODEL;
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI embedding failed (${response.status}): ${(await response.text()).slice(0, 200)}`
    );
  }

  const data = await response.json();
  return (data.data || [])
    .sort((a: any, b: any) => Number(a.index ?? 0) - Number(b.index ?? 0))
    .map((item: any) => Array.isArray(item.embedding) ? item.embedding : []);
}
