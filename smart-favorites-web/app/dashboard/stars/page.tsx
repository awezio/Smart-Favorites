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
import { StatsOverview } from "@/components/dashboard/stats-overview-dynamic";
import {
  FilterToolbar,
  ItemGrid,
  ItemSurface,
  ViewModeToggle,
} from "@/components/dashboard/filter-toolbar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { FeedList, FeedListItem } from "@/components/layout/feed-list";
import { SectionPanel } from "@/components/layout/section-panel";
import { type DashboardLanguage, useDashboardLanguage } from "@/lib/dashboard-language";
import type { GitHubStar } from "@/types";

const pageCopy = {
  zh: {
    title: "GitHub Stars",
    subtitle: (count: number, total: string) => `共 ${count} 个项目，${total} Stars`,
    doneEditing: "完成",
    edit: "编辑",
    metricTotal: "项目总数",
    metricTotalStars: "累计 Stars",
    metricLanguages: "语言种类",
    topLanguageHint: (name: string) => `Top: ${name}`,
    metricHasDescription: "有描述",
    coverageHint: (percent: number) => `${percent}% 覆盖率`,
    donutTitle: "语言分布 (Top 10)",
    donutCenterLabel: "项目",
    unknownLanguage: "未知语言",
    barsTitle: "Star 数分布",
    syncTitle: "一键同步 GitHub Stars",
    syncDescription: "使用 GitHub 登录后可直接同步；未用 GitHub 登录时，可临时填写公开用户名。",
    usernameLabel: "GitHub 用户名（可选）",
    usernamePlaceholder: "留空使用 GitHub 登录账号",
    syncing: "同步中...",
    sync: "同步",
    searchPlaceholder: "搜索项目...",
    allLanguages: "全部语言",
    all: "全部",
    hasDescription: "有描述",
    noDescription: "无描述",
    sortStarsDesc: "Stars 多到少",
    sortStarsAsc: "Stars 少到多",
    sortRepoAsc: "名称 A-Z",
    sortCreatedDesc: "最新添加",
    sortLanguageAsc: "按语言",
    delete: (count: number) => `删除 (${count})`,
    emptyNoStarsTitle: "还没有 GitHub Stars",
    emptyNoStarsDescription: "输入你的 GitHub 用户名并点击「同步」开始导入",
    emptyNoStarsAction: "开始同步",
    emptyNoMatchTitle: "没有匹配的项目",
    emptyNoMatchDescription: "试试调整搜索关键词或筛选条件",
    noDescriptionText: "暂无描述",
    enPrefix: "EN",
    selectAria: (owner: string, repo: string) => `选择 ${owner}/${repo}`,
    deleteConfirm: (count: number) => `确定删除 ${count} 个项目？`,
    deleteLoading: "正在删除...",
    deleteSuccess: (count: number) => `已删除 ${count} 个项目`,
    deleteFailed: "删除失败",
    syncLoading: "正在同步 GitHub Stars...",
    syncSuccess: (added: number, modified: number, removed: number) =>
      `同步完成！新增: ${added}, 修改: ${modified}, 删除: ${removed}`,
    syncFailed: (message: string) => `同步失败: ${message}`,
    unknownError: "未知错误",
  },
  en: {
    title: "GitHub Stars",
    subtitle: (count: number, total: string) => `${count} projects, ${total} Stars`,
    doneEditing: "Done",
    edit: "Edit",
    metricTotal: "Total projects",
    metricTotalStars: "Total Stars",
    metricLanguages: "Languages",
    topLanguageHint: (name: string) => `Top: ${name}`,
    metricHasDescription: "Has description",
    coverageHint: (percent: number) => `${percent}% coverage`,
    donutTitle: "Language distribution (Top 10)",
    donutCenterLabel: "Projects",
    unknownLanguage: "Unknown",
    barsTitle: "Star distribution",
    syncTitle: "Sync GitHub Stars in one click",
    syncDescription:
      "Sign in with GitHub to sync directly. If you didn't sign in with GitHub, you can temporarily enter a public username.",
    usernameLabel: "GitHub username (optional)",
    usernamePlaceholder: "Leave empty to use your GitHub login",
    syncing: "Syncing...",
    sync: "Sync",
    searchPlaceholder: "Search projects...",
    allLanguages: "All languages",
    all: "All",
    hasDescription: "Has description",
    noDescription: "No description",
    sortStarsDesc: "Stars high to low",
    sortStarsAsc: "Stars low to high",
    sortRepoAsc: "Name A-Z",
    sortCreatedDesc: "Recently added",
    sortLanguageAsc: "By language",
    delete: (count: number) => `Delete (${count})`,
    emptyNoStarsTitle: "No GitHub Stars yet",
    emptyNoStarsDescription: "Enter your GitHub username and click \"Sync\" to start importing",
    emptyNoStarsAction: "Start sync",
    emptyNoMatchTitle: "No matching projects",
    emptyNoMatchDescription: "Try adjusting your search keywords or filters",
    noDescriptionText: "No description",
    enPrefix: "EN",
    selectAria: (owner: string, repo: string) => `Select ${owner}/${repo}`,
    deleteConfirm: (count: number) => `Delete ${count} items?`,
    deleteLoading: "Deleting...",
    deleteSuccess: (count: number) => `Deleted ${count} items`,
    deleteFailed: "Delete failed",
    syncLoading: "Syncing GitHub Stars...",
    syncSuccess: (added: number, modified: number, removed: number) =>
      `Sync complete! Added: ${added}, modified: ${modified}, removed: ${removed}`,
    syncFailed: (message: string) => `Sync failed: ${message}`,
    unknownError: "Unknown error",
  },
} as const;

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

      <SectionPanel title={<Skeleton className="h-5 w-48" />} description={<Skeleton className="h-4 w-64 mt-1" />}>
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
      </SectionPanel>

      <div className="border border-border bg-background p-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-32" />
          <div className="flex border ml-auto">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>

      <FeedList>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 mt-1 rounded shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-5 w-[45%]" />
                    <Skeleton className="h-4 w-[70%]" />
                  </div>
                  <Skeleton className="h-7 w-7 shrink-0" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </FeedList>
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

