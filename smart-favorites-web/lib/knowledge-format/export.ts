import { createAdminClient } from "@/lib/supabase/admin";
import { buildKnowledgeEdges } from "@/lib/knowledge-format/links";
import { fetchAllKnowledgeRows } from "@/lib/knowledge-format/records";
import type {
  KnowledgeEdge,
  KnowledgeNode,
  KnowledgeSource,
  SfkfExport,
  SfkfFile,
  SfkfManifest,
} from "@/lib/knowledge-format/types";
import type { Bookmark, DocumentChunkRecord, DocumentRecord, GitHubStar } from "@/types";

export async function exportKnowledgeAsSfkf(userId: string): Promise<SfkfExport> {
  const supabase = createAdminClient();
  const [bookmarks, stars, documents, chunks] = await Promise.all([
    fetchAllKnowledgeRows<Bookmark>(supabase, "bookmarks", userId, [{ column: "created_at" }]),
    fetchAllKnowledgeRows<GitHubStar>(supabase, "github_stars", userId, [{ column: "created_at" }]),
    fetchAllKnowledgeRows<DocumentRecord>(supabase, "documents", userId, [{ column: "created_at" }]),
    fetchAllKnowledgeRows<DocumentChunkRecord>(supabase, "document_chunks", userId, [
      { column: "document_id" },
      { column: "chunk_index" },
    ]),
  ]);
  const generatedAt = new Date().toISOString();
  const links = buildKnowledgeEdges({ bookmarks, stars, documents });
  const manifest: SfkfManifest = {
    format: "sfkf",
    version: "0.1.0",
    generated_at: generatedAt,
    owner: {
      app: "Smart Favorites",
      user_id: userId,
    },
    defaults: {
      license: "private",
      language: "zh-CN",
    },
    storage: {
      canonical_root: "knowledge",
    },
  };

  const nodes: KnowledgeNode[] = [];
  const sources: KnowledgeSource[] = [];
  const files: SfkfFile[] = [
    {
      path: "manifest.yaml",
      mediaType: "text/yaml",
      content: serializeManifest(manifest),
    },
  ];

  for (const bookmark of bookmarks) {
    const sourceId = `src_bookmark_${bookmark.id}`;
    const path = `bookmarks/${yearFromDate(bookmark.created_at)}/${slugify(bookmark.title || bookmark.url)}.md`;
    nodes.push({
      id: `bookmark:${bookmark.id}`,
      type: "bookmark",
      path,
      title: bookmark.title,
      source_id: sourceId,
      content_hash: bookmark.source_hash,
    });
    sources.push({
      id: sourceId,
      name: bookmark.title,
      url: bookmark.url,
      provider: "browser",
      license: "unknown",
      access_type: "browser_bookmark",
      retrieved_at: bookmark.created_at,
    });
    files.push({
      path,
      mediaType: "text/markdown",
      content: markdownWithFrontmatter(
        {
          id: `bookmark:${bookmark.id}`,
          type: "bookmark",
          title: bookmark.title,
          canonical_url: bookmark.url,
          source_id: sourceId,
          created_at: bookmark.created_at,
          updated_at: bookmark.updated_at,
          license: "unknown",
          tags: JSON.stringify(bookmark.tags || []),
          folder_path: bookmark.folder_path || "",
          snapshot_url: bookmark.snapshot_url || "",
          snapshot_storage_path: bookmark.snapshot_storage_path || "",
          snapshot_taken_at: bookmark.snapshot_taken_at || "",
          snapshot_status: bookmark.snapshot_status || "",
          content_hash: bookmark.source_hash || "",
          description_zh: bookmark.description_zh || bookmark.description || "",
          description_en: bookmark.description_en || "",
          description_metadata: JSON.stringify(bookmark.description_metadata || {}),
        },
        bilingualDescriptionMarkdown({
          title: bookmark.title,
          descriptionZh: bookmark.description_zh || bookmark.description || "",
          descriptionEn: bookmark.description_en || "",
          url: bookmark.url,
        })
      ),
    });
  }

  for (const star of stars) {
    const title = `${star.owner}/${star.repo}`;
    const sourceId = `src_star_${star.id}`;
    const path = `stars/${slugify(`${star.owner}--${star.repo}`)}.md`;
    nodes.push({
      id: `star:${star.id}`,
      type: "star",
      path,
      title,
      source_id: sourceId,
      content_hash: star.source_hash,
    });
    sources.push({
      id: sourceId,
      name: title,
      url: star.url,
      provider: "github",
      license: "unknown",
      access_type: "github_star",
      retrieved_at: star.created_at,
    });
    files.push({
      path,
      mediaType: "text/markdown",
      content: markdownWithFrontmatter(
        {
          id: `star:${star.id}`,
          type: "star",
          title,
          canonical_url: star.url,
          source_id: sourceId,
          created_at: star.created_at,
          updated_at: star.updated_at,
          license: "unknown",
          language: star.language || "",
          stars: String(star.stars || 0),
          forks: String(star.forks || 0),
          description_zh: star.description_zh || star.description || "",
          description_en: star.description_en || "",
          description_metadata: JSON.stringify(star.description_metadata || {}),
        },
        bilingualDescriptionMarkdown({
          title,
          descriptionZh: star.description_zh || star.description || "",
          descriptionEn: star.description_en || "",
          url: star.url,
        })
      ),
    });
  }

  const documentsById = new Map(documents.map((document) => [document.id, document]));
  for (const document of documents) {
    const sourceId = `src_document_${document.id}`;
    const documentPath = `documents/${slugify(document.title || document.file_name)}`;
    nodes.push({
      id: `document:${document.id}`,
      type: "document",
      path: `${documentPath}/index.md`,
      title: document.title,
      source_id: sourceId,
      content_hash: null,
    });
    sources.push({
      id: sourceId,
      name: document.title,
      provider: "upload",
      license: "private",
      access_type: "document_upload",
      retrieved_at: document.created_at,
    });
    files.push({
      path: `${documentPath}/index.md`,
      mediaType: "text/markdown",
      content: markdownWithFrontmatter(
        {
          id: `document:${document.id}`,
          type: "document",
          title: document.title,
          file_name: document.file_name,
          file_type: document.file_type,
          source_id: sourceId,
          created_at: document.created_at,
          updated_at: document.updated_at,
          license: "private",
          status: document.status,
        },
        `# ${document.title}\n\nOriginal file: ${document.file_name}\n`
      ),
    });
  }

  for (const chunk of chunks) {
    const parent = documentsById.get(chunk.document_id);
    const documentSlug = slugify(parent?.title || parent?.file_name || chunk.document_id);
    const chunkIndex = String(chunk.chunk_index).padStart(4, "0");
    const sourceId = `src_document_${chunk.document_id}`;
    const path = `documents/${documentSlug}/chunks/${chunkIndex}.md`;
    nodes.push({
      id: `chunk:${chunk.id || `${chunk.document_id}:${chunk.chunk_index}`}`,
      type: "chunk",
      path,
      title: `${parent?.title || "Document"} chunk ${chunk.chunk_index}`,
      source_id: sourceId,
      content_hash: chunk.content_hash,
    });
    files.push({
      path,
      mediaType: "text/markdown",
      content: markdownWithFrontmatter(
        {
          id: `chunk:${chunk.id || `${chunk.document_id}:${chunk.chunk_index}`}`,
          type: "chunk",
          title: `${parent?.title || "Document"} chunk ${chunk.chunk_index}`,
          document_id: chunk.document_id,
          source_id: sourceId,
          content_hash: chunk.content_hash,
          page_number: chunk.page_number ? String(chunk.page_number) : "",
          section_title: chunk.section_title || "",
        },
        `# ${parent?.title || "Document"} chunk ${chunk.chunk_index}\n\n${chunk.content}\n`
      ),
    });
  }

  files.push(
    {
      path: "indexes/nodes.yaml",
      mediaType: "text/yaml",
      content: serializeNodes(nodes),
    },
    {
      path: "indexes/sources.yaml",
      mediaType: "text/yaml",
      content: serializeSources(sources),
    },
    {
      path: "indexes/links.yaml",
      mediaType: "text/yaml",
      content: serializeLinks(links),
    }
  );

  return { manifest, files };
}

