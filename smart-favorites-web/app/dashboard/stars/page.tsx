"use client";

import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  LayoutGrid,
  LayoutList,
  Columns3,
  Trash2,
  ExternalLink,
  Star,
  GitFork,
  AlertCircle,
  Pencil,
  Check,
  Github,
} from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import type { GitHubStar } from "@/types";

function StarListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Sync card skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex-1 min-w-[200px] space-y-1">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Filter toolbar skeleton */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-32" />
            <div className="flex border rounded-md ml-auto">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Star card skeletons */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="py-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1 rounded shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-5 w-[45%]" />
                      <Skeleton className="h-4 w-[70%]" />
                    </div>
                    <Skeleton className="h-7 w-7 shrink-0 rounded" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

type ViewMode = "list" | "card" | "compact";
type SortKey = "stars" | "repo" | "created_at" | "language";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

export default function StarsPage() {
  const [stars, setStars] = useState<GitHubStar[]>([]);
  const [filter, setFilter] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);

  // Filter & Sort
  const [filterLang, setFilterLang] = useState("all");
  const [filterDesc, setFilterDesc] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("stars");
  const [sortAsc, setSortAsc] = useState(false);

  // Batch ops
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadStars();
  }, []);

  const loadStars = async () => {
    try {
      const response = await fetch("/api/stars?limit=5000");
      if (response.ok) {
        const data = await response.json();
        setStars(data.stars || []);
      }
    } catch (error) {
      console.error("Failed to load stars:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    toast.loading("正在同步 GitHub Stars...", { id: "sync-stars" });
    try {
      const response = await fetch("/api/stars/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() || undefined }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`同步完成！新增: ${data.summary.added}, 修改: ${data.summary.modified}, 删除: ${data.summary.removed}`, { id: "sync-stars" });
        await loadStars();
      } else {
        const err = await response.json();
        toast.error(`同步失败: ${err.error || "未知错误"}`, { id: "sync-stars" });
      }
    } catch (error: any) {
      toast.error(`同步失败: ${error.message}`, { id: "sync-stars" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`确定删除 ${ids.length} 个项目？`)) return;
    toast.loading("正在删除...", { id: "delete" });
    try {
      const response = await fetch("/api/stars", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (response.ok) {
        toast.success(`已删除 ${ids.length} 个项目`, { id: "delete" });
        setSelectedIds(new Set());
        await loadStars();
      } else {
        toast.error("删除失败", { id: "delete" });
      }
    } catch {
      toast.error("删除失败", { id: "delete" });
    }
  };

  /* ── Computed ── */
  const languages = useMemo(() => {
    const set = new Set<string>();
    stars.forEach((s) => { if (s.language) set.add(s.language); });
    return Array.from(set).sort();
  }, [stars]);

  const langStats = useMemo(() => {
    const map = new Map<string, number>();
    stars.forEach((s) => {
      const l = s.language || "Unknown";
      map.set(l, (map.get(l) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [stars]);

  const starsRangeStats = useMemo(() => {
    const ranges = [
      { name: "< 100", min: 0, max: 100 },
      { name: "100-1K", min: 100, max: 1000 },
      { name: "1K-10K", min: 1000, max: 10000 },
      { name: "10K-50K", min: 10000, max: 50000 },
      { name: "50K+", min: 50000, max: Infinity },
    ];
    return ranges.map((r) => ({
      name: r.name,
      value: stars.filter((s) => s.stars >= r.min && s.stars < r.max).length,
    })).filter((r) => r.value > 0);
  }, [stars]);

  const totalStarsCount = useMemo(
    () => stars.reduce((sum, s) => sum + s.stars, 0),
    [stars]
  );

  const filteredStars = useMemo(() => {
    let result = [...stars];

    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (s) =>
          s.repo.toLowerCase().includes(q) ||
          s.owner.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.language?.toLowerCase().includes(q)
      );
    }

    if (filterLang !== "all") {
      result = result.filter((s) => s.language === filterLang);
    }

    if (filterDesc === "has_desc") {
      result = result.filter((s) => s.description);
    } else if (filterDesc === "no_desc") {
      result = result.filter((s) => !s.description);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "stars") cmp = a.stars - b.stars;
      else if (sortKey === "repo") cmp = a.repo.localeCompare(b.repo);
      else if (sortKey === "language") cmp = (a.language || "").localeCompare(b.language || "");
      else cmp = (a.created_at || "").localeCompare(b.created_at || "");
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [stars, filter, filterLang, filterDesc, sortKey, sortAsc]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStars.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStars.map((s) => s.id)));
    }
  };

  if (initialLoading && stars.length === 0) {
    return <StarListSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GitHub Stars</h1>
          <p className="text-muted-foreground mt-1">
            共 {stars.length} 个项目，{totalStarsCount.toLocaleString()} Stars
          </p>
        </div>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <><Check className="h-4 w-4 mr-1" />完成</>
          ) : (
            <><Pencil className="h-4 w-4 mr-1" />编辑</>
          )}
        </Button>
      </div>

      {/* Statistics */}
      {stars.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">语言分布 (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={langStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {langStats.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Star 数分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={starsRangeStats}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Github className="h-4 w-4" />
            一键同步 GitHub Stars
          </CardTitle>
          <CardDescription className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
            使用 GitHub 登录后可直接同步；未用 GitHub 登录时，可临时填写公开用户名。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">GitHub 用户名（可选）</Label>
              <Input
                placeholder="留空使用 GitHub 登录账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleSync} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "同步中..." : "同步"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter & View toolbar */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              placeholder="搜索项目..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />

            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm max-w-[160px]"
            >
              <option value="all">全部语言</option>
              {languages.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <select
              value={filterDesc}
              onChange={(e) => setFilterDesc(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">全部</option>
              <option value="has_desc">有描述</option>
              <option value="no_desc">无描述</option>
            </select>

            <select
              value={`${sortKey}-${sortAsc ? "asc" : "desc"}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split("-");
                setSortKey(k as SortKey);
                setSortAsc(d === "asc");
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="stars-desc">Stars 多到少</option>
              <option value="stars-asc">Stars 少到多</option>
              <option value="repo-asc">名称 A-Z</option>
              <option value="created_at-desc">最新添加</option>
              <option value="language-asc">按语言</option>
            </select>

            {isEditing && selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(Array.from(selectedIds))}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除 ({selectedIds.size})
              </Button>
            )}

            {/* View toggle */}
            <div className="flex border rounded-md ml-auto">
              {([
                { mode: "list" as ViewMode, icon: LayoutList },
                { mode: "card" as ViewMode, icon: LayoutGrid },
                { mode: "compact" as ViewMode, icon: Columns3 },
              ]).map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-2 transition-colors ${
                    viewMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {isEditing && filteredStars.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredStars.length && filteredStars.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded"
              />
              <span>
                {selectedIds.size > 0
                  ? `已选 ${selectedIds.size} / ${filteredStars.length}`
                  : `${filteredStars.length} 个项目`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stars Display */}
      {filteredStars.length === 0 && stars.length === 0 ? (
        <EmptyState
          icon={Star}
          title="还没有 GitHub Stars"
          description="输入你的 GitHub 用户名并点击「同步」开始导入"
          action={
            <Button variant="outline" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="输入用户名"]')?.focus()}>
              <RefreshCw className="h-4 w-4 mr-2" />开始同步
            </Button>
          }
        />
      ) : filteredStars.length === 0 ? (
        <EmptyState
          icon={Star}
          title="没有匹配的项目"
          description="试试调整搜索关键词或筛选条件"
        />
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStars.map((s) => (
            <Card
              key={s.id}
              className={`transition-all duration-200 hover:shadow-md hover:border-primary/20 ${
                isEditing && selectedIds.has(s.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  {isEditing && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="mt-1 h-4 w-4 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-primary hover:underline truncate block">
                      {s.owner}/{s.repo}
                    </a>
                  </div>
                  {s.language && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {s.language}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {s.description || "暂无描述"}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3" /> {s.stars.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <GitFork className="h-3 w-3" /> {s.forks.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === "compact" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredStars.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-colors hover:bg-accent ${
                isEditing && selectedIds.has(s.id) ? "bg-primary/5 border-primary" : ""
              }`}
            >
              {isEditing && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleSelect(s.id)}
                  className="h-3.5 w-3.5 rounded shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary hover:underline truncate block">
                  {s.owner}/{s.repo}
                </a>
              </div>
              {s.language && (
                <Badge variant="outline" className="text-[10px]">{s.language}</Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
                <Star className="h-3 w-3" /> {s.stars.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStars.map((s) => (
            <Card
              key={s.id}
              className={`transition-all duration-200 hover:shadow-md hover:border-primary/20 ${
                isEditing && selectedIds.has(s.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="py-3">
                <div className="flex items-start gap-3">
                  {isEditing && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="mt-1 h-4 w-4 rounded shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-base font-medium hover:text-primary hover:underline">
                          {s.owner}/{s.repo}
                        </a>
                        {s.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {s.description}
                          </p>
                        )}
                      </div>
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => handleDelete([s.id])}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {s.language && (
                        <Badge variant="outline" className="text-xs">{s.language}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Star className="h-3 w-3" /> {s.stars.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <GitFork className="h-3 w-3" /> {s.forks.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
