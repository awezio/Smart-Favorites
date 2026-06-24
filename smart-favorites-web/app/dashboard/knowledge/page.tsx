"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, ExternalLink, FileText, Network, RefreshCw, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    subtitle: "连接书签、GitHub 星标和文档中的 OKF 知识线索。",
    refresh: "刷新",
    loadFailed: "知识图谱加载失败",
    nodes: "节点",
    links: "连接",
    bookmarks: "书签",
    starsAndDocs: "星标与文档",
    linkMap: "连接地图",
    loadingGraph: "正在加载图谱...",
    noKnowledgeItems: "暂无知识条目",
    emptyLane: "这个分组暂无条目。",
    columnTitle: {
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm shadow-sky-100/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t.title}</h1>
          <p className="mt-2 text-slate-500">{t.subtitle}</p>
        </div>
        <Button onClick={loadGraph} disabled={loading} variant="outline" className="rounded-xl border-sky-100 text-slate-700 hover:bg-sky-50">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t.refresh}
        </Button>
      </div>

      {error && (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t.nodes} value={graph?.stats.nodeCount || 0} />
        <MetricCard label={t.links} value={graph?.stats.edgeCount || 0} />
        <MetricCard label={t.bookmarks} value={graph?.stats.bookmarkCount || 0} />
        <MetricCard label={t.starsAndDocs} value={(graph?.stats.starCount || 0) + (graph?.stats.documentCount || 0)} />
      </div>

      <Card className="rounded-2xl border-sky-100 bg-white/90 shadow-sm shadow-sky-100/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-sky-600" />
            {t.linkMap}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GraphCanvas
            language={language}
            nodes={graph?.nodes || []}
            edges={graph?.edges || []}
            loading={loading}
            loadingLabel={t.loadingGraph}
            emptyLabel={t.noKnowledgeItems}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {(graph?.kanban || []).map((column) => (
          <Card key={column.id} className="min-h-72 rounded-2xl border-sky-100 bg-white/90 shadow-sm shadow-sky-100/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                {t.columnTitle[column.title as keyof typeof t.columnTitle] || column.title}
                <Badge variant="secondary" className="bg-sky-50 text-sky-700">{column.nodeIds.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {column.nodeIds.map((nodeId) => {
                const node = nodesById.get(nodeId);
                return node ? <NodeCard key={node.id} language={language} node={node} /> : null;
              })}
              {!column.nodeIds.length && (
                <p className="text-sm text-slate-500">{t.emptyLane}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-2xl border-sky-100 bg-white/90 shadow-sm shadow-sky-100/60">
      <CardContent className="py-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-950">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
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
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-sky-100 bg-sky-50/60 text-sm text-slate-500">
        {loadingLabel}
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-sky-100 bg-sky-50/60 text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-sky-100 bg-white">
      <svg viewBox="0 0 1000 520" className="h-[420px] w-full">
        <rect width="1000" height="520" fill="currentColor" className="text-sky-50" />
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
              className="text-sky-200"
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
      <div className="flex flex-wrap gap-3 border-t border-sky-100 px-4 py-3 text-xs text-slate-500">
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
    <div className="rounded-xl border border-sky-100 bg-white p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: meta.color }} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium">{node.title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{node.subtitle}</p>
        </div>
        {node.url && (
          <a href={node.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-sky-700" title={meta.label[language]}>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {node.keywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.keywords.slice(0, 3).map((keyword) => (
            <Badge key={keyword} variant="outline" className="max-w-full truncate border-sky-100 text-[10px] text-slate-600">
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
