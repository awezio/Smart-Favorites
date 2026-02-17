"use client";

import { useState, useEffect } from "react";
import { Upload, Download, RefreshCw, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Bookmark } from "@/types";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const response = await fetch("/api/bookmarks?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setBookmarks(data.bookmarks || []);
      }
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const htmlContent = await file.text();
      const response = await fetch("/api/bookmarks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`同步完成！新增: ${data.summary.added}, 修改: ${data.summary.modified}, 删除: ${data.summary.removed}`);
        await loadBookmarks();
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("导入失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDiff = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
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
      }
    } catch (error) {
      console.error("Diff error:", error);
      alert("查新失败");
    } finally {
      setLoading(false);
    }
  };

  const generateDescription = async (bookmark: Bookmark) => {
    try {
      const response = await fetch("/api/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bookmark", item: bookmark }),
      });

      if (response.ok) {
        await loadBookmarks();
        alert("描述生成成功！");
      }
    } catch (error) {
      console.error("Generate description error:", error);
      alert("描述生成失败");
    }
  };

  const filteredBookmarks = bookmarks.filter((b) =>
    b.title.toLowerCase().includes(filter.toLowerCase()) ||
    b.url.toLowerCase().includes(filter.toLowerCase()) ||
    (b.description?.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">书签管理</h1>
        <p className="text-muted-foreground mt-2">管理您的浏览器书签</p>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            <label>
              <Button variant="outline" disabled={loading}>
                <Upload className="h-4 w-4 mr-2" />
                导入 HTML
              </Button>
              <input
                type="file"
                accept=".html"
                className="hidden"
                onChange={handleImport}
              />
            </label>

            <label>
              <Button variant="outline" disabled={loading}>
                <FileText className="h-4 w-4 mr-2" />
                查新
              </Button>
              <input
                type="file"
                accept=".html"
                className="hidden"
                onChange={handleDiff}
              />
            </label>

            <Button variant="outline" onClick={loadBookmarks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>

          <Input
            placeholder="搜索书签..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{bookmarks.length}</CardTitle>
            <CardDescription>总书签数</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {bookmarks.filter((b) => b.description).length}
            </CardTitle>
            <CardDescription>有描述</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {bookmarks.filter((b) => !b.description).length}
            </CardTitle>
            <CardDescription>无描述</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Bookmarks List */}
      <div className="space-y-4">
        {filteredBookmarks.map((bookmark) => (
          <Card key={bookmark.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{bookmark.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {bookmark.description || "暂无描述"}
                  </CardDescription>
                </div>
                {!bookmark.description && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateDescription(bookmark)}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    生成描述
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {bookmark.url}
              </a>
              {bookmark.folder_path && (
                <div className="mt-2">
                  <Badge variant="outline">{bookmark.folder_path}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