function serializeManifest(manifest: SfkfManifest) {
  return [
    `format: ${manifest.format}`,
    `version: ${manifest.version}`,
    `generated_at: ${quote(manifest.generated_at)}`,
    "owner:",
    `  app: ${quote(manifest.owner.app)}`,
    `  user_id: ${quote(manifest.owner.user_id)}`,
    "defaults:",
    `  license: ${manifest.defaults.license}`,
    `  language: ${quote(manifest.defaults.language)}`,
    "storage:",
    `  canonical_root: ${manifest.storage.canonical_root}`,
    "",
  ].join("\n");
}

function serializeNodes(nodes: KnowledgeNode[]) {
  return [
    "nodes:",
    ...nodes.flatMap((node) => [
      `  - id: ${quote(node.id)}`,
      `    type: ${node.type}`,
      `    path: ${quote(node.path)}`,
      `    title: ${quote(node.title)}`,
      `    source_id: ${quote(node.source_id)}`,
      `    content_hash: ${quote(node.content_hash || "")}`,
    ]),
    "",
  ].join("\n");
}

function serializeSources(sources: KnowledgeSource[]) {
  return [
    "sources:",
    ...sources.flatMap((source) => [
      `  - id: ${quote(source.id)}`,
      `    name: ${quote(source.name)}`,
      `    url: ${quote(source.url || "")}`,
      `    provider: ${quote(source.provider)}`,
      `    license: ${source.license}`,
      `    access_type: ${source.access_type}`,
      `    retrieved_at: ${quote(source.retrieved_at || "")}`,
    ]),
    "",
  ].join("\n");
}

function serializeLinks(links: KnowledgeEdge[]) {
  return [
    "links:",
    ...links.flatMap((link) => [
      `  - id: ${quote(link.id)}`,
      `    source: ${quote(link.source)}`,
      `    target: ${quote(link.target)}`,
      `    relation: ${link.relation}`,
      `    label: ${quote(link.label)}`,
      `    weight: ${link.weight}`,
    ]),
    "",
  ].join("\n");
}

function markdownWithFrontmatter(frontmatter: Record<string, string>, body: string) {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${quote(value)}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n${body}`;
}

function bilingualDescriptionMarkdown({
  title,
  descriptionZh,
  descriptionEn,
  url,
}: {
  title: string;
  descriptionZh: string;
  descriptionEn: string;
  url: string;
}) {
  const sections = [`# ${title}`];
  if (descriptionZh) {
    sections.push(`## 中文描述\n\n${descriptionZh}`);
  }
  if (descriptionEn) {
    sections.push(`## English Description\n\n${descriptionEn}`);
  }
  sections.push(url);
  return `${sections.join("\n\n")}\n`;
}

function quote(value: string) {
  return JSON.stringify(value ?? "");
}

function yearFromDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? String(new Date().getUTCFullYear()) : String(date.getUTCFullYear());
}

function slugify(value: string) {
  return (value || "untitled")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}
