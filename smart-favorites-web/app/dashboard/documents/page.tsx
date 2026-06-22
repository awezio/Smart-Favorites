"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, FileText, Loader2, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DocumentRecord } from "@/types";

const STATUS_STYLES: Record<DocumentRecord["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

export default function DocumentsPage() {
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

  const loadDocuments = async () => {
    setError("");
    try {
      const response = await fetch("/api/documents?limit=200");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load documents");
      setDocuments(payload.documents || []);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

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
      if (!response.ok) throw new Error(payload.error || "Upload failed");

      toast.success("Document uploaded");
      await processDocument(payload.document.id, false);
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || "Upload failed");
      toast.error(err.message || "Upload failed");
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
      if (!response.ok) throw new Error(payload.error || "Processing failed");
      const result = payload.processed?.[0];
      if (showToast) {
        if (result?.status === "completed") {
          toast.success(`Processed ${result.chunks || 0} chunks`);
        } else if (result?.status === "failed") {
          toast.error(result.error || "Processing failed");
        } else {
          toast.info("No pending work for this document");
        }
      }
      await loadDocuments();
    } catch (err: any) {
      toast.error(err.message || "Processing failed");
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
      if (!response.ok) throw new Error(payload.error || "Delete failed");
      toast.success("Document deleted");
    } catch (err: any) {
      setDocuments(previous);
      toast.error(err.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="mt-2 text-muted-foreground">
            Upload files, parse them into chunks, and use them in search and AI chat.
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
          <Button variant="outline" onClick={loadDocuments} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total" value={stats.total} />
        <Metric label="Ready for RAG" value={stats.completed} />
        <Metric label="Pending" value={stats.pending} />
        <Metric label="Failed" value={stats.failed} />
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search documents..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading documents...
            </CardContent>
          </Card>
        ) : filtered.length > 0 ? (
          filtered.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              processing={processingId === document.id}
              onProcess={() => processDocument(document.id)}
              onDelete={() => deleteDocument(document.id)}
            />
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No documents found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function DocumentCard({
  document,
  processing,
  onProcess,
  onDelete,
}: {
  document: DocumentRecord;
  processing: boolean;
  onProcess: () => void;
  onDelete: () => void;
}) {
  const chunkCount = typeof document.metadata?.chunk_count === "number"
    ? document.metadata.chunk_count
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <span className="truncate">{document.title}</span>
            </CardTitle>
            <p className="mt-1 truncate text-sm text-muted-foreground">{document.file_name}</p>
          </div>
          <Badge variant="outline" className={STATUS_STYLES[document.status]}>
            {document.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
          <span>{formatBytes(document.file_size)}</span>
          <span>{document.file_type || "unknown"}</span>
          <span>{chunkCount !== null ? `${chunkCount} chunks` : "No chunks yet"}</span>
          <span>{new Date(document.created_at).toLocaleDateString()}</span>
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
            onClick={onProcess}
            disabled={processing || document.status === "processing"}
          >
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {document.status === "completed" ? "Reprocess" : "Process"}
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
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
