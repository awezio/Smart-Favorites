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
  Code2,
  Layers,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import {
  FilterToolbar,
  ItemSurface,
  ViewModeToggle,
} from "@/components/dashboard/filter-toolbar";
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

function starDescription(star: GitHubStar) {
  return star.description_zh || star.description || "";
}

function starDescriptionEn(star: GitHubStar) {
  return star.description_en || "";
}

function hasStarDescription(star: GitHubStar) {
  return Boolean(starDescription(star).trim() || starDescriptionEn(star).trim());
}

async function readApiError(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  if (!text.trim()) return fallback;

  try {
    const data = JSON.parse(text);
    if (typeof data?.error === "string" && data.error.trim()) {
      return data.error;
    }
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  } catch {
    // Vercel platform failures can be plain text, not JSON.
  }

  return text.trim().slice(0, 300) || fallback;
}

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
        const message = await readApiError(response, "未知错误");
        toast.error(`同步失败: ${message}`, { id: "sync-stars" });
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

  const starsWithDesc = useMemo(
    () => stars.filter(hasStarDescription).length,
    [stars]
  );

  const topLanguage = useMemo(() => langStats[0]?.name ?? "—", [langStats]);

  const filteredStars = useMemo(() => {
    let result = [...stars];

    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (s) =>
          s.repo.toLowerCase().includes(q) ||
          s.owner.toLowerCase().includes(q) ||
          starDescription(s).toLowerCase().includes(q) ||
          starDescriptionEn(s).toLowerCase().includes(q) ||
          s.language?.toLowerCase().includes(q)
      );
    }

    if (filterLang !== "all") {
      result = result.filter((s) => s.language === filterLang);
    }

    if (filterDesc === "has_desc") {
      result = result.filter(hasStarDescription);
    } else if (filterDesc === "no_desc") {
      result = result.filter((s) => !hasStarDescription(s));
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
        <StatsOverview
          metrics={[
            {
              label: "项目总数",
              value: stars.length,
              icon: Github,
              accent: "primary",
            },
            {
              label: "累计 Stars",
              value: totalStarsCount.toLocaleString(),
              icon: TrendingUp,
              accent: "violet",
            },
            {
              label: "语言种类",
              value: languages.length,
              hint: topLanguage !== "—" ? `Top: ${topLanguage}` : undefined,
              icon: Code2,
              accent: "emerald",
            },
            {
              label: "有描述",
              value: starsWithDesc,
              hint: `${Math.round((starsWithDesc / stars.length) * 100)}% 覆盖率`,
              icon: Layers,
              accent: "amber",
            },
          ]}
          donut={{
            title: "语言分布 (Top 10)",
            data: langStats,
            centerLabel: "项目",
            centerValue: String(stars.length),
          }}
          bars={{
            title: "Star 数分布",
            data: starsRangeStats,
          }}
        />
      )}

      {/* Sync Card */}
      <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base tracking-tight">
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
              <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                GitHub 用户名（可选）
              </Label>
              <Input
                placeholder="留空使用 GitHub 登录账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 rounded-xl border-border/60"
              />
            </div>
            <Button onClick={handleSync} disabled={loading} className="rounded-xl">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "同步中..." : "同步"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <FilterToolbar
        searchPlaceholder="搜索项目..."
        searchValue={filter}
        onSearchChange={setFilter}
        showSelectAll={filteredStars.length > 0}
        allSelected={
          selectedIds.size === filteredStars.length && filteredStars.length > 0
        }
        onToggleSelectAll={toggleSelectAll}
        selectedCount={selectedIds.size}
        selects={[
          {
            id: "lang",
            value: filterLang,
            onChange: setFilterLang,
            className: "max-w-[180px]",
            options: [
              { value: "all", label: "全部语言" },
              ...languages.map((lang) => ({ value: lang, label: lang })),
            ],
          },
          {
            id: "desc",
            value: filterDesc,
            onChange: setFilterDesc,
            options: [
              { value: "all", label: "全部" },
              { value: "has_desc", label: "有描述" },
              { value: "no_desc", label: "无描述" },
            ],
          },
          {
            id: "sort",
            value: `${sortKey}-${sortAsc ? "asc" : "desc"}`,
            onChange: (value) => {
              const [key, direction] = value.split("-");
              setSortKey(key as SortKey);
              setSortAsc(direction === "asc");
            },
            options: [
              { value: "stars-desc", label: "Stars 多到少" },
              { value: "stars-asc", label: "Stars 少到多" },
              { value: "repo-asc", label: "名称 A-Z" },
              { value: "created_at-desc", label: "最新添加" },
              { value: "language-asc", label: "按语言" },
            ],
          },
        ]}
        actions={
          isEditing && selectedIds.size > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => handleDelete(Array.from(selectedIds))}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              删除 ({selectedIds.size})
            </Button>
          ) : null
        }
        viewToggle={
          <ViewModeToggle
            active={viewMode}
            onChange={(mode) => setViewMode(mode as ViewMode)}
            modes={[
              { id: "list", icon: LayoutList },
              { id: "card", icon: LayoutGrid },
              { id: "compact", icon: Columns3 },
            ]}
          />
        }
      />

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
            <ItemSurface key={s.id} selected={selectedIds.has(s.id)}>
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-1"
                    aria-label={`选择 ${s.owner}/${s.repo}`}
                  />
                  <div className="flex-1 min-w-0">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm tracking-tight hover:text-primary truncate block">
                      {s.owner}/{s.repo}
                    </a>
                  </div>
                  {s.language && (
                    <Badge variant="outline" className="rounded-lg text-[10px] shrink-0">
                      {s.language}
                    </Badge>
                  )}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {starDescription(s) || "暂无描述"}
                </p>
                {starDescriptionEn(s) && (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80 line-clamp-2">
                    EN: {starDescriptionEn(s)}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3" /> {s.stars.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <GitFork className="h-3 w-3" /> {s.forks.toLocaleString()}
                  </span>
                </div>
              </div>
            </ItemSurface>
          ))}
        </div>
      ) : viewMode === "compact" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredStars.map((s) => (
            <ItemSurface key={s.id} selected={selectedIds.has(s.id)} className="px-3 py-2.5">
              <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.has(s.id)}
                onChange={() => toggleSelect(s.id)}
                className="h-3.5 w-3.5"
                aria-label={`选择 ${s.owner}/${s.repo}`}
              />
              <div className="flex-1 min-w-0">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium tracking-tight hover:text-primary truncate block">
                  {s.owner}/{s.repo}
                </a>
              </div>
              {s.language && (
                <Badge variant="outline" className="rounded-lg text-[10px]">{s.language}</Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0 tabular-nums">
                <Star className="h-3 w-3" /> {s.stars.toLocaleString()}
              </span>
              </div>
            </ItemSurface>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStars.map((s) => (
            <ItemSurface key={s.id} selected={selectedIds.has(s.id)}>
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-1"
                    aria-label={`选择 ${s.owner}/${s.repo}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-base font-medium tracking-tight hover:text-primary">
                          {s.owner}/{s.repo}
                        </a>
                        {hasStarDescription(s) && (
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                            {starDescription(s)}
                          </p>
                        )}
                        {starDescriptionEn(s) && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground/75 line-clamp-2">
                            EN: {starDescriptionEn(s)}
                          </p>
                        )}
                      </div>
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl p-0 shrink-0"
                          onClick={() => handleDelete([s.id])}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3 tabular-nums">
                      {s.language && (
                        <Badge variant="outline" className="rounded-lg text-xs">{s.language}</Badge>
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
              </div>
            </ItemSurface>
          ))}
        </div>
      )}
    </div>
  );
}
