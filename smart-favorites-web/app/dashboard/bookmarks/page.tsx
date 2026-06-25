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
  Trash2,
  Plus,
  Pencil,
  X,
  Check,
  ExternalLink,
  Loader2,
  Camera,
  Image as ImageIcon,
  Save,
  Bookmark as BookmarkIcon,
  Search,
  FolderOpen,
  FileCheck,
  FileX,
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
import type { Bookmark } from "@/types";
import {
  getExtensionInstallUrl,
  openExtensionSidePanel,
  pingInstalledExtension,
  triggerExtensionBookmarkSync,
} from "@/lib/extension/bridge";
import { type DashboardLanguage, useDashboardLanguage } from "@/lib/dashboard-language";

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

function bookmarkDescription(bookmark: Bookmark) {
  return bookmark.description_zh || bookmark.description || "";
}

function bookmarkDescriptionEn(bookmark: Bookmark) {
  return bookmark.description_en || "";
}

function bookmarkDescriptionFor(bookmark: Bookmark, language: DashboardLanguage) {
  return language === "zh"
    ? bookmark.description_zh || bookmark.description || bookmark.description_en || ""
    : bookmark.description_en || bookmark.description || bookmark.description_zh || "";
}

function hasBookmarkDescription(bookmark: Bookmark) {
  return Boolean(bookmarkDescription(bookmark).trim() || bookmarkDescriptionEn(bookmark).trim());
}

function bookmarkTags(bookmark: Bookmark) {
  return Array.isArray(bookmark.tags) ? bookmark.tags.filter(Boolean) : [];
}

function parseTagsInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，、\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 24)
    )
  );
}

function bookmarkSnapshotSrc(bookmark: Bookmark) {
  const snapshot_url = bookmark.snapshot_url;
  const snapshot_status = bookmark.snapshot_status;
  if (snapshot_url && snapshot_status === "ready") {
    return snapshot_url;
  }
  if (bookmark.snapshot_storage_path && snapshot_status === "ready") {
    return `/api/bookmarks/snapshot-page?id=${encodeURIComponent(bookmark.id)}`;
  }
  return "";
}

function snapshotLabel(bookmark: Bookmark, language: DashboardLanguage) {
  const status = bookmark.snapshot_status || "pending";
  if (language === "zh") {
    if (status === "ready") return "网站快照";
    if (status === "capturing") return "快照生成中";
    if (status === "failed") return "快照失败";
    if (status === "unavailable") return "快照不可用";
    return "暂无快照";
  }
  if (status === "ready") return "Website snapshot";
  if (status === "capturing") return "Capturing snapshot";
  if (status === "failed") return "Snapshot failed";
  if (status === "unavailable") return "Snapshot unavailable";
  return "No snapshot";
}

