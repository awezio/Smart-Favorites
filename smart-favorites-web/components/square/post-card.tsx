"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Pencil,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Film,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DitheredImage } from "@/components/layout/dithered-image";
import { getDiceBearUrl } from "@/lib/avatars";
import { SQUARE_TARGET_LABELS } from "@/lib/square";
import type { SquarePost } from "@/types";

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

interface PostCardProps {
  post: SquarePost;
  currentUserId?: string;
  onVote: (postId: string, helpful: boolean | null) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: SquarePost) => void;
  layout?: "feed" | "grid";
}

function SnapshotCover({
  post,
  images,
}: {
  post: SquarePost;
  images: NonNullable<SquarePost["media"]>;
}) {
  const coverUrl =
    post.snapshot_url ||
    images[0]?.url ||
    null;

  if (post.snapshot_status === "capturing" || post.snapshot_status === "pending") {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs">快照生成中...</span>
        </div>
      </div>
    );
  }

  if (post.snapshot_status === "failed" || post.snapshot_status === "unavailable") {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center bg-muted/80">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-6 w-6" />
          <span className="text-xs">快照不可用</span>
        </div>
      </div>
    );
  }

  if (coverUrl) {
    return (
      <DitheredImage className="relative aspect-[16/10] w-full bg-muted">
        <Image
          src={coverUrl}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
          className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-foreground/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </DitheredImage>
    );
  }

  return (
    <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 to-accent-creative/10 p-6">
      <svg viewBox="0 0 80 60" className="h-14 w-18 text-primary/35" aria-hidden>
        <rect x="4" y="4" width="72" height="52" rx="4" fill="currentColor" fillOpacity="0.25" />
        <rect x="12" y="14" width="24" height="18" rx="2" fill="currentColor" fillOpacity="0.4" />
        <rect x="42" y="14" width="26" height="4" rx="1" fill="currentColor" fillOpacity="0.3" />
      </svg>
      <span className="max-w-full truncate text-center text-xs text-muted-foreground">
        {post.title}
      </span>
    </div>
  );
}

export function PostCard({
  post,
  currentUserId,
  onVote,
  onDelete,
  onEdit,
  layout = "feed",
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const isAuthor = currentUserId === post.user_id;
  const votes = post.votes;
  const userVote = votes?.user_vote ?? null;

  const avatarUrl = post.author?.avatar_url
    ? post.author.avatar_url
    : post.author?.avatar_seed
      ? getDiceBearUrl(
          post.author.avatar_seed.includes(":")
            ? post.author.avatar_seed.split(":")[0]
            : "adventurer",
          post.author.avatar_seed.includes(":")
            ? post.author.avatar_seed.split(":")[1]
            : post.author.avatar_seed,
          32
        )
      : getDiceBearUrl("adventurer", post.user_id, 32);

  const displayName =
    post.author?.display_name || `用户${post.user_id.slice(0, 6)}`;

  const images = post.media?.filter((m) => m.media_type === "image") || [];
  const videos = post.media?.filter((m) => m.media_type === "video") || [];
  const targetLabel = post.target_type ? SQUARE_TARGET_LABELS[post.target_type] : null;
  const mediaCount = images.length + videos.length;

  const handleVote = (helpful: boolean) => {
    if (userVote === helpful) {
      onVote(post.id, null);
    } else {
      onVote(post.id, helpful);
    }
  };

  const isGrid = layout === "grid";

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <article
          className={cn(
            "group overflow-hidden border border-border bg-card transition-colors hover:bg-muted/30",
            isGrid && "h-full"
          )}
        >
          <SnapshotCover post={post} images={images} />

          <div className={cn("p-4 sm:p-5", isGrid && "flex flex-1 flex-col")}>
            <div className="mb-3 flex items-center gap-3">
              <Image
                src={avatarUrl}
                alt="avatar"
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-full object-cover bg-muted"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{displayName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(post.created_at)}
                  </span>
                </div>
                {post.title && (
                  <h3 className="mt-0.5 text-base font-semibold leading-tight text-foreground">
                    {post.title}
                  </h3>
                )}
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              {targetLabel && (
                <Badge variant="secondary" className="text-xs">
                  {targetLabel}
                </Badge>
              )}
              {mediaCount > 0 && (
                <Badge variant="outline" className="gap-1 text-xs">
                  {images.length > 0 && <ImageIcon className="h-3 w-3" />}
                  {videos.length > 0 && !images.length && <Film className="h-3 w-3" />}
                  {mediaCount} 个媒体
                </Badge>
              )}
              {post.target_url && (
                <a href={post.target_url} target="_blank" rel="noopener noreferrer">
                  <Badge
                    variant="outline"
                    className="cursor-pointer gap-1 text-xs hover:bg-accent"
                  >
                    <ExternalLink className="h-3 w-3" />
                    链接
                  </Badge>
                </a>
              )}
            </div>

            {post.rating != null && post.rating > 0 && (
              <div className="mb-2 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < post.rating!
                        ? "fill-current text-accent-creative"
                        : "text-muted-foreground"
                    )}
                  />
                ))}
              </div>
            )}

            <div className="relative">
              <p
                className={cn(
                  "text-sm text-foreground/90 whitespace-pre-wrap break-words",
                  !expanded && "line-clamp-4"
                )}
              >
                {post.content}
              </p>
              {post.content.length > 200 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {expanded ? (
                    <>
                      收起 <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      展开 <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {images.slice(1, 4).map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setLightboxUrl(img.url)}
                    className="relative aspect-video overflow-hidden border bg-muted"
                  >
                    <DitheredImage className="absolute inset-0">
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        sizes="120px"
                        unoptimized
                        className="object-cover"
                      />
                    </DitheredImage>
                  </button>
                ))}
              </div>
            )}

            {videos.map((vid) => (
              <div key={vid.id} className="mt-3">
                <video
                  src={vid.url}
                  controls
                  className="w-full border"
                  preload="metadata"
                />
              </div>
            ))}

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              {isAuthor ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">你的发布</span>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onEdit(post)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      编辑
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete(post.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      删除
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={userVote === true ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 gap-1 text-xs",
                      userVote === true && "bg-green-600 hover:bg-green-700"
                    )}
                    onClick={() => handleVote(true)}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    有用 {votes?.helpful_count ? `(${votes.helpful_count})` : ""}
                  </Button>
                  <Button
                    variant={userVote === false ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 gap-1 text-xs",
                      userVote === false && "bg-red-600 hover:bg-red-700"
                    )}
                    onClick={() => handleVote(false)}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    无用{" "}
                    {votes?.not_helpful_count ? `(${votes.not_helpful_count})` : ""}
                  </Button>
                </div>
              )}

              {isAuthor && votes && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> {votes.helpful_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="h-3 w-3" /> {votes.not_helpful_count}
                  </span>
                </div>
              )}
            </div>
          </div>
        </article>
      </motion.div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-foreground/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <Image
            src={lightboxUrl}
            alt=""
            width={1200}
            height={800}
            unoptimized
            className="max-h-[90vh] max-w-[90vw] border object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
