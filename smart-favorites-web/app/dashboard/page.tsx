"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterToolbar } from "@/components/dashboard/filter-toolbar";
import { FeedList, FeedListItem } from "@/components/layout/feed-list";
import { SectionPanel } from "@/components/layout/section-panel";
import { EmptyState } from "@/components/empty-state";
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
    <div className="page-stack">
      <PageHeader title={t.title} description={t.subtitle} />

      <SectionPanel noPadding>
        <FilterToolbar
          searchPlaceholder={t.placeholder}
          searchValue={query}
          onSearchChange={setQuery}
          onSearchKeyDown={(e) => e.key === "Enter" && handleSearch()}
          selects={[
            {
              id: "type",
              value: searchType,
              onChange: (value) =>
                setSearchType(value as "all" | "bookmarks" | "stars" | "documents"),
              options: (["all", "bookmarks", "stars", "documents"] as const).map(
                (type) => ({
                  value: type,
                  label: filterLabel(language, type),
                })
              ),
            },
          ]}
          actions={
            <Button onClick={handleSearch} disabled={loading} className="h-10">
              <Search className="h-4 w-4 mr-2" />
              {loading ? t.searching : t.search}
            </Button>
          }
        />
      </SectionPanel>

      {error && (
        <SectionPanel className="border-destructive/40 bg-destructive/5">
          <p className="text-sm text-destructive">{error}</p>
        </SectionPanel>
      )}

      {results.length > 0 && (
        <p className="utility-label">
          {t.resultCount.replace("{count}", String(results.length))}
        </p>
      )}

      {results.length > 0 && (
        <FeedList>
          {results.map((result, index) => (
            <ResultRow key={index} result={result} language={language} />
          ))}
        </FeedList>
      )}

      {results.length === 0 && query && !loading && !error && (
        <EmptyState
          icon={Search}
          title={t.noResults}
          description={t.placeholder}
          textured
        />
      )}
    </div>
  );
}

function ResultRow({
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
    <FeedListItem>
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-base font-semibold leading-snug sm:text-lg">
                {title}
              </h3>
              <Badge variant={isBookmark ? "default" : "secondary"}>
                {isBookmark ? t.badgeBookmark : isDocument ? t.badgeDocument : t.badgeStar}
              </Badge>
              {result.star?.language && (
                <Badge variant="outline">{result.star.language}</Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {description || t.noDescription}
            </p>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm text-primary hover:underline"
              >
                {url}
              </a>
            ) : null}
            {result.star && (
              <div className="flex gap-4 text-xs text-muted-foreground tabular-nums">
                <span>Stars: {result.star.stars}</span>
                <span>Forks: {result.star.forks}</span>
              </div>
            )}
            {result.document && (
              <div className="text-xs text-muted-foreground">
                {result.document.file_name && <span>{result.document.file_name}</span>}
                {result.document.page_number && (
                  <span>
                    {" · "}
                    {pickLanguage(language, t.pageLabel, "Page ")}
                    {result.document.page_number}
                    {pickLanguage(language, t.pageSuffix, "")}
                  </span>
                )}
                {result.document.section_title && (
                  <span> · {result.document.section_title}</span>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0 font-mono text-sm text-muted-foreground">
            {(result.similarity * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </FeedListItem>
  );
}