const pageCopy = {
  zh: {
    title: "书签管理",
    totalCount: (n: number) => `共 ${n} 个书签`,
    done: "完成",
    edit: "编辑",
    syncCardTitle: "浏览器扩展自动同步",
    syncCardDescription:
      "网页无法直接读取浏览器收藏夹。安装 Smart Favorites 扩展后，可在此一键同步；未安装时将引导你下载扩展。",
    oneClickSync: "一键同步",
    detectingExtension: "检测扩展中...",
    openExtension: (version: string | null) =>
      version ? `打开扩展 v${version}` : "打开扩展",
    installOrOpenExtension: "安装/打开扩展同步",
    importHtmlAlt: "备用：导入 HTML",
    importHtml: "导入 HTML",
    diff: "查新",
    refresh: "刷新",
    manualAdd: "手动添加",
    deleteCount: (n: number) => `删除 (${n})`,
    generateDescCount: (n: number) => `一键生成描述 (${n})`,
    generateDesc: "生成描述",
    searchPlaceholder: "搜索书签...",
    statusAll: "全部状态",
    statusHasDesc: "有描述",
    statusNoDesc: "无描述",
    folderAll: "全部文件夹",
    sortNewest: "最新添加",
    sortOldest: "最早添加",
    sortTitleAsc: "标题 A-Z",
    sortTitleDesc: "标题 Z-A",
    sortUrlAsc: "URL A-Z",
    selectAria: (title: string) => `选择 ${title}`,
    noDescription: "暂无描述",
    noDescBadgeTitle: "无描述",
    emptyNoBookmarksTitle: "还没有书签",
    emptyNoBookmarksDescription:
      "安装浏览器扩展可直接同步收藏夹；HTML 导入作为备用方式。",
    emptyNoMatchesTitle: "没有匹配的书签",
    emptyNoMatchesDescription: "试试调整搜索关键词或筛选条件",
    // Modal
    addModalTitle: "手动添加书签",
    fieldTitleRequired: "标题 *",
    fieldUrlRequired: "URL *",
    fieldDescription: "描述",
    fieldFolder: "文件夹",
    titlePlaceholder: "网站标题",
    descPlaceholder: "可选",
    folderPlaceholder: "/工具/开发",
    addBookmark: "添加书签",
    // Stats
    statTotal: "书签总数",
    statWithDesc: "有描述",
    coverageHint: (n: number) => `覆盖率 ${n}%`,
    statPendingDesc: "待补描述",
    statFolders: "文件夹",
    donutTitle: "描述覆盖率",
    donutCenterLabel: "总计",
    barsTitle: "各文件夹书签数 (Top 10)",
    folderUncategorized: "未分类",
    folderRoot: "根目录",
    descStatWith: "有描述",
    descStatWithout: "无描述",
    // Toasts
    openSidebarFailed: "无法打开扩展侧边栏，请从浏览器工具栏点击 Smart Favorites 图标。",
    syncingBookmarks: "正在同步浏览器书签...",
    extensionNotDetected: "未检测到 Smart Favorites 扩展，请先安装扩展。",
    syncFailedUnknown: "未知错误",
    syncFailed: "同步失败",
    syncFailedWith: (detail: string) => `同步失败：${detail}`,
    syncDone: (count: number) => `同步完成！共同步 ${count} 个变更项。`,
    importing: "正在导入书签...",
    importDone: (added: number, modified: number, removed: number) =>
      `同步完成！新增: ${added}, 修改: ${modified}, 删除: ${removed}`,
    importFailedWith: (detail: string) => `导入失败: ${detail}`,
    importFailed: "导入失败",
    analyzingDiff: "正在分析变更...",
    diffReportDownloaded: "变更报告已下载",
    diffFailed: "查新失败",
    generatingDesc: "正在生成描述...",
    descGenerated: "描述生成成功",
    descGenerateFailed: "描述生成失败",
    selectFirst: "请先选择要生成描述的书签",
    allHaveDesc: "所选书签均已有描述",
    confirmOverwriteDescriptions: (n: number) =>
      `所选书签中有 ${n} 条已有描述，确定用 AI 重新生成并覆盖吗？`,
    batchGenerating: (n: number) => `正在生成 ${n} 条描述...`,
    batchDone: (n: number) => `已为 ${n} 个书签生成描述`,
    batchPartial: (success: number, failed: number) => `完成：${success} 成功，${failed} 失败`,
    confirmDelete: (n: number) => `确定删除 ${n} 个书签？`,
    deleting: "正在删除...",
    deleted: (n: number) => `已删除 ${n} 个书签`,
    deleteFailed: "删除失败",
    titleUrlRequired: "标题和 URL 为必填项",
    adding: "正在添加...",
    added: "书签已添加",
    addFailed: "添加失败",
  },
  en: {
    title: "Bookmarks",
    totalCount: (n: number) => `${n} bookmarks`,
    done: "Done",
    edit: "Edit",
    syncCardTitle: "Browser extension auto-sync",
    syncCardDescription:
      "Web pages can't read the browser's favorites directly. Install the Smart Favorites extension to sync in one click; if not installed, you'll be guided to download it.",
    oneClickSync: "Sync",
    detectingExtension: "Detecting extension...",
    openExtension: (version: string | null) =>
      version ? `Open extension v${version}` : "Open extension",
    installOrOpenExtension: "Install/Open extension",
    importHtmlAlt: "Backup: Import HTML",
    importHtml: "Import HTML",
    diff: "Check for changes",
    refresh: "Refresh",
    manualAdd: "Add manually",
    deleteCount: (n: number) => `Delete (${n})`,
    generateDescCount: (n: number) => `Generate descriptions (${n})`,
    generateDesc: "Generate description",
    searchPlaceholder: "Search bookmarks...",
    statusAll: "All status",
    statusHasDesc: "Has description",
    statusNoDesc: "No description",
    folderAll: "All folders",
    sortNewest: "Newest",
    sortOldest: "Oldest",
    sortTitleAsc: "Title A-Z",
    sortTitleDesc: "Title Z-A",
    sortUrlAsc: "URL A-Z",
    selectAria: (title: string) => `Select ${title}`,
    noDescription: "No description",
    noDescBadgeTitle: "No description",
    emptyNoBookmarksTitle: "No bookmarks yet",
    emptyNoBookmarksDescription:
      "Install the browser extension to sync favorites directly; HTML import is a backup option.",
    emptyNoMatchesTitle: "No matching bookmarks",
    emptyNoMatchesDescription: "Try adjusting your search keywords or filters",
    addModalTitle: "Add bookmark manually",
    fieldTitleRequired: "Title *",
    fieldUrlRequired: "URL *",
    fieldDescription: "Description",
    fieldFolder: "Folder",
    titlePlaceholder: "Site title",
    descPlaceholder: "Optional",
    folderPlaceholder: "/Tools/Dev",
    addBookmark: "Add bookmark",
    statTotal: "Total bookmarks",
    statWithDesc: "With description",
    coverageHint: (n: number) => `Coverage ${n}%`,
    statPendingDesc: "Missing description",
    statFolders: "Folders",
    donutTitle: "Description coverage",
    donutCenterLabel: "Total",
    barsTitle: "Bookmarks per folder (Top 10)",
    folderUncategorized: "Uncategorized",
    folderRoot: "Root",
    descStatWith: "Has description",
    descStatWithout: "No description",
    openSidebarFailed:
      "Couldn't open the extension side panel. Click the Smart Favorites icon in the browser toolbar.",
    syncingBookmarks: "Syncing browser bookmarks...",
    extensionNotDetected: "Smart Favorites extension not detected. Please install it first.",
    syncFailedUnknown: "Unknown error",
    syncFailed: "Sync failed",
    syncFailedWith: (detail: string) => `Sync failed: ${detail}`,
    syncDone: (count: number) => `Sync complete! ${count} change(s) synced.`,
    importing: "Importing bookmarks...",
    importDone: (added: number, modified: number, removed: number) =>
      `Sync complete! Added: ${added}, Modified: ${modified}, Removed: ${removed}`,
    importFailedWith: (detail: string) => `Import failed: ${detail}`,
    importFailed: "Import failed",
    analyzingDiff: "Analyzing changes...",
    diffReportDownloaded: "Change report downloaded",
    diffFailed: "Check failed",
    generatingDesc: "Generating description...",
    descGenerated: "Description generated",
    descGenerateFailed: "Failed to generate description",
    selectFirst: "Please select bookmarks to generate descriptions for first.",
    allHaveDesc: "All selected bookmarks already have descriptions.",
    confirmOverwriteDescriptions: (n: number) =>
      `${n} selected bookmark(s) already have descriptions. Regenerate with AI and overwrite them?`,
    batchGenerating: (n: number) => `Generating ${n} description(s)...`,
    batchDone: (n: number) => `Generated descriptions for ${n} bookmark(s)`,
    batchPartial: (success: number, failed: number) =>
      `Done: ${success} succeeded, ${failed} failed`,
    confirmDelete: (n: number) => `Delete ${n} bookmark(s)?`,
    deleting: "Deleting...",
    deleted: (n: number) => `Deleted ${n} bookmark(s)`,
    deleteFailed: "Delete failed",
    titleUrlRequired: "Title and URL are required",
    adding: "Adding...",
    added: "Bookmark added",
    addFailed: "Failed to add",
  },
} as const;

