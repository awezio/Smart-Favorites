"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<"all" | "bookmarks" | "stars">("all");

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type: searchType, topK: 10 }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">智能搜索</h1>
        <p className="text-muted-foreground mt-2">
          使用 AI 语义搜索查找您的收藏内容
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="输入关键词或自然语言问题..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "搜索中..." : "搜索"}
            </Button>
          </div>

          {/* Type Filter */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={searchType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType("all")}
            >
              全部
            </Button>
            <Button
              variant={searchType === "bookmarks" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType("bookmarks")}
            >
              书签
            </Button>
            <Button
              variant={searchType === "stars" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType("stars")}
            >
              GitHub Stars
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {results.length > 0 && (
          <p className="text-sm text-muted-foreground">
            找到 {results.length} 个结果
          </p>
        )}

        {results.map((result, index) => (
          <ResultCard key={index} result={result} />
        ))}

        {results.length === 0 && query && !loading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              未找到相关结果
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const isBookmark = result.type === "bookmark";

  if (!result.bookmark && !result.star) return null;

  const title = isBookmark && result.bookmark 
    ? result.bookmark.title 
    : result.star ? `${result.star.owner}/${result.star.repo}` : "";
  
  const description = isBookmark && result.bookmark 
    ? result.bookmark.description 
    : result.star?.description;
  
  const url = isBookmark && result.bookmark 
    ? result.bookmark.url 
    : result.star?.url || "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                {title}
              </CardTitle>
              <Badge variant={isBookmark ? "default" : "secondary"}>
                {isBookmark ? "书签" : "Star"}
              </Badge>
            </div>
            {result.star?.language && (
              <Badge variant="outline" className="mt-2">
                {result.star.language}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            相似度: {(result.similarity * 100).toFixed(1)}%
          </div>
        </div>
        <CardDescription className="mt-2">
          {description || "暂无描述"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          {url}
        </a>
        {result.star && (
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>⭐ {result.star.stars}</span>
            <span>🔀 {result.star.forks}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
