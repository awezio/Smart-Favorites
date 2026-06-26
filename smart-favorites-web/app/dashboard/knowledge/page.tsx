"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, ExternalLink, FileText, Network, RefreshCw, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/dashboard/page-header";
import { SectionPanel } from "@/components/layout/section-panel";
import { type DashboardLanguage, useDashboardLanguage } from "@/lib/dashboard-language";

type GraphNode = {
  id: string;
  type: "bookmark" | "star" | "document";
  title: string;
  subtitle: string;
  url?: string;
  description?: string;
  keywords: string[];
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  label: string;
  weight: number;
};

type GraphColumn = {
  id: string;
  title: string;
  nodeIds: string[];
};

type GraphPayload = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  kanban: GraphColumn[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    bookmarkCount: number;
    starCount: number;
    documentCount: number;
  };
};

const TYPE_META: Record<GraphNode["type"], {
  label: Record<DashboardLanguage, string>;
  color: string;
  Icon: typeof BookOpen;
}> = {
  bookmark: { label: { zh: "书签", en: "Bookmark" }, color: "#2563eb", Icon: BookOpen },
  star: { label: { zh: "星标", en: "Star" }, color: "#f59e0b", Icon: Star },
  document: { label: { zh: "文档", en: "Document" }, color: "#059669", Icon: FileText },
} as const;

const pageCopy = {
  zh: {
    title: "知识图谱",
    subtitle: "浏览书签、GitHub 星标与文档之间的 OKF 关联",
    refresh: "刷新",
    loadFailed: "知识图谱加载失败",
    nodes: "节点",
    links: "链接",
    bookmarks: "书签",
    starsAndDocs: "星标与文档",
    linkMap: "关联图谱",
    loadingGraph: "正在加载图谱...",
    noKnowledgeItems: "暂无知识条目",
    emptyLane: "此栏暂无条目",
    columnTitle: {
      Connected: "已关联",
      "Needs AI Description": "待生成描述",
      "Web Knowledge": "网页知识",
      "Code & Documents": "代码与文档",
    },
  },
  en: {
    title: "Knowledge Graph",
    subtitle: "OKF links across bookmarks, GitHub stars, and documents.",
    refresh: "Refresh",
    loadFailed: "Knowledge graph failed",
    nodes: "Nodes",
    links: "Links",
    bookmarks: "Bookmarks",
    starsAndDocs: "Stars & Docs",
    linkMap: "Link Map",
    loadingGraph: "Loading graph...",
    noKnowledgeItems: "No knowledge items yet.",
    emptyLane: "No items in this lane.",
    columnTitle: {
      Connected: "Connected",
      "Needs AI Description": "Needs AI Description",
      "Web Knowledge": "Web Knowledge",
      "Code & Documents": "Code & Documents",
    },
  },
};

export default function KnowledgeGraphPage() {
  const [language] = useDashboardLanguage();
  const t = pageCopy[language];
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/knowledge/graph?limit=280");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t.loadFailed);
      }
      setGraph(payload);
    } catch (err: any) {
      setError(err.message || t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.loadFailed]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const nodesById = useMemo(
    () => new Map((graph?.nodes || []).map((node) => [node.id, node])),
    [graph]
  );

  return (
    <div className="page-stack">
      <PageHeader
        title={t.title}
        description={t.subtitle}
        actions={
          <Button onClick={loadGraph} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t.refresh}
          </Button>
        }
      />

      {error && (
        <SectionPanel className="border-destructive/40 bg-destructive/5">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </SectionPanel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.nodes} value={graph?.stats.nodeCount || 0} icon={<Network className="h-4 w-4 text-primary" />} />
        <StatCard label={t.links} value={graph?.stats.edgeCount || 0} />
        <StatCard label={t.bookmarks} value={graph?.stats.bookmarkCount || 0} />
        <StatCard
          label={t.starsAndDocs}
          value={(graph?.stats.starCount || 0) + (graph?.stats.documentCount || 0)}
        />
      </div>

      <SectionPanel
        title={
          <span className="inline-flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {t.linkMap}
          </span>
        }
      >
        <GraphCanvas
          language={language}
          nodes={graph?.nodes || []}
          edges={graph?.edges || []}
          loading={loading}
          loadingLabel={t.loadingGraph}
          emptyLabel={t.noKnowledgeItems}
        />
      </SectionPanel>

      <div className="grid gap-4 lg:grid-cols-4">
        {(graph?.kanban || []).map((column) => (
          <SectionPanel
            key={column.id}
            title={
              <span className="flex w-full items-center justify-between gap-2">
                {t.columnTitle[column.title as keyof typeof t.columnTitle] || column.title}
                <Badge variant="secondary" className="bg-primary/5 text-primary">
                  {column.nodeIds.length}
                </Badge>
              </span>
            }
            className="min-h-72"
          >
            <div className="space-y-3">
              {column.nodeIds.map((nodeId) => {
                const node = nodesById.get(nodeId);
                return node ? <NodeCard key={node.id} language={language} node={node} /> : null;
              })}
              {!column.nodeIds.length && (
                <p className="text-sm text-muted-foreground">{t.emptyLane}</p>
              )}
            </div>
          </SectionPanel>
        ))}
      </div>
    </div>
  );
}

