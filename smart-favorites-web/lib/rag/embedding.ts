let embeddingPipeline: Promise<any> | null = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      const modelName =
        process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";
      return pipeline("feature-extraction", modelName, {
        quantized: false,
      });
    })();
  }

  return embeddingPipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text]);
  return embedding || [];
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const extractor = await getEmbeddingPipeline();
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
