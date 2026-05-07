"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  FileText,
  Tag,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import type { Note } from "@/types";

/* ── Tag input helper ── */
function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="添加标签..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
            >
              <Tag className="h-3 w-3" />
              {tag}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Note form (create / edit) ── */
interface NoteFormProps {
  initial?: Note;
  onSave: (data: {
    title: string;
    content: string;
    tags: string[];
    source_url: string;
  }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function NoteForm({ initial, onSave, onCancel, saving }: NoteFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("标题和内容不能为空");
      return;
    }
    await onSave({ title, content, tags, source_url: sourceUrl });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "编辑笔记" : "新建笔记"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">标题 *</Label>
            <Input
              id="note-title"
              placeholder="笔记标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-content">内容 *</Label>
            <Textarea
              id="note-content"
              placeholder="记录你的想法、知识点、摘录..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              required
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label>标签</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-source">来源 URL（可选）</Label>
            <Input
              id="note-source"
              type="url"
              placeholder="https://example.com"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {initial ? "保存修改" : "创建笔记"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Note card ── */
function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = note.content.length > 200 && !expanded;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight">{note.title}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {new Date(note.created_at).toLocaleString("zh-CN")}
            </CardDescription>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(note)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(note.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
          {preview ? `${note.content.slice(0, 200)}…` : note.content}
        </p>
        {note.content.length > 200 && (
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "收起" : "展开全文"}
          </button>
        )}

        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs gap-1">
                <Tag className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {note.source_url && (
          <a
            href={note.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            来源链接
          </a>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Main page ── */
export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {
      toast.error("加载笔记失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleCreate = async (data: {
    title: string;
    content: string;
    tags: string[];
    source_url: string;
  }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "创建失败");
      }
      toast.success("笔记已创建");
      setShowForm(false);
      loadNotes();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: {
    title: string;
    content: string;
    tags: string[];
    source_url: string;
  }) => {
    if (!editingNote) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失败");
      }
      toast.success("笔记已更新");
      setEditingNote(null);
      loadNotes();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此笔记？")) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast.success("笔记已删除");
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = search.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase()) ||
          n.tags?.some((t) => t.includes(search.toLowerCase()))
      )
    : notes;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">知识笔记</h1>
          <p className="text-muted-foreground mt-2">
            记录想法和知识点，与书签、GitHub Stars 统一 AI 检索
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingNote(null);
            setShowForm(true);
          }}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          新建笔记
        </Button>
      </div>

      {/* Form */}
      {(showForm || editingNote) && (
        <NoteForm
          initial={editingNote ?? undefined}
          onSave={editingNote ? handleEdit : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingNote(null);
          }}
          saving={saving}
        />
      )}

      {/* Search */}
      {notes.length > 0 && !showForm && !editingNote && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="本地搜索笔记..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Stats */}
      {!showForm && !editingNote && notes.length > 0 && (
        <p className="text-sm text-muted-foreground">
          共 {notes.length} 条笔记
          {search && ` · 筛选出 ${filtered.length} 条`}
        </p>
      )}

      {/* Notes grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 && !showForm ? (
        <EmptyState
          icon={FileText}
          title={search ? "没有匹配的笔记" : "还没有笔记"}
          description={
            search
              ? "尝试换个关键词"
              : "点击「新建笔记」开始记录你的第一条知识笔记"
          }
          action={
            !search ? (
              <Button
                onClick={() => {
                  setEditingNote(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                新建笔记
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={(n) => {
                setShowForm(false);
                setEditingNote(n);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
