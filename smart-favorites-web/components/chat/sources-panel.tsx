"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  PanelRightClose,
  PanelRightOpen,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type DashboardLanguage, pickLanguage } from "@/lib/dashboard-language";
import type { AggregatedSessionSource } from "@/lib/chat/session-sources";
import {
  getSourceSnippet,
  getSourceTitle,
  getSourceUrl,
} from "@/lib/chat/session-sources";

type SourceTypeFilter = "all" | "bookmark" | "star" | "document";

const panelCopy = {
  zh: {
    title: "引用来源",
    empty: "本会话暂无引用来源",
    filterAll: "全部",
    filterBookmark: "书签",
    filterStar: "Stars",
    filterDocument: "文档",
    exportMd: "导出 Markdown",
    exportJson: "导出 JSON",
    analyze: "用来源追问",
    collapse: "收起来源栏",
    expand: "展开来源栏",
    similarity: "相关度",
    open: "打开",
  },
  en: {
    title: "Sources",
    empty: "No sources in this session yet",
    filterAll: "All",
    filterBookmark: "Bookmarks",
    filterStar: "Stars",
    filterDocument: "Documents",
    exportMd: "Export Markdown",
    exportJson: "Export JSON",
    analyze: "Ask with sources",
    collapse: "Collapse sources",
    expand: "Expand sources",
    similarity: "Relevance",
    open: "Open",
  },
} as const;

export function SourcesPanel({
  language,
  sessionId,
  sources,
  collapsed,
  highlightedIndex,
  onToggleCollapse,
  onHighlight,
  onAnalyze,
}: {
  language: DashboardLanguage;
  sessionId: string | null;
  sources: AggregatedSessionSource[];
  collapsed: boolean;
  highlightedIndex: number | null;
  onToggleCollapse: () => void;
  onHighlight: (index: number | null) => void;
  onAnalyze: (prompt: string) => void;
}) {
  const t = panelCopy[language];
  const [filter, setFilter] = useState<SourceTypeFilter>("all");

  const filteredSources = useMemo(() => {
    if (filter === "all") return sources;
    return sources.filter((source) => source.type === filter);
  }, [filter, sources]);

  if (collapsed) {
    return (
      <aside className="flex h-full w-full flex-col items-center border-l border-border bg-card/80 py-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-lg p-2 text-muted-foreground hover:bg-primary/5 hover:text-foreground"
          title={t.expand}
          aria-label={t.expand}
        >
          <PanelRightOpen className="h-5 w-5" />
        </button>
        {sources.length > 0 && (
          <Badge variant="secondary" className="mt-3 rounded-full px-2 py-0.5 text-[10px]">
            {sources.length}
          </Badge>
        )}
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-border bg-card/90">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{sources.length}</p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-lg p-2 text-muted-foreground hover:bg-primary/5"
          title={t.collapse}
          aria-label={t.collapse}
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2">
        {(
          [
            ["all", t.filterAll],
            ["bookmark", t.filterBookmark],
            ["star", t.filterStar],
            ["document", t.filterDocument],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition",
              filter === value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 border-b border-border px-4 py-2">
        {sessionId && (
          <>
            <a
              href={`/api/chat/sessions/${sessionId}/sources/export?format=md&locale=${language}`}
              className="inline-flex items-center gap-1 border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-primary/5"
            >
              <Download className="h-3.5 w-3.5" />
              {t.exportMd}
            </a>
            <a
              href={`/api/chat/sessions/${sessionId}/sources/export?format=json`}
              className="inline-flex items-center gap-1 border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-primary/5"
            >
              <Download className="h-3.5 w-3.5" />
              {t.exportJson}
            </a>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-6">
        {filteredSources.length === 0 ? (
          <div className="border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            {t.empty}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredSources.map((source) => (
              <SourceCard
                key={source.sourceKey}
                language={language}
                source={source}
                highlighted={highlightedIndex === source.sourceIndex}
                onHighlight={() => onHighlight(source.sourceIndex)}
                onAnalyze={() =>
                  onAnalyze(
                    pickLanguage(
                      language,
                      `请基于来源 [${source.sourceIndex}]「${getSourceTitle(source, language)}」继续分析：`,
                      `Continue analyzing based on source [${source.sourceIndex}] "${getSourceTitle(source, language)}": `
                    )
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function SourceCard({
  language,
  source,
  highlighted,
  onHighlight,
  onAnalyze,
}: {
  language: DashboardLanguage;
  source: AggregatedSessionSource;
  highlighted: boolean;
  onHighlight: () => void;
  onAnalyze: () => void;
}) {
  const t = panelCopy[language];
  const title = getSourceTitle(source, language);
  const url = getSourceUrl(source);
  const snippet = getSourceSnippet(source, language);
  const TypeIcon =
    source.type === "bookmark" ? Bookmark : source.type === "star" ? GitBranch : FileText;

  return (
    <article
      id={`source-${source.sourceIndex}`}
      onMouseEnter={onHighlight}
      className={cn(
        "border px-3 py-3 transition",
        highlighted
          ? "border-primary/30 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-border hover:bg-muted/40"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {source.sourceIndex}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TypeIcon className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wide">{source.type}</span>
            </div>
            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-md px-1.5 py-0 text-[10px]">
          {Math.round((source.similarity || 0) * 100)}%
        </Badge>
      </div>

      {snippet && <p className="line-clamp-4 text-xs leading-5 text-muted-foreground">{snippet}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15"
          >
            <ExternalLink className="h-3 w-3" />
            {t.open}
          </a>
        ) : null}
        <button
          type="button"
          onClick={onAnalyze}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-primary/5"
        >
          <Search className="h-3 w-3" />
          {panelCopy[language].analyze}
        </button>
      </div>
    </article>
  );
}

export function SourcesMobileSheet({
  open,
  language,
  sessionId,
  sources,
  onClose,
  onAnalyze,
}: {
  open: boolean;
  language: DashboardLanguage;
  sessionId: string | null;
  sources: AggregatedSessionSource[];
  onClose: () => void;
  onAnalyze: (prompt: string) => void;
}) {
  const t = panelCopy[language];
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/30"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden rounded-t-3xl border border-border bg-card shadow-elevated">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{t.title}</h2>
            <p className="text-xs text-muted-foreground">{sources.length}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-primary/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        {sessionId && (
          <div className="flex gap-2 border-b border-border px-4 py-2">
            <a
              href={`/api/chat/sessions/${sessionId}/sources/export?format=md&locale=${language}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              {t.exportMd}
            </a>
            <a
              href={`/api/chat/sessions/${sessionId}/sources/export?format=json`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              {t.exportJson}
            </a>
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
          {sources.length === 0 ? (
            <div className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {t.empty}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sources.map((source) => (
                <SourceCard
                  key={source.sourceKey}
                  language={language}
                  source={source}
                  highlighted={false}
                  onHighlight={() => undefined}
                  onAnalyze={() => {
                    onAnalyze(
                      pickLanguage(
                        language,
                        `请基于来源 [${source.sourceIndex}]「${getSourceTitle(source, language)}」继续分析：`,
                        `Continue analyzing based on source [${source.sourceIndex}] "${getSourceTitle(source, language)}": `
                      )
                    );
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
