"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Upload,
  RefreshCw,
  Sparkles,
  FileText,
  LayoutGrid,
  LayoutList,
  Columns3,
  ChevronDown,
  Trash2,
  Plus,
  Pencil,
  X,
  Check,
  ExternalLink,
  Loader2,
  Bookmark as BookmarkIcon,
  Search,
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
import type { Bookmark } from "@/types";

function BookmarkListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Toolbar skeleton */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
            <div className="flex border rounded-md ml-auto">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookmark card skeletons */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="py-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1 rounded shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-5 w-[60%]" />
                      <Skeleton className="h-4 w-[40%]" />
                    </div>
                    <Skeleton className="h-7 w-20 shrink-0 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-5 w-24 rounded-full" />
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
type SortKey = "title" | "created_at" | "url";
type FilterStatus = "all" | "has_desc" | "no_desc";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Filter & Sort
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterFolder, setFilterFolder] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Edit mode: when true, show checkboxes, add, delete
  const [isEditing, setIsEditing] = useState(false);

  // Batch operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  // Add form
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFolder, setNewFolder] = useState("");

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const response = await fetch("/api/bookmarks?limit=5000");
      if (response.ok) {
        const data = await response.json();
        setBookmarks(data.bookmarks || []);
      }
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const openExtensionGuide = () => {
    window.open(
      "https://github.com/nichuanfang/Smart-Favorites/tree/main/extension",
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* ── Computed data ── */
  const folders = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach((b) => {
      if (b.folder_path && b.folder_path !== "/") set.add(b.folder_path);
    });
    return Array.from(set).sort();
  }, [bookmarks]);

  const folderStats = useMemo(() => {
    const map = new Map<string, number>();
    bookmarks.forEach((b) => {
      const f = b.folder_path || "未分类";
      map.set(f, (map.get(f) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({
        name: name === "/" ? "根目录" : name.replace(/^\/|\/$/g, "").split("/").pop() || name,
        value,
      }));
  }, [bookmarks]);

  const descStats = useMemo(() => {
    const withDesc = bookmarks.filter((b) => b.description).length;
    const withoutDesc = bookmarks.length - withDesc;
    return [
      { name: "有描述", value: withDesc },
      { name: "无描述", value: withoutDesc },
    ];
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    let result = [...bookmarks];

    // Text filter
    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filterStatus === "has_desc") {
      result = result.filter((b) => b.description);
    } else if (filterStatus === "no_desc") {
      result = result.filter((b) => !b.description);
    }

    // Folder filter
    if (filterFolder !== "all") {
      result = result.filter((b) => b.folder_path === filterFolder);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "url") cmp = a.url.localeCompare(b.url);
      else cmp = (a.created_at || "").localeCompare(b.created_at || "");
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [bookmarks, filter, filterStatus, filterFolder, sortKey, sortAsc]);

  /* ── Actions ── */
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    toast.loading("正在导入书签...", { id: "import" });
    try {
      const htmlContent = await file.text();
      const response = await fetch("/api/bookmarks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`同步完成！新增: ${data.summary.added}, 修改: ${data.summary.modified}, 删除: ${data.summary.removed}`, { id: "import" });
        await loadBookmarks();
      } else {
        const err = await response.json();
        toast.error(`导入失败: ${err.error || "未知错误"}`, { id: "import" });
      }
    } catch {
      toast.error("导入失败", { id: "import" });
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleDiff = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    toast.loading("正在分析变更...", { id: "diff" });
    try {
      const htmlContent = await file.text();
      const response = await fetch("/api/bookmarks/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent, format: "markdown" }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bookmarks_diff_${new Date().toISOString().split("T")[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("变更报告已下载", { id: "diff" });
      } else {
        toast.error("查新失败", { id: "diff" });
      }
    } catch {
      toast.error("查新失败", { id: "diff" });
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const generateDescription = async (bookmark: Bookmark) => {
    toast.loading("正在生成描述...", { id: `desc-${bookmark.id}` });
    try {
      const response = await fetch("/api/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bookmark", item: bookmark }),
      });
      if (response.ok) {
        await loadBookmarks();
        toast.success("描述生成成功", { id: `desc-${bookmark.id}` });
      } else {
        toast.error("描述生成失败", { id: `desc-${bookmark.id}` });
      }
    } catch {
      toast.error("描述生成失败", { id: `desc-${bookmark.id}` });
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`确定删除 ${ids.length} 个书签？`)) return;
    toast.loading("正在删除...", { id: "delete" });
    try {
      const response = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (response.ok) {
        toast.success(`已删除 ${ids.length} 个书签`, { id: "delete" });
        setSelectedIds(new Set());
        await loadBookmarks();
      } else {
        toast.error("删除失败", { id: "delete" });
      }
    } catch {
      toast.error("删除失败", { id: "delete" });
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.error("标题和 URL 为必填项");
      return;
    }
    toast.loading("正在添加...", { id: "add" });
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          url: newUrl,
          description: newDesc || undefined,
          folder_path: newFolder || "/",
        }),
      });
      if (response.ok) {
        toast.success("书签已添加", { id: "add" });
        setShowAddModal(false);
        setNewTitle("");
        setNewUrl("");
        setNewDesc("");
        setNewFolder("");
        await loadBookmarks();
      } else {
        toast.error("添加失败", { id: "add" });
      }
    } catch {
      toast.error("添加失败", { id: "add" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBookmarks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBookmarks.map((b) => b.id)));
    }
  };

  if (initialLoading && bookmarks.length === 0) {
    return <BookmarkListSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">书签管理</h1>
          <p className="text-muted-foreground mt-1">
            共 {bookmarks.length} 个书签
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">浏览器扩展自动同步</CardTitle>
          <CardDescription>
            网页无法直接读取浏览器收藏夹。安装 Smart Favorites 浏览器扩展后，扩展会通过浏览器授权的 bookmarks API 读取收藏夹，并支持手动或自动同步。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={openExtensionGuide}>
            <ExternalLink className="h-4 w-4 mr-2" />
            安装/打开扩展同步
          </Button>
          <label>
            <Button variant="outline" disabled={loading} asChild>
              <span><Upload className="h-4 w-4 mr-2" />备用：导入 HTML</span>
            </Button>
            <input type="file" accept=".html" className="hidden" onChange={handleImport} />
          </label>
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      {bookmarks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">描述覆盖率</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={descStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {descStats.map((_, idx) => (
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
              <CardTitle className="text-sm">各文件夹书签数 (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={folderStats} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={openExtensionGuide}>
              <ExternalLink className="h-4 w-4 mr-2" />浏览器扩展自动同步
            </Button>

            <label>
              <Button variant="outline" disabled={loading} asChild>
                <span><Upload className="h-4 w-4 mr-2" />导入 HTML</span>
              </Button>
              <input type="file" accept=".html" className="hidden" onChange={handleImport} />
            </label>

            <label>
              <Button variant="outline" disabled={loading} asChild>
                <span><FileText className="h-4 w-4 mr-2" />查新</span>
              </Button>
              <input type="file" accept=".html" className="hidden" onChange={handleDiff} />
            </label>

            <Button variant="outline" onClick={loadBookmarks}>
              <RefreshCw className="h-4 w-4 mr-2" />刷新
            </Button>

            {isEditing && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />手动添加
              </Button>
            )}

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
          </div>

          {/* Filter Row */}
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              placeholder="搜索书签..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">全部状态</option>
              <option value="has_desc">有描述</option>
              <option value="no_desc">无描述</option>
            </select>

            <select
              value={filterFolder}
              onChange={(e) => setFilterFolder(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm max-w-[200px]"
            >
              <option value="all">全部文件夹</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
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
              <option value="created_at-desc">最新添加</option>
              <option value="created_at-asc">最早添加</option>
              <option value="title-asc">标题 A-Z</option>
              <option value="title-desc">标题 Z-A</option>
              <option value="url-asc">URL A-Z</option>
            </select>

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

          {/* Select all */}
          {isEditing && filteredBookmarks.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredBookmarks.length && filteredBookmarks.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded"
              />
              <span>
                {selectedIds.size > 0
                  ? `已选 ${selectedIds.size} / ${filteredBookmarks.length}`
                  : `${filteredBookmarks.length} 个书签`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookmarks Display */}
      {filteredBookmarks.length === 0 && bookmarks.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="还没有书签"
          description="安装浏览器扩展可直接同步收藏夹；HTML 导入作为备用方式。"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={openExtensionGuide}>
                <ExternalLink className="h-4 w-4 mr-2" />浏览器扩展自动同步
              </Button>
              <label>
                <Button variant="outline" asChild>
                  <span><Upload className="h-4 w-4 mr-2" />导入 HTML</span>
                </Button>
                <input type="file" accept=".html" className="hidden" onChange={handleImport} />
              </label>
            </div>
          }
        />
      ) : filteredBookmarks.length === 0 ? (
        <EmptyState
          icon={Search}
          title="没有匹配的书签"
          description="试试调整搜索关键词或筛选条件"
        />
      ) : viewMode === "card" ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((b) => (
            <Card
              key={b.id}
              className={`transition-all duration-200 hover:shadow-md hover:border-primary/20 ${
                isEditing && selectedIds.has(b.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  {isEditing && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(b.id)}
                      onChange={() => toggleSelect(b.id)}
                      className="mt-1 h-4 w-4 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">{b.title}</CardTitle>
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block mt-1"
                    >
                      {new URL(b.url).hostname}
                    </a>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {b.description || "暂无描述"}
                </p>
                {b.folder_path && b.folder_path !== "/" && (
                  <Badge variant="outline" className="text-[10px] mt-2">
                    {b.folder_path}
                  </Badge>
                )}
                <div className="flex gap-1 mt-2">
                  {!b.description && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => generateDescription(b)}>
                      <Sparkles className="h-3 w-3 mr-1" />AI
                    </Button>
                  )}
                  {isEditing && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleDelete([b.id])}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === "compact" ? (
        /* Compact multi-column */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredBookmarks.map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-colors hover:bg-accent ${
                isEditing && selectedIds.has(b.id) ? "bg-primary/5 border-primary" : ""
              }`}
            >
              {isEditing && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(b.id)}
                  onChange={() => toggleSelect(b.id)}
                  className="h-3.5 w-3.5 rounded shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{b.title}</span>
                  {!b.description && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="无描述" />
                  )}
                </div>
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate block">
                  {b.url}
                </a>
              </div>
              <a href={b.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredBookmarks.map((b) => (
            <Card
              key={b.id}
              className={`transition-all duration-200 hover:shadow-md hover:border-primary/20 ${
                isEditing && selectedIds.has(b.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="py-3">
                <div className="flex items-start gap-3">
                  {isEditing && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(b.id)}
                      onChange={() => toggleSelect(b.id)}
                      className="mt-1 h-4 w-4 rounded shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {b.title}
                        </CardTitle>
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate block mt-0.5"
                        >
                          {b.url}
                        </a>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!b.description && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => generateDescription(b)}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            生成描述
                          </Button>
                        )}
                        {isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDelete([b.id])}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {b.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {b.description}
                      </p>
                    )}
                    {b.folder_path && b.folder_path !== "/" && (
                      <Badge variant="outline" className="text-xs mt-1.5">
                        {b.folder_path}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Add Bookmark Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>手动添加书签</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>标题 *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="网站标题"
                />
              </div>
              <div className="space-y-2">
                <Label>URL *</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="可选"
                />
              </div>
              <div className="space-y-2">
                <Label>文件夹</Label>
                <Input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="/工具/开发"
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                添加书签
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
