export type KnowledgeNodeType = "bookmark" | "star" | "document" | "chunk";

export type SfkfManifest = {
  format: "sfkf";
  version: "0.1.0";
  generated_at: string;
  owner: {
    app: "Smart Favorites";
    user_id: string;
  };
  defaults: {
    license: "private";
    language: string;
  };
  storage: {
    canonical_root: "knowledge";
  };
};

export type KnowledgeNode = {
  id: string;
  type: "bookmark" | "star" | "document" | "chunk";
  path: string;
  title: string;
  source_id: string;
  content_hash?: string | null;
};

export type KnowledgeEdgeRelation =
  | "same_domain"
  | "same_folder"
  | "same_language"
  | "shared_topic";

export type KnowledgeEdge = {
  id: string;
  source: string;
  target: string;
  relation: KnowledgeEdgeRelation;
  label: string;
  weight: number;
};

export type KnowledgeSource = {
  id: string;
  name: string;
  url?: string | null;
  provider: string;
  license: "private" | "unknown";
  access_type: "browser_bookmark" | "github_star" | "document_upload" | "document_chunk";
  retrieved_at?: string | null;
};

export type SfkfFile = {
  path: string;
  content: string;
  mediaType: "text/yaml" | "text/markdown";
};

export type SfkfExport = {
  manifest: SfkfManifest;
  files: SfkfFile[];
};
