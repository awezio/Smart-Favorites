"use client";

import { useState, useRef, useCallback } from "react";
import { Star, X, Upload, Image, Film, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type TargetType = "bookmark" | "star" | "general";

interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
}

const TARGET_TYPE_OPTIONS: { value: TargetType; label: string }[] = [
  { value: "general", label: "通用" },
  { value: "bookmark", label: "书签" },
  { value: "star", label: "Star" },
];

const MAX_CONTENT_LENGTH = 2000;

export function CreatePostModal({
  open,
  onClose,
  onCreated,
}: CreatePostModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [targetUrl, setTargetUrl] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("general");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    setRating(null);
    setTargetUrl("");
    setTargetType("general");
    setMediaFiles([]);
    setHoverRating(0);
  }, []);

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const handleRatingClick = (star: number) => {
    if (rating === star) {
      setRating(null);
    } else {
      setRating(star);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newMedia: MediaFile[] = [];

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        newMedia.push({
          file,
          preview: URL.createObjectURL(file),
          type: "image",
        });
      } else if (file.type.startsWith("video/")) {
        newMedia.push({
          file,
          preview: URL.createObjectURL(file),
          type: "video",
        });
      }
    }

    setMediaFiles((prev) => [...prev, ...newMedia]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newMedia: MediaFile[] = [];

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        newMedia.push({
          file,
          preview: URL.createObjectURL(file),
          type: "image",
        });
      } else if (file.type.startsWith("video/")) {
        newMedia.push({
          file,
          preview: URL.createObjectURL(file),
          type: "video",
        });
      }
    }

    setMediaFiles((prev) => [...prev, ...newMedia]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("请输入标题");
      return;
    }
    if (!content.trim()) {
      toast.error("请输入内容");
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      toast.error(`内容不能超过 ${MAX_CONTENT_LENGTH} 字`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create the post
      const res = await fetch("/api/square", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          rating,
          target_type: targetType,
          target_url: targetUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "发布失败");
      }

      const post = await res.json();
      const postId = post.id || post.data?.id;

      // 2. Upload media files
      if (postId && mediaFiles.length > 0) {
        for (const media of mediaFiles) {
          const formData = new FormData();
          formData.append("file", media.file);
          formData.append("media_type", media.type);

          try {
            await fetch(`/api/square/${postId}/media`, {
              method: "POST",
              body: formData,
            });
          } catch (mediaErr) {
            console.error("Media upload failed:", mediaErr);
            // Continue with other uploads
          }
        }
      }

      toast.success("发布成功！");
      resetForm();
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "发布失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>发布到广场</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={submitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>
              标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的分享起个标题"
              disabled={submitting}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                内容 <span className="text-destructive">*</span>
              </Label>
              <span
                className={cn(
                  "text-xs",
                  content.length > MAX_CONTENT_LENGTH
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {content.length}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享你的发现、心得或评测..."
              rows={5}
              disabled={submitting}
            />
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>评分 (可选)</Label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const starNum = i + 1;
                const filled =
                  hoverRating > 0 ? starNum <= hoverRating : starNum <= (rating || 0);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleRatingClick(starNum)}
                    onMouseEnter={() => setHoverRating(starNum)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                    disabled={submitting}
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-colors",
                        filled
                          ? "fill-current text-amber-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                );
              })}
              {rating && (
                <span className="text-xs text-muted-foreground ml-2">
                  {rating} / 5
                </span>
              )}
            </div>
          </div>

          {/* Target URL */}
          <div className="space-y-2">
            <Label>关联链接 (可选)</Label>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="关联链接 (可选)"
              disabled={submitting}
            />
          </div>

          {/* Target Type */}
          <div className="space-y-2">
            <Label>分类</Label>
            <div className="flex gap-2">
              {TARGET_TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={targetType === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTargetType(opt.value)}
                  disabled={submitting}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>媒体附件 (可选)</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
                "hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                拖拽或点击上传图片/视频
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={submitting}
              />
            </div>

            {/* Preview thumbnails */}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {mediaFiles.map((media, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-lg overflow-hidden border aspect-video bg-muted"
                  >
                    {media.type === "image" ? (
                      <img
                        src={media.preview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Film className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMedia(idx);
                      }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                发布中...
              </>
            ) : (
              "发布"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
