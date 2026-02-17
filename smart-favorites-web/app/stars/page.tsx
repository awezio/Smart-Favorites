"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GitHubStar } from "@/types";

export default function StarsPage() {
  const [stars, setStars] = useState<GitHubStar[]>([]);
  const [filter, setFilter] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStars();
  }, []);

  const loadStars = async () => {
    try {
      const response = await fetch("/api/stars?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setStars(data.stars || []);
      }
    } catch (error) {
      console.error("Failed to load stars:", error);
    }
  };

  const handleSync = async () => {
    if (!username.trim()) {
      alert("请输入 GitHub 用户名");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stars/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, token: token || undefined }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`同步完成！新增: ${data.summary.added}, 修改: ${data.summary.modified}, 删除: ${data.summary.removed}`);
        await loadStars();
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      alert(`同步失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredStars = stars.filter((s) =>
    s.repo.toLowerCase().includes(filter.toLowerCase()) ||
    s.owner.toLowerCase().includes(filter.toLowerCase()) ||
    (s.description?.toLowerCase().includes(filter.toLowerCase())) ||
    (s.language?.toLowerCase().includes(filter.toLowerCase()))
  );

  const totalStars = stars.reduce((sum, s) => sum + s.stars, 0);
  const languages = [...new Set(stars.map((s) => s.language).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">GitHub Stars</h1>
        <p className="text-muted-foreground mt-2">管理您的 GitHub 标星项目</p>
      </div>

      {/* Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle>同步 Stars</CardTitle>
          <CardDescription>从 GitHub 同步您的标星项目</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>GitHub 用户名 *</Label>
              <Input
                placeholder="输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Label>GitHub Token (可选)</Label>
              <Input
                type="password"
                placeholder="提高 API 限制"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSync} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "同步中..." : "开始同步"}
          </Button>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="搜索项目..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{stars.length}</CardTitle>
            <CardDescription>总项目数</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{totalStars.toLocaleString()}</CardTitle>
            <CardDescription>总 Star 数</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{languages.length}</CardTitle>
            <CardDescription>编程语言</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Stars List */}
      <div className="space-y-4">
        {filteredStars.map((star) => (
          <Card key={star.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {star.owner}/{star.repo}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {star.description || "暂无描述"}
                  </CardDescription>
                </div>
                {star.language && (
                  <Badge variant="outline">{star.language}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <a
                href={star.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline block mb-2"
              >
                {star.url}
              </a>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>⭐ {star.stars.toLocaleString()}</span>
                <span>🔀 {star.forks.toLocaleString()}</span>
                <span>
                  更新: {new Date(star.updated).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
