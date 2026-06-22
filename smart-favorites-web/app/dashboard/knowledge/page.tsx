"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, ExternalLink, FileText, Network, RefreshCw, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const TYPE_META = {
  bookmark: { label: "Bookmark", color: "#2563eb", Icon: BookOpen },
  star: { label: "Star", color: "#f59e0b", Icon: Star },
  document: { label: "Document", color: "#059669", Icon: FileText },
} as const;

export default function KnowledgeGraphPage() {
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGraph = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/knowledge/graph?limit=280");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Knowledge graph failed");
      }
      setGraph(payload);
    } catch (err: any) {
      setError(err.message || "Knowledge graph failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  const nodesById = useMemo(
    () => new Map((graph?.nodes || []).map((node) => [node.id, node])),
    [graph]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="mt-2 text-muted-foreground">
            OKF links across bookmarks, GitHub stars, and documents.
          </p>
        </div>
        <Button onClick={loadGraph} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Nodes" value={graph?.stats.nodeCount || 0} />
        <MetricCard label="Links" value={graph?.stats.edgeCount || 0} />
        <MetricCard label="Bookmarks" value={graph?.stats.bookmarkCount || 0} />
        <MetricCard label="Stars & Docs" value={(graph?.stats.starCount || 0) + (graph?.stats.documentCount || 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Link Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GraphCanvas nodes={graph?.nodes || []} edges={graph?.edges || []} loading={loading} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {(graph?.kanban || []).map((column) => (
          <Card key={column.id} className="min-h-72">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                {column.title}
                <Badge variant="secondary">{column.nodeIds.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {column.nodeIds.map((nodeId) => {
                const node = nodesById.get(nodeId);
                return node ? <NodeCard key={node.id} node={node} /> : null;
              })}
              {!column.nodeIds.length && (
                <p className="text-sm text-muted-foreground">No items in this lane.</p>
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
    <Card>
      <CardContent className="py-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function GraphCanvas({
  nodes,
  edges,
  loading,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading: boolean;
}) {
  const positioned = useMemo(() => layoutNodes(nodes), [nodes]);
  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);

  if (loading) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded border bg-muted/20 text-sm text-muted-foreground">
        Loading graph...
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded border bg-muted/20 text-sm text-muted-foreground">
        No knowledge items yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border bg-background">
      <svg viewBox="0 0 1000 520" className="h-[420px] w-full">
        <rect width="1000" height="520" fill="currentColor" className="text-muted/20" />
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
              className="text-border"
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
      <div className="flex flex-wrap gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <span key={type} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function NodeCard({ node }: { node: GraphNode }) {
  const meta = TYPE_META[node.type];
  const Icon = meta.Icon;
  return (
    <div className="rounded border bg-background p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: meta.color }} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium">{node.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{node.subtitle}</p>
        </div>
        {node.url && (
          <a href={node.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {node.keywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.keywords.slice(0, 3).map((keyword) => (
            <Badge key={keyword} variant="outline" className="max-w-full truncate text-[10px]">
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