function starDescriptionForLanguage(star: GitHubStar, language: DashboardLanguage) {
  return language === "zh"
    ? (star.description_zh || star.description || star.description_en || "")
    : (star.description_en || star.description || star.description_zh || "");
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
  const [language] = useDashboardLanguage();
  const t = pageCopy[language];
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
    toast.loading(t.syncLoading, { id: "sync-stars" });
    try {
      const response = await fetch("/api/stars/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() || undefined }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(
          t.syncSuccess(data.summary.added, data.summary.modified, data.summary.removed),
          { id: "sync-stars" }
        );
        await loadStars();
      } else {
        const message = await readApiError(response, t.unknownError);
        toast.error(t.syncFailed(message), { id: "sync-stars" });
      }
    } catch (error: any) {
      toast.error(t.syncFailed(error.message), { id: "sync-stars" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(t.deleteConfirm(ids.length))) return;
    toast.loading(t.deleteLoading, { id: "delete" });
    try {
      const response = await fetch("/api/stars", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (response.ok) {
        toast.success(t.deleteSuccess(ids.length), { id: "delete" });
        setSelectedIds(new Set());
        await loadStars();
      } else {
        toast.error(t.deleteFailed, { id: "delete" });
      }
    } catch {
      toast.error(t.deleteFailed, { id: "delete" });
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
      const l = s.language || t.unknownLanguage;
      map.set(l, (map.get(l) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [stars, t.unknownLanguage]);

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

  const topLanguage = useMemo(() => langStats[0]?.name ?? "-", [langStats]);

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
    <div className="page-stack">
      <PageHeader
        title={t.title}
        description={t.subtitle(stars.length, totalStarsCount.toLocaleString())}
        actions={
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <><Check className="mr-1 h-4 w-4" />{t.doneEditing}</>
            ) : (
              <><Pencil className="mr-1 h-4 w-4" />{t.edit}</>
            )}
          </Button>
        }
      />

      {/* Statistics */}
      {stars.length > 0 && (
        <StatsOverview
          metrics={[
            {
              label: t.metricTotal,
              value: stars.length,
              icon: Github,
              accent: "primary",
            },
            {
              label: t.metricTotalStars,
              value: totalStarsCount.toLocaleString(),
              icon: TrendingUp,
              accent: "sky",
            },
            {
              label: t.metricLanguages,
              value: languages.length,
              hint: topLanguage !== "-" ? t.topLanguageHint(topLanguage) : undefined,
              icon: Code2,
              accent: "blue",
            },
            {
              label: t.metricHasDescription,
              value: starsWithDesc,
              hint: t.coverageHint(Math.round((starsWithDesc / stars.length) * 100)),
              icon: Layers,
              accent: "cyan",
            },
          ]}
          donut={{
            title: t.donutTitle,
            data: langStats,
            centerLabel: t.donutCenterLabel,
            centerValue: String(stars.length),
          }}
          bars={{
            title: t.barsTitle,
            data: starsRangeStats,
          }}
        />
      )}

      <SectionPanel
        title={
          <span className="inline-flex items-center gap-2">
            <Github className="h-4 w-4" />
            {t.syncTitle}
          </span>
        }
        description={
          <span className="inline-flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
            {t.syncDescription}
          </span>
        }
      >
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label className="utility-label">{t.usernameLabel}</Label>
            <Input
              placeholder={t.usernamePlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={handleSync} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? t.syncing : t.sync}
          </Button>
        </div>
      </SectionPanel>

      <SectionPanel noPadding>
      <FilterToolbar
        searchPlaceholder={t.searchPlaceholder}
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
              { value: "all", label: t.allLanguages },
              ...languages.map((lang) => ({ value: lang, label: lang })),
            ],
          },
          {
            id: "desc",
            value: filterDesc,
            onChange: setFilterDesc,
            options: [
              { value: "all", label: t.all },
              { value: "has_desc", label: t.hasDescription },
              { value: "no_desc", label: t.noDescription },
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
              { value: "stars-desc", label: t.sortStarsDesc },
              { value: "stars-asc", label: t.sortStarsAsc },
              { value: "repo-asc", label: t.sortRepoAsc },
              { value: "created_at-desc", label: t.sortCreatedDesc },
              { value: "language-asc", label: t.sortLanguageAsc },
            ],
          },
        ]}
        actions={
          isEditing && selectedIds.size > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-10"
              onClick={() => handleDelete(Array.from(selectedIds))}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t.delete(selectedIds.size)}
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
      </SectionPanel>

      {/* Stars Display */}
      {filteredStars.length === 0 && stars.length === 0 ? (
        <EmptyState
          icon={Star}
          title={t.emptyNoStarsTitle}
          description={t.emptyNoStarsDescription}
          textured
          action={
            <Button variant="outline" onClick={() => document.querySelector<HTMLInputElement>(`input[placeholder="${t.usernamePlaceholder}"]`)?.focus()}>
              <RefreshCw className="h-4 w-4 mr-2" />{t.emptyNoStarsAction}
            </Button>
          }
        />
      ) : filteredStars.length === 0 ? (
        <EmptyState
          icon={Star}
          title={t.emptyNoMatchTitle}
          description={t.emptyNoMatchDescription}
        />
      ) : viewMode === "card" ? (
        <ItemGrid>
          {filteredStars.map((s) => (
            <ItemSurface key={s.id} inset selected={selectedIds.has(s.id)}>
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-1"
                    aria-label={t.selectAria(s.owner, s.repo)}
                  />
                  <div className="flex-1 min-w-0">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm tracking-tight hover:text-primary truncate block">
                      {s.owner}/{s.repo}
                    </a>
                  </div>
                  {s.language && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {s.language}
                    </Badge>
                  )}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {starDescriptionForLanguage(s, language) || t.noDescriptionText}
                </p>
                {starDescriptionEn(s) && (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80 line-clamp-2">
                    {t.enPrefix}: {starDescriptionEn(s)}
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
        </ItemGrid>
      ) : viewMode === "compact" ? (
        <ItemGrid columns="grid-cols-1 md:grid-cols-2">
          {filteredStars.map((s) => (
            <ItemSurface key={s.id} inset selected={selectedIds.has(s.id)} className="px-3 py-2.5">
              <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.has(s.id)}
                onChange={() => toggleSelect(s.id)}
                className="h-3.5 w-3.5"
                aria-label={t.selectAria(s.owner, s.repo)}
              />
              <div className="flex-1 min-w-0">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium tracking-tight hover:text-primary truncate block">
                  {s.owner}/{s.repo}
                </a>
              </div>
              {s.language && (
                <Badge variant="outline" className="text-[10px]">{s.language}</Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0 tabular-nums">
                <Star className="h-3 w-3" /> {s.stars.toLocaleString()}
              </span>
              </div>
            </ItemSurface>
          ))}
        </ItemGrid>
      ) : (
        <FeedList>
          {filteredStars.map((s) => (
            <FeedListItem key={s.id} selected={selectedIds.has(s.id)}>
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-1"
                    aria-label={t.selectAria(s.owner, s.repo)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-base font-medium tracking-tight hover:text-primary">
                          {s.owner}/{s.repo}
                        </a>
                        {hasStarDescription(s) && (
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                            {starDescriptionForLanguage(s, language)}
                          </p>
                        )}
                        {starDescriptionEn(s) && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground/75 line-clamp-2">
                            {t.enPrefix}: {starDescriptionEn(s)}
                          </p>
                        )}
                      </div>
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => handleDelete([s.id])}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3 tabular-nums">
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
              </div>
            </FeedListItem>
          ))}
        </FeedList>
      )}
    </div>
  );
}
