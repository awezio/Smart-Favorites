"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type DashboardLanguage, pickLanguage, useDashboardLanguage } from "@/lib/dashboard-language";
import type { SearchResult } from "@/types";

const pageCopy = {
  zh: {
    title: "智能搜索",
    subtitle: "使用 AI 语义搜索查找您的收藏内容",
    placeholder: "输入关键词或自然语言问题...",
    searching: "搜索中...",
    search: "搜索",
    filterAll: "全部",
    filterBookmarks: "书签",
    filterStars: "GitHub Stars",
    filterDocuments: "Documents",
    searchFailedRetry: "搜索失败，请稍后重试",
    searchFailedNetwork: "搜索失败，请检查网络后重试",
    resultCount: "找到 {count} 个结果",
    noResults: "未找到相关结果",
    noDescription: "暂无描述",
    badgeBookmark: "书签",
    badgeDocument: "文档",
    badgeStar: "Star",
    pageLabel: "第",
    pageSuffix: "页",
  },
  en: {
    title: "Smart Search",
    subtitle: "Use AI semantic search to find your saved content",
    placeholder: "Enter a keyword or a natural language question...",
    searching: "Searching...",
    search: "Search",
    filterAll: "All",
    filterBookmarks: "Bookmarks",
    filterStars: "GitHub Stars",
    filterDocuments: "Documents",
    searchFailedRetry: "Search failed, please try again later",
    searchFailedNetwork: "Search failed, please check your network and try again",
    resultCount: "{count} results found",
    noResults: "No matching results found",
    noDescription: "No description",
    badgeBookmark: "Bookmark",
    badgeDocument: "Document",
    badgeStar: "Star",
    pageLabel: "Page ",
    pageSuffix: "",
  },
} as const;

function filterLabel(language: DashboardLanguage, type: "all" | "bookmarks" | "stars" | "documents") {
  const t = pageCopy[language];
  switch (type) {
    case "all":
      return t.filterAll;
    case "bookmarks":
      return t.filterBookmarks;
    case "stars":
      return t.filterStars;
    case "documents":
      return t.filterDocuments;
  }
}

export default function SearchPage() {
  const [language] = useDashboardLanguage();
  const t = pageCopy[language];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchType, setSearchType] = useState<"all" | "bookmarks" | "stars" | "documents">(
    "all"
  );

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type: searchType, topK: 10 }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        const data = await response.json().catch(() => ({}));
        setResults([]);
        setError(data.error || t.searchFailedRetry);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      setError(t.searchFailedNetwork);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground mt-2">
          {t.subtitle}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder={t.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="text-base"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? t.searching : t.search}
            </Button>
          </div>

          <div className="flex gap-2 mt-4">
            {(["all", "bookmarks", "stars", "documents"] as const).map((type) => (
              <Button
                key={type}
                variant={searchType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType(type)}
              >
                {filterLabel(language, type)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {error && (
          <Card>
            <CardContent className="py-6 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t.resultCount.replace("{count}", String(results.length))}
          </p>
        )}

        {results.map((result, index) => (
          <ResultCard key={index} result={result} language={language} />
        ))}

        {results.length === 0 && query && !loading && !error && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t.noResults}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  language,
}: {
  result: SearchResult;
  language: DashboardLanguage;
}) {
  const t = pageCopy[language];
  const isBookmark = result.type === "bookmark";
  const isDocument = result.type === "document";

  if (!result.bookmark && !result.star && !result.document) return null;

  const title =
    isBookmark && result.bookmark
      ? result.bookmark.title
      : isDocument && result.document
        ? result.document.title
      : result.star
        ? `${result.star.owner}/${result.star.repo}`
        : "";

  const description =
    isBookmark && result.bookmark
      ? language === "zh"
        ? result.bookmark.description_zh || result.bookmark.description || result.bookmark.description_en
        : result.bookmark.description_en || result.bookmark.description || result.bookmark.description_zh
      : isDocument && result.document
        ? result.document.content
      : result.star
        ? language === "zh"
          ? result.star.description_zh || result.star.description || result.star.description_en
          : result.star.description_en || result.star.description || result.star.description_zh
        : undefined;

  const url =
    isBookmark && result.bookmark
      ? result.bookmark.url
      : result.star?.url || "";

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{title}</CardTitle>
              <Badge variant={isBookmark ? "default" : "secondary"}>
                {isBookmark ? t.badgeBookmark : isDocument ? t.badgeDocument : t.badgeStar}
              </Badge>
            </div>
            {result.star?.language && (
              <Badge variant="outline" className="mt-2">
                {result.star.language}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {(result.similarity * 100).toFixed(1)}%
          </div>
        </div>
        <CardDescription className="mt-2">
          {description || t.noDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {url}
          </a>
        ) : null}
        {result.star && (
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>Stars: {result.star.stars}</span>
            <span>Forks: {result.star.forks}</span>
          </div>
        )}
        {result.document && (
          <div className="mt-2 text-sm text-muted-foreground">
            {result.document.file_name && <span>{result.document.file_name}</span>}
            {result.document.page_number && (
              <span>
                {" · "}
                {pickLanguage(language, t.pageLabel, "Page ")}
                {result.document.page_number}
                {pickLanguage(language, t.pageSuffix, "")}
              </span>
            )}
            {result.document.section_title && <span> · {result.document.section_title}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
