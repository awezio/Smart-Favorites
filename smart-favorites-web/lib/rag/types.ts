export type EmbeddingVector = number[];

export type RagSource = {
  id: string;
  type: "bookmark" | "star" | "document";
  title: string;
  url?: string;
  similarity: number;
};
