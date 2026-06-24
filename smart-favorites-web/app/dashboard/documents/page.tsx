"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, FileText, Loader2, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type DashboardLanguage, useDashboardLanguage } from "@/lib/dashboard-language";
import type { DocumentRecord } from "@/types";

const STATUS_STYLES: Record<DocumentRecord["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_COPY: Record<DashboardLanguage, Record<DocumentRecord["status"], string>> = {
  zh: {
    pending: "待处理",
    processing: "处理中",
    completed: "已完成",
    failed: "失败",
  },
  en: {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
  },
};

const pageCopy = {
  zh: {
    title: "文档",
    subtitle: "上传文件，解析为语料块，并在搜索和 AI 问答中使用。",
    refresh: "刷新",
    upload: "上传",
    uploadSuccess: "文档已上传",
    uploadFailed: "上传失败",
    loadFailed: "加载文档失败",
    processingFailed: "处理失败",
    processNoWork: "当前文档没有待处理任务",
    processedChunks: (count: number) => `已处理 ${count} 个语料块`,
    deleteFailed: "删除失败",
    deleteSuccess: "文档已删除",
    total: "总数",
    readyForRag: "可用于 RAG",
    pending: "待处理",
    failed: "失败",
    searchPlaceholder: "搜索文档...",
    loading: "正在加载文档...",
    noDocuments: "暂无文档",
    fileTypeUnknown: "未知类型",
    noChunks: "尚无语料块",
    chunks: (count: number) => `${count} 个语料块`,
    reprocess: "重新处理",
    process: "处理",
    delete: "删除",
  },
  en: {
    title: "Documents",
    subtitle: "Upload files, parse them into chunks, and use them in search and AI chat.",
    refresh: "Refresh",
    upload: "Upload",
    uploadSuccess: "Document uploaded",
    uploadFailed: "Upload failed",
    loadFailed: "Failed to load documents",
    processingFailed: "Processing failed",
    processNoWork: "No pending work for this document",
    processedChunks: (count: number) => `Processed ${count} chunks`,
    deleteFailed: "Delete failed",
    deleteSuccess: "Document deleted",
    total: "Total",
    readyForRag: "Ready for RAG",
    pending: "Pending",
    failed: "Failed",
    searchPlaceholder: "Search documents...",
    loading: "Loading documents...",
    noDocuments: "No documents found.",
    fileTypeUnknown: "unknown",
    noChunks: "No chunks yet",
    chunks: (count: number) => `${count} chunks`,
    reprocess: "Reprocess",
    process: "Process",
    delete: "Delete",
  },
};

export default function DocumentsPage() {
  const [language] = useDashboardLanguage();
  const t = pageCopy[language];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return documents;
    return documents.filter((document) =>
      [document.title, document.file_name, document.file_type, document.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [documents, query]);

  const stats = useMemo(() => ({
    total: documents.length,
    completed: documents.filter((document) => document.status === "completed").length,
    pending: documents.filter((document) => document.status === "pending" || document.status === "processing").length,
    failed: documents.filter((document) => document.status === "failed").length,
  }), [documents]);

  const loadDocuments = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/documents?limit=200");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.loadFailed);
      setDocuments(payload.documents || []);
    } catch (err: any) {
      setError(err.message || t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.loadFailed]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.uploadFailed);

      toast.success(t.uploadSuccess);
      await processDocument(payload.document.id, false);
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || t.uploadFailed);
      toast.error(err.message || t.uploadFailed);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const processDocument = async (id: string, showToast = true) => {
    setProcessingId(id);
    try {
      const response = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.processingFailed);
      const result = payload.processed?.[0];
      if (showToast) {
        if (result?.status === "completed") {
          toast.success(t.processedChunks(result.chunks || 0));
        } else if (result?.status === "failed") {
          toast.error(result.error || t.processingFailed);
        } else {
          toast.info(t.processNoWork);
        }
      }
      await loadDocuments();
    } catch (err: any) {
      toast.error(err.message || t.processingFailed);
    } finally {
      setProcessingId(null);
    }
  };

  const deleteDocument = async (id: string) => {
    const previous = documents;
    setDocuments((items) => items.filter((item) => item.id !== id));
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t.deleteFailed);
      toast.success(t.deleteSuccess);
    } catch (err: any) {
      setDocuments(previous);
      toast.error(err.message || t.deleteFailed);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm shadow-sky-100/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t.title}</h1>
          <p className="mt-2 text-slate-500">
            {t.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.html,.htm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
          <Button variant="outline" onClick={loadDocuments} disabled={loading} className="rounded-xl border-sky-100 text-slate-700 hover:bg-sky-50">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t.refresh}
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading} className="rounded-xl bg-sky-600 hover:bg-sky-700">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {t.upload}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={t.total} value={stats.total} />
        <Metric label={t.readyForRag} value={stats.completed} />
        <Metric label={t.pending} value={stats.pending} />
        <Metric label={t.failed} value={stats.failed} />
      </div>

      <Card className="rounded-2xl border-sky-100 bg-white/90 shadow-sm shadow-sky-100/60">
        <CardContent className="py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="rounded-xl border-sky-100 pl-9 focus-visible:ring-sky-500"
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {loading ? (
          <Card className="rounded-2xl border-sky-100 bg-white/90">
            <CardContent className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.loading}
            </CardContent>
          </Card>
        ) : filtered.length > 0 ? (
          filtered.map((document) => (
            <DocumentCard
              key={document.id}
              language={language}
              document={document}
              processing={processingId === document.id}
              onProcess={() => processDocument(document.id)}
              onDelete={() => deleteDocument(document.id)}
            />
          ))
        ) : (
          <Card className="rounded-2xl border-sky-100 bg-white/90">
            <CardContent className="py-12 text-center text-slate-500">
              {t.noDocuments}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-2xl border-sky-100 bg-white/90 shadow-sm shadow-sky-100/60">
      <CardContent className="py-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-950">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function DocumentCard({
  language,
  document,
  processing,
  onProcess,
  onDelete,
}: {
  language: DashboardLanguage;
  document: DocumentRecord;
  processing: boolean;
  onProcess: () => void;
  onDelete: () => void;
}) {
  const t = pageCopy[language];
  const chunkCount = typeof document.metadata?.chunk_count === "number"
    ? document.metadata.chunk_count
    : null;

  return (
    <Card className="rounded-2xl border-sky-100 bg-white/90 shadow-sm shadow-sky-100/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 shrink-0 text-sky-600" />
              <span className="truncate">{document.title}</span>
            </CardTitle>
            <p className="mt-1 truncate text-sm text-slate-500">{document.file_name}</p>
          </div>
          <Badge variant="outline" className={STATUS_STYLES[document.status]}>
            {STATUS_COPY[language][document.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-4">
          <span>{formatBytes(document.file_size)}</span>
          <span>{document.file_type || t.fileTypeUnknown}</span>
          <span>{chunkCount !== null ? t.chunks(chunkCount) : t.noChunks}</span>
          <span>{new Date(document.created_at).toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")}</span>
        </div>
        {document.processing_error && (
          <p className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {document.processing_error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-sky-100 hover:bg-sky-50"
            onClick={onProcess}
            disabled={processing || document.status === "processing"}
          >
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {document.status === "completed" ? t.reprocess : t.process}
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl border-sky-100 hover:bg-sky-50" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t.delete}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