export default function BookmarksPage() {
  const [language] = useDashboardLanguage();
  const t = pageCopy[language];
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
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [extensionId, setExtensionId] = useState<string | null>(null);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);
  const [checkingExtension, setCheckingExtension] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  // Add form
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDescZh, setNewDescZh] = useState("");
  const [newDescEn, setNewDescEn] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editDescZh, setEditDescZh] = useState("");
  const [editDescEn, setEditDescEn] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [capturingSnapshotId, setCapturingSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    loadBookmarks();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function detectExtension() {
      setCheckingExtension(true);
      try {
        const detected = await pingInstalledExtension();
        if (cancelled) {
          return;
        }

        setExtensionId(detected?.extensionId ?? null);
        setExtensionVersion(detected?.version ?? null);
      } catch {
        if (cancelled) {
          return;
        }

        setExtensionId(null);
        setExtensionVersion(null);
      } finally {
        if (!cancelled) {
          setCheckingExtension(false);
        }
      }
    }

    detectExtension();
    return () => {
      cancelled = true;
    };
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
    window.open(getExtensionInstallUrl(), "_blank", "noopener,noreferrer");
  };

  const handleOpenExtension = async () => {
    if (!extensionId) {
      openExtensionGuide();
      return;
    }

    const opened = await openExtensionSidePanel(extensionId);
    if (!opened) {
      toast.error(t.openSidebarFailed);
    }
  };

  const handleOneClickSync = async () => {
    setLoading(true);
    toast.loading(t.syncingBookmarks, { id: "bookmark-sync" });

    try {
      if (!extensionId) {
        toast.error(t.extensionNotDetected, {
          id: "bookmark-sync",
        });
        openExtensionGuide();
        return;
      }

      const result = await triggerExtensionBookmarkSync(extensionId);

      if (!result.success) {
        toast.error(t.syncFailedWith(result.error || t.syncFailedUnknown), { id: "bookmark-sync" });
        await openExtensionSidePanel(extensionId);
        return;
      }

      await loadBookmarks();
      toast.success(
        t.syncDone(result.count ?? 0),
        { id: "bookmark-sync" }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.syncFailed;
      toast.error(t.syncFailedWith(message), { id: "bookmark-sync" });
    } finally {
      setLoading(false);
    }
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
      const f = b.folder_path || t.folderUncategorized;
      map.set(f, (map.get(f) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({
        name: name === "/" ? t.folderRoot : name.replace(/^\/|\/$/g, "").split("/").pop() || name,
        value,
      }));
  }, [bookmarks, t.folderUncategorized, t.folderRoot]);

  const descStats = useMemo(() => {
    const withDesc = bookmarks.filter(hasBookmarkDescription).length;
    const withoutDesc = bookmarks.length - withDesc;
    return [
      { name: t.descStatWith, value: withDesc },
      { name: t.descStatWithout, value: withoutDesc },
    ];
  }, [bookmarks, t.descStatWith, t.descStatWithout]);

  const descCoverage = useMemo(() => {
    if (bookmarks.length === 0) return 0;
    return Math.round(
      (bookmarks.filter(hasBookmarkDescription).length / bookmarks.length) * 100
    );
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
          bookmarkDescription(b).toLowerCase().includes(q) ||
          bookmarkDescriptionEn(b).toLowerCase().includes(q) ||
          bookmarkTags(b).some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (filterStatus === "has_desc") {
      result = result.filter(hasBookmarkDescription);
    } else if (filterStatus === "no_desc") {
      result = result.filter((b) => !hasBookmarkDescription(b));
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
    toast.loading(t.importing, { id: "import" });
    try {
      const htmlContent = await file.text();
      const response = await fetch("/api/bookmarks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(t.importDone(data.summary.added, data.summary.modified, data.summary.removed), { id: "import" });
        await loadBookmarks();
      } else {
        const err = await response.json();
        toast.error(t.importFailedWith(err.error || t.syncFailedUnknown), { id: "import" });
      }
    } catch {
      toast.error(t.importFailed, { id: "import" });
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleDiff = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    toast.loading(t.analyzingDiff, { id: "diff" });
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
        toast.success(t.diffReportDownloaded, { id: "diff" });
      } else {
        toast.error(t.diffFailed, { id: "diff" });
      }
    } catch {
      toast.error(t.diffFailed, { id: "diff" });
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const generateDescription = async (bookmark: Bookmark) => {
    toast.loading(t.generatingDesc, { id: `desc-${bookmark.id}` });
    try {
      const response = await fetch("/api/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bookmark", item: bookmark }),
      });
      if (response.ok) {
        await loadBookmarks();
        toast.success(t.descGenerated, { id: `desc-${bookmark.id}` });
      } else {
        toast.error(t.descGenerateFailed, { id: `desc-${bookmark.id}` });
      }
    } catch {
      toast.error(t.descGenerateFailed, { id: `desc-${bookmark.id}` });
    }
  };

  const openBookmarkEditor = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditDescZh(bookmark.description_zh || bookmark.description || "");
    setEditDescEn(bookmark.description_en || "");
    setEditTags(bookmarkTags(bookmark).join(", "));
    setEditFolder(bookmark.folder_path || "");
  };

  const handleSaveBookmark = async () => {
    if (!editingBookmark) return;
    if (!editTitle.trim() || !editUrl.trim()) {
      toast.error(t.titleUrlRequired);
      return;
    }

    setSavingBookmark(true);
    toast.loading(language === "zh" ? "正在保存书签..." : "Saving bookmark...", {
      id: "bookmark-save",
    });
    try {
      const response = await fetch("/api/bookmarks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBookmark.id,
          title: editTitle.trim(),
          url: editUrl.trim(),
          description: editDescZh.trim(),
          description_zh: editDescZh.trim(),
          description_en: editDescEn.trim(),
          tags: parseTagsInput(editTags),
          folder_path: editFolder.trim() || "/",
        }),
      });

      if (response.ok) {
        toast.success(language === "zh" ? "书签已保存" : "Bookmark saved", {
          id: "bookmark-save",
        });
        setEditingBookmark(null);
        await loadBookmarks();
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || (language === "zh" ? "保存失败" : "Save failed"), {
          id: "bookmark-save",
        });
      }
    } catch {
      toast.error(language === "zh" ? "保存失败" : "Save failed", { id: "bookmark-save" });
    } finally {
      setSavingBookmark(false);
    }
  };

  const captureSnapshot = async (bookmark: Bookmark) => {
    setCapturingSnapshotId(bookmark.id);
    toast.loading(language === "zh" ? "正在生成网站快照..." : "Capturing website snapshot...", {
      id: `snapshot-${bookmark.id}`,
    });
    try {
      const response = await fetch("/api/bookmarks/snapshot-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookmark.id }),
      });
      const data = await response.json().catch(() => ({}));
      await loadBookmarks();

      if (response.ok && data.snapshot_status === "ready") {
        toast.success(language === "zh" ? "网站快照已保存" : "Website snapshot saved", {
          id: `snapshot-${bookmark.id}`,
        });
      } else {
        toast.error(
          data.snapshot_error ||
            (language === "zh" ? "当前环境无法生成快照" : "Snapshot capture is unavailable"),
          { id: `snapshot-${bookmark.id}` }
        );
      }
    } catch {
      toast.error(language === "zh" ? "快照生成失败" : "Snapshot capture failed", {
        id: `snapshot-${bookmark.id}`,
      });
    } finally {
      setCapturingSnapshotId(null);
    }
  };

  const batchGenerateDescriptions = async () => {
    const selected = filteredBookmarks.filter((bookmark) =>
      selectedIds.has(bookmark.id)
    );
    if (selected.length === 0) {
      toast.error(t.selectFirst);
      return;
    }

    const existingDescriptionCount = selected.filter(hasBookmarkDescription).length;
    if (
      existingDescriptionCount > 0 &&
      !confirm(t.confirmOverwriteDescriptions(existingDescriptionCount))
    ) {
      return;
    }
    const targets = selected;

    setGeneratingBatch(true);
    toast.loading(t.batchGenerating(targets.length), { id: "batch-desc" });
    let success = 0;
    let failed = 0;

    for (const bookmark of targets) {
      try {
        const response = await fetch("/api/ai/describe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "bookmark", item: bookmark }),
        });
        if (response.ok) {
          success += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }

    await loadBookmarks();
    setGeneratingBatch(false);
    setSelectedIds(new Set());

    if (failed === 0) {
      toast.success(t.batchDone(success), { id: "batch-desc" });
    } else {
      toast.error(t.batchPartial(success, failed), { id: "batch-desc" });
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(t.confirmDelete(ids.length))) return;
    toast.loading(t.deleting, { id: "delete" });
    try {
      const response = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (response.ok) {
        toast.success(t.deleted(ids.length), { id: "delete" });
        setSelectedIds(new Set());
        await loadBookmarks();
      } else {
        toast.error(t.deleteFailed, { id: "delete" });
      }
    } catch {
      toast.error(t.deleteFailed, { id: "delete" });
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.error(t.titleUrlRequired);
      return;
    }
    toast.loading(t.adding, { id: "add" });
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          url: newUrl,
          description: newDescZh || undefined,
          description_zh: newDescZh || undefined,
          description_en: newDescEn || undefined,
          tags: parseTagsInput(newTags),
          folder_path: newFolder || "/",
        }),
      });
      if (response.ok) {
        toast.success(t.added, { id: "add" });
        setShowAddModal(false);
        setNewTitle("");
        setNewUrl("");
        setNewDescZh("");
        setNewDescEn("");
        setNewTags("");
        setNewFolder("");
        await loadBookmarks();
      } else {
        toast.error(t.addFailed, { id: "add" });
      }
    } catch {
      toast.error(t.addFailed, { id: "add" });
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

  const renderBookmarkTags = (bookmark: Bookmark) => {
    const tags = bookmarkTags(bookmark);
    if (tags.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="rounded-lg text-[10px]">
            #{tag}
          </Badge>
        ))}
      </div>
    );
  };

  const renderSnapshotPreview = (bookmark: Bookmark) => {
    const src = bookmarkSnapshotSrc(bookmark);
    const isCapturing = capturingSnapshotId === bookmark.id;

    return (
      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-2 sm:max-w-sm">
        {src ? (
          <a href={src} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={snapshotLabel(bookmark, language)}
              className="h-24 w-full rounded-md border object-cover"
            />
          </a>
        ) : (
          <div className="flex h-16 items-center gap-2 rounded-md border border-dashed px-3 text-xs text-muted-foreground">
            <ImageIcon className="h-4 w-4 shrink-0" />
            <span>{snapshotLabel(bookmark, language)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-muted-foreground">
            {snapshotLabel(bookmark, language)}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-lg text-xs"
            disabled={isCapturing}
            onClick={() => captureSnapshot(bookmark)}
          >
            {isCapturing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Camera className="h-3 w-3 mr-1" />
            )}
            {language === "zh" ? "快照" : "Snapshot"}
          </Button>
        </div>
      </div>
    );
  };

  if (initialLoading && bookmarks.length === 0) {
    return <BookmarkListSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.totalCount(bookmarks.length)}
          </p>
        </div>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <><Check className="h-4 w-4 mr-1" />{t.done}</>
          ) : (
            <><Pencil className="h-4 w-4 mr-1" />{t.edit}</>
          )}
        </Button>
      </div>

      <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base tracking-tight">{t.syncCardTitle}</CardTitle>
          <CardDescription>
            {t.syncCardDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleOneClickSync}
            disabled={loading || checkingExtension}
            className="rounded-xl"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t.oneClickSync}
          </Button>

          <Button
            variant={extensionId ? "secondary" : "default"}
            onClick={extensionId ? handleOpenExtension : openExtensionGuide}
            className="rounded-xl"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {checkingExtension
              ? t.detectingExtension
              : extensionId
                ? t.openExtension(extensionVersion)
                : t.installOrOpenExtension}
          </Button>

          <label>
            <Button variant="outline" disabled={loading} asChild className="rounded-xl">
              <span><Upload className="h-4 w-4 mr-2" />{t.importHtmlAlt}</span>
            </Button>
            <input type="file" accept=".html" className="hidden" onChange={handleImport} />
          </label>
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      {bookmarks.length > 0 && (
        <StatsOverview
          metrics={[
            {
              label: t.statTotal,
              value: bookmarks.length,
              icon: BookmarkIcon,
              accent: "primary",
            },
            {
              label: t.statWithDesc,
              value: descStats[0]?.value ?? 0,
              hint: t.coverageHint(descCoverage),
              icon: FileCheck,
              accent: "sky",
            },
            {
              label: t.statPendingDesc,
              value: descStats[1]?.value ?? 0,
              icon: FileX,
              accent: "blue",
            },
            {
              label: t.statFolders,
              value: folders.length,
              icon: FolderOpen,
              accent: "cyan",
            },
          ]}
          donut={{
            title: t.donutTitle,
            data: descStats.filter((item) => item.value > 0),
            centerLabel: t.donutCenterLabel,
            centerValue: `${descCoverage}%`,
          }}
          bars={{
            title: t.barsTitle,
            data: folderStats,
            layout: "horizontal",
          }}
        />
      )}

      {/* Toolbar */}
      <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleOneClickSync}
              disabled={loading || checkingExtension}
              className="rounded-xl"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {t.oneClickSync}
            </Button>

            <Button
              variant="outline"
              onClick={extensionId ? handleOpenExtension : openExtensionGuide}
              className="rounded-xl"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {t.syncCardTitle}
            </Button>

            <label>
              <Button variant="outline" disabled={loading} asChild className="rounded-xl">
                <span><Upload className="h-4 w-4 mr-2" />{t.importHtml}</span>
              </Button>
              <input type="file" accept=".html" className="hidden" onChange={handleImport} />
            </label>

            <label>
              <Button variant="outline" disabled={loading} asChild className="rounded-xl">
                <span><FileText className="h-4 w-4 mr-2" />{t.diff}</span>
              </Button>
              <input type="file" accept=".html" className="hidden" onChange={handleDiff} />
            </label>

            <Button variant="outline" onClick={loadBookmarks} className="rounded-xl">
              <RefreshCw className="h-4 w-4 mr-2" />{t.refresh}
            </Button>

            {isEditing && (
              <Button onClick={() => setShowAddModal(true)} className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />{t.manualAdd}
              </Button>
            )}

            {isEditing && selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl"
                onClick={() => handleDelete(Array.from(selectedIds))}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t.deleteCount(selectedIds.size)}
              </Button>
            )}
          </div>

          <FilterToolbar
            searchPlaceholder={t.searchPlaceholder}
            searchValue={filter}
            onSearchChange={setFilter}
            showSelectAll={filteredBookmarks.length > 0}
            allSelected={
              selectedIds.size === filteredBookmarks.length &&
              filteredBookmarks.length > 0
            }
            onToggleSelectAll={toggleSelectAll}
            selectedCount={selectedIds.size}
            selects={[
              {
                id: "status",
                value: filterStatus,
                onChange: (value) => setFilterStatus(value as FilterStatus),
                options: [
                  { value: "all", label: t.statusAll },
                  { value: "has_desc", label: t.statusHasDesc },
                  { value: "no_desc", label: t.statusNoDesc },
                ],
              },
              {
                id: "folder",
                value: filterFolder,
                onChange: setFilterFolder,
                className: "max-w-[220px]",
                options: [
                  { value: "all", label: t.folderAll },
                  ...folders.map((folder) => ({ value: folder, label: folder })),
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
                  { value: "created_at-desc", label: t.sortNewest },
                  { value: "created_at-asc", label: t.sortOldest },
                  { value: "title-asc", label: t.sortTitleAsc },
                  { value: "title-desc", label: t.sortTitleDesc },
                  { value: "url-asc", label: t.sortUrlAsc },
                ],
              },
            ]}
            actions={
              selectedIds.size > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={generatingBatch}
                  onClick={batchGenerateDescriptions}
                  className="h-10 rounded-xl"
                >
                  {generatingBatch ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  {t.generateDescCount(selectedIds.size)}
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
        </CardContent>
      </Card>

      {/* Bookmarks Display */}
      {filteredBookmarks.length === 0 && bookmarks.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title={t.emptyNoBookmarksTitle}
          description={t.emptyNoBookmarksDescription}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={openExtensionGuide}>
                <ExternalLink className="h-4 w-4 mr-2" />{t.syncCardTitle}
              </Button>
              <label>
                <Button variant="outline" asChild>
                  <span><Upload className="h-4 w-4 mr-2" />{t.importHtml}</span>
                </Button>
                <input type="file" accept=".html" className="hidden" onChange={handleImport} />
              </label>
            </div>
          }
        />
      ) : filteredBookmarks.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t.emptyNoMatchesTitle}
          description={t.emptyNoMatchesDescription}
        />
      ) : viewMode === "card" ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((b) => (
            <ItemSurface key={b.id} selected={selectedIds.has(b.id)}>
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedIds.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                    className="mt-1"
                    aria-label={t.selectAria(b.title)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate tracking-tight">{b.title}</p>
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary/90 hover:text-primary truncate block mt-1"
                    >
                      {new URL(b.url).hostname}
                    </a>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {bookmarkDescriptionFor(b, language) || t.noDescription}
                </p>
                {language === "zh" && bookmarkDescriptionEn(b) && (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80 line-clamp-2">
                    EN: {bookmarkDescriptionEn(b)}
                  </p>
                )}
                {b.folder_path && b.folder_path !== "/" && (
                  <Badge variant="outline" className="mt-2 rounded-lg text-[10px]">
                    {b.folder_path}
                  </Badge>
                )}
                {renderBookmarkTags(b)}
                {renderSnapshotPreview(b)}
                <div className="flex gap-1 mt-3">
                  {!hasBookmarkDescription(b) && (
                    <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs" onClick={() => generateDescription(b)}>
                      <Sparkles className="h-3 w-3 mr-1" />AI
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-lg text-xs"
                    aria-label={language === "zh" ? "编辑描述" : "Edit description"}
                    onClick={() => openBookmarkEditor(b)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {isEditing && (
                    <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs" onClick={() => handleDelete([b.id])}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </ItemSurface>
          ))}
        </div>
      ) : viewMode === "compact" ? (
        /* Compact multi-column */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredBookmarks.map((b) => (
            <ItemSurface
              key={b.id}
              selected={selectedIds.has(b.id)}
              className="px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.has(b.id)}
                onChange={() => toggleSelect(b.id)}
                className="h-3.5 w-3.5"
                aria-label={t.selectAria(b.title)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate tracking-tight">{b.title}</span>
                  {!hasBookmarkDescription(b) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title={t.noDescBadgeTitle} />
                  )}
                </div>
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate block">
                  {b.url}
                </a>
                {bookmarkTags(b).length > 0 && (
                  <div className="mt-1 truncate text-[11px] text-muted-foreground">
                    {bookmarkTags(b).map((tag) => `#${tag}`).join(" ")}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 rounded-lg p-0"
                aria-label={language === "zh" ? "编辑描述" : "Edit description"}
                onClick={() => openBookmarkEditor(b)}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <a href={b.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
              </div>
            </ItemSurface>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredBookmarks.map((b) => (
            <ItemSurface key={b.id} selected={selectedIds.has(b.id)}>
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                    className="mt-1"
                    aria-label={t.selectAria(b.title)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-medium truncate tracking-tight">
                          {b.title}
                        </p>
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary/90 hover:text-primary truncate block mt-0.5"
                        >
                          {b.url}
                        </a>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!hasBookmarkDescription(b) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl text-xs"
                            onClick={() => generateDescription(b)}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {t.generateDesc}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl p-0"
                          aria-label={language === "zh" ? "编辑描述" : "Edit description"}
                          onClick={() => openBookmarkEditor(b)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        {isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl p-0"
                            onClick={() => handleDelete([b.id])}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {hasBookmarkDescription(b) && (
                      <p className="text-sm leading-relaxed text-muted-foreground mt-2 line-clamp-2">
                        {bookmarkDescriptionFor(b, language)}
                      </p>
                    )}
                    {language === "zh" && bookmarkDescriptionEn(b) && (
                      <p className="text-xs leading-relaxed text-muted-foreground/75 mt-1 line-clamp-2">
                        EN: {bookmarkDescriptionEn(b)}
                      </p>
                    )}
                    {b.folder_path && b.folder_path !== "/" && (
                      <Badge variant="outline" className="mt-2 rounded-lg text-xs">
                        {b.folder_path}
                      </Badge>
                    )}
                    {renderBookmarkTags(b)}
                    {renderSnapshotPreview(b)}
                  </div>
                </div>
              </div>
            </ItemSurface>
          ))}
        </div>
      )}

      {/* Add Bookmark Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t.addModalTitle}</CardTitle>
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
                <Label>{t.fieldTitleRequired}</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t.titlePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.fieldUrlRequired}</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "zh" ? "中文描述" : "Chinese description"}</Label>
                <Input
                  value={newDescZh}
                  onChange={(e) => setNewDescZh(e.target.value)}
                  placeholder={t.descPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "zh" ? "英文描述" : "English description"}</Label>
                <Input
                  value={newDescEn}
                  onChange={(e) => setNewDescEn(e.target.value)}
                  placeholder="Optional English summary"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "zh" ? "标签" : "Tags"}</Label>
                <Input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder={language === "zh" ? "用逗号分隔，例如 AI, 工具" : "Comma-separated, e.g. AI, tools"}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.fieldFolder}</Label>
                <Input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder={t.folderPlaceholder}
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t.addBookmark}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {editingBookmark && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{language === "zh" ? "编辑书签" : "Edit bookmark"}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingBookmark(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.fieldTitleRequired}</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.fieldUrlRequired}</Label>
                <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{language === "zh" ? "中文描述" : "Chinese description"}</Label>
                <Input
                  value={editDescZh}
                  onChange={(e) => setEditDescZh(e.target.value)}
                  placeholder={language === "zh" ? "中文摘要" : "Chinese summary"}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{language === "zh" ? "英文描述" : "English description"}</Label>
                <Input
                  value={editDescEn}
                  onChange={(e) => setEditDescEn(e.target.value)}
                  placeholder="English summary"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "zh" ? "标签" : "Tags"}</Label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder={language === "zh" ? "用逗号分隔" : "Comma-separated"}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.fieldFolder}</Label>
                <Input
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  placeholder={t.folderPlaceholder}
                />
              </div>
              <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingBookmark(null)}>
                  {language === "zh" ? "取消" : "Cancel"}
                </Button>
                <Button onClick={handleSaveBookmark} disabled={savingBookmark}>
                  {savingBookmark ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {language === "zh" ? "保存" : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