function GraphCanvas({
  language,
  nodes,
  edges,
  loading,
  loadingLabel,
  emptyLabel,
}: {
  language: DashboardLanguage;
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading: boolean;
  loadingLabel: string;
  emptyLabel: string;
}) {
  const positioned = useMemo(() => layoutNodes(nodes), [nodes]);
  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);

  if (loading) {
    return (
      <div className="flex h-[420px] items-center justify-center border border-border bg-muted/40 text-sm text-muted-foreground">
        {loadingLabel}
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="flex h-[420px] items-center justify-center border border-border bg-muted/40 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-border bg-card">
      <svg viewBox="0 0 1000 520" className="h-[420px] w-full">
        <rect width="1000" height="520" fill="currentColor" className="text-primary/5" />
        {edges.slice(0, 320).map((edge) => {
          const source = byId.get(edge.source);
          const target = byId.get(edge.target);
          if (!source || !target) return null;
          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="currentColor"
              className="text-primary/30"
              strokeWidth={Math.min(5, 1 + edge.weight)}
              opacity="0.45"
            />
          );
        })}
        {positioned.map((node) => {
          const meta = TYPE_META[node.type];
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={node.r} fill={meta.color} opacity="0.9" />
              <title>{`${node.title}\n${node.subtitle}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <span key={type} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
            {meta.label[language]}
          </span>
        ))}
      </div>
    </div>
  );
}

function NodeCard({ language, node }: { language: DashboardLanguage; node: GraphNode }) {
  const meta = TYPE_META[node.type];
  const Icon = meta.Icon;
  return (
    <div className="border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: meta.color }} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium">{node.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{node.subtitle}</p>
        </div>
        {node.url && (
          <a href={node.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary" title={meta.label[language]}>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {node.keywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.keywords.slice(0, 3).map((keyword) => (
            <Badge key={keyword} variant="outline" className="max-w-full truncate border-border text-[10px] text-muted-foreground">
              {keyword}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function layoutNodes(nodes: GraphNode[]) {
  const clusters = {
    bookmark: { cx: 300, cy: 250 },
    star: { cx: 700, cy: 180 },
    document: { cx: 690, cy: 360 },
  };
  const counts = {
    bookmark: nodes.filter((node) => node.type === "bookmark").length,
    star: nodes.filter((node) => node.type === "star").length,
    document: nodes.filter((node) => node.type === "document").length,
  };
  const seen = { bookmark: 0, star: 0, document: 0 };

  return nodes.map((node) => {
    const index = seen[node.type]++;
    const total = Math.max(counts[node.type], 1);
    const cluster = clusters[node.type];
    const ring = 46 + (index % 5) * 24 + Math.floor(index / 55) * 18;
    const angle = (index / total) * Math.PI * 2 + (node.type === "bookmark" ? 0 : Math.PI / 5);
    return {
      ...node,
      x: cluster.cx + Math.cos(angle) * ring,
      y: cluster.cy + Math.sin(angle) * ring,
      r: node.type === "bookmark" ? 5 : node.type === "star" ? 6 : 7,
    };
  });
}
