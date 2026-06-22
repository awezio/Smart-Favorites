import type { Bookmark, DocumentRecord, GitHubStar } from "@/types";
import type { KnowledgeEdge } from "@/lib/knowledge-format/types";

type KnowledgeItemNode = {
  id: string;
  type: "bookmark" | "star" | "document";
  title: string;
  subtitle: string;
  url?: string;
  created_at: string;
  description?: string;
  group?: string;
  keywords: string[];
};

type GraphColumn = {
  id: string;
  title: string;
  nodeIds: string[];
};

type BuildGraphOptions = {
  maxNodes?: number;
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "you",
  "your",
  "are",
  "was",
  "were",
  "about",
  "into",
  "using",
  "github",
  "https",
  "http",
  "www",
  "com",
]);

export function buildKnowledgeEdges({
  bookmarks,
  stars,
  documents,
}: {
  bookmarks: Bookmark[];
  stars: GitHubStar[];
  documents: DocumentRecord[];
}): KnowledgeEdge[] {
  const nodes = normalizeNodes({ bookmarks, stars, documents });
  return linkNodes(nodes);
}

export function buildKnowledgeGraph({
  bookmarks,
  stars,
  documents,
}: {
  bookmarks: Bookmark[];
  stars: GitHubStar[];
  documents: DocumentRecord[];
}, options: BuildGraphOptions = {}) {
  const maxNodes = options.maxNodes ?? 280;
  const nodes = normalizeNodes({ bookmarks, stars, documents })
    .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""))
    .slice(0, maxNodes);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = linkNodes(nodes).filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  return {
    nodes,
    edges,
    kanban: buildKanban(nodes, edges),
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      bookmarkCount: nodes.filter((node) => node.type === "bookmark").length,
      starCount: nodes.filter((node) => node.type === "star").length,
      documentCount: nodes.filter((node) => node.type === "document").length,
    },
  };
}

function normalizeNodes({
  bookmarks,
  stars,
  documents,
}: {
  bookmarks: Bookmark[];
  stars: GitHubStar[];
  documents: DocumentRecord[];
}): KnowledgeItemNode[] {
  return [
    ...bookmarks.map((bookmark) => {
      const description = bookmark.description_zh || bookmark.description || bookmark.description_en || "";
      return {
        id: `bookmark:${bookmark.id}`,
        type: "bookmark" as const,
        title: bookmark.title || bookmark.url,
        subtitle: hostFromUrl(bookmark.url) || bookmark.folder_path || "Bookmark",
        url: bookmark.url,
        created_at: bookmark.created_at,
        description,
        group: bookmark.folder_path || hostFromUrl(bookmark.url) || "",
        keywords: extractKeywords(`${bookmark.title} ${description} ${bookmark.folder_path || ""}`),
      };
    }),
    ...stars.map((star) => {
      const description = star.description_zh || star.description || star.description_en || "";
      return {
        id: `star:${star.id}`,
        type: "star" as const,
        title: `${star.owner}/${star.repo}`,
        subtitle: star.language || "GitHub Star",
        url: star.url,
        created_at: star.created_at,
        description,
        group: star.language || "",
        keywords: extractKeywords(`${star.owner} ${star.repo} ${star.language || ""} ${description}`),
      };
    }),
    ...documents.map((document) => ({
      id: `document:${document.id}`,
      type: "document" as const,
      title: document.title || document.file_name,
      subtitle: document.file_type || "Document",
      created_at: document.created_at,
      description: document.file_name,
      group: document.file_type || "",
      keywords: extractKeywords(`${document.title} ${document.file_name} ${document.file_type}`),
    })),
  ];
}

function linkNodes(nodes: KnowledgeItemNode[]): KnowledgeEdge[] {
  const edges = new Map<string, KnowledgeEdge>();
  const bookmarkNodes = nodes.filter((node) => node.type === "bookmark");
  const starNodes = nodes.filter((node) => node.type === "star");

  linkGroups(edges, groupBy(bookmarkNodes, (node) => hostFromUrl(node.url || "")), "same_domain", "Same domain");
  linkGroups(edges, groupBy(bookmarkNodes, (node) => node.group || ""), "same_folder", "Same folder");
  linkGroups(edges, groupBy(starNodes, (node) => node.group || ""), "same_language", "Same language");

  const keywordGroups = new Map<string, KnowledgeItemNode[]>();
  for (const node of nodes) {
    for (const keyword of node.keywords.slice(0, 8)) {
      if (!keywordGroups.has(keyword)) keywordGroups.set(keyword, []);
      keywordGroups.get(keyword)!.push(node);
    }
  }

  for (const [keyword, group] of keywordGroups) {
    if (group.length < 2 || group.length > 10) continue;
    linkAdjacent(edges, group.slice(0, 8), "shared_topic", keyword, 1);
  }

  return [...edges.values()].sort((a, b) => b.weight - a.weight).slice(0, 900);
}

function linkGroups(
  edges: Map<string, KnowledgeEdge>,
  groups: Map<string, KnowledgeItemNode[]>,
  relation: KnowledgeEdge["relation"],
  label: string
) {
  for (const [groupName, group] of groups) {
    if (!groupName || group.length < 2) continue;
    linkAdjacent(edges, group.slice(0, 12), relation, label, relation === "shared_topic" ? 1 : 2);
  }
}

function linkAdjacent(
  edges: Map<string, KnowledgeEdge>,
  nodes: KnowledgeItemNode[],
  relation: KnowledgeEdge["relation"],
  label: string,
  weight: number
) {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (let index = 0; index < sorted.length - 1; index += 1) {
    addEdge(edges, sorted[index].id, sorted[index + 1].id, relation, label, weight);
  }
}

function addEdge(
  edges: Map<string, KnowledgeEdge>,
  source: string,
  target: string,
  relation: KnowledgeEdge["relation"],
  label: string,
  weight: number
) {
  if (source === target) return;
  const [left, right] = [source, target].sort();
  const id = `${relation}:${left}->${right}`;
  const existing = edges.get(id);
  if (existing) {
    existing.weight += weight;
    return;
  }
  edges.set(id, { id, source: left, target: right, relation, label, weight });
}

function buildKanban(nodes: KnowledgeItemNode[], edges: KnowledgeEdge[]): GraphColumn[] {
  const linked = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  return [
    {
      id: "connected",
      title: "Connected",
      nodeIds: nodes.filter((node) => linked.has(node.id)).slice(0, 24).map((node) => node.id),
    },
    {
      id: "needs-description",
      title: "Needs AI Description",
      nodeIds: nodes.filter((node) => !node.description).slice(0, 24).map((node) => node.id),
    },
    {
      id: "web",
      title: "Web Knowledge",
      nodeIds: nodes.filter((node) => node.type === "bookmark").slice(0, 24).map((node) => node.id),
    },
    {
      id: "code-docs",
      title: "Code & Documents",
      nodeIds: nodes.filter((node) => node.type !== "bookmark").slice(0, 24).map((node) => node.id),
    },
  ];
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

function extractKeywords(text: string): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_-]{2,}/gu) || []) {
    const keyword = raw.replace(/^https?/, "");
    if (!keyword || STOPWORDS.has(keyword) || keyword.length > 32) continue;
    counts.set(keyword, (counts.get(keyword) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([keyword]) => keyword);
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
