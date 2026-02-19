"use client";

import { useState } from "react";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDiceBearUrl } from "@/lib/avatars";
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
}

export function PostCard({
  post,
  currentUserId,
  onVote,
  onDelete,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const isAuthor = currentUserId === post.user_id;
  const votes = post.votes;
  const userVote = votes?.user_vote ?? null;

  // Avatar URL
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

  const handleVote = (helpful: boolean) => {
    if (userVote === helpful) {
      // Toggle off
      onVote(post.id, null);
    } else {
      onVote(post.id, helpful);
    }
  };

  return (
    <>
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <img
              src={avatarUrl}
              alt="avatar"
              className="h-8 w-8 rounded-full object-cover bg-muted"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(post.created_at)}
                </span>
              </div>
              {post.title && (
                <h3 className="text-base font-semibold mt-0.5 leading-tight">
                  {post.title}
                </h3>
              )}
            </div>
            {post.target_url && (
              <a
                href={post.target_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Badge
                  variant="outline"
                  className="gap-1 text-xs hover:bg-accent cursor-pointer shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  链接
                </Badge>
              </a>
            )}
          </div>

          {/* Rating */}
          {post.rating != null && post.rating > 0 && (
            <div className="flex items-center gap-0.5 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i < post.rating!
                      ? "fill-current text-amber-400"
                      : "text-muted-foreground"
                  )}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="relative">
            <p
              className={cn(
                "text-sm text-foreground/90 whitespace-pre-wrap break-words",
                !expanded && "line-clamp-6"
              )}
            >
              {post.content}
            </p>
            {post.content.length > 300 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
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

          {/* Media gallery */}
          {(images.length > 0 || videos.length > 0) && (
            <div className="mt-3">
              {/* Images */}
              {images.length > 0 && (
                <div
                  className={cn(
                    "grid gap-2",
                    images.length === 1
                      ? "grid-cols-1"
                      : images.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3"
                  )}
                >
                  {images.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => setLightboxUrl(img.url)}
                      className="relative overflow-hidden rounded-lg border bg-muted aspect-video"
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="h-full w-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </button>
                  ))}
                </div>
              )}
              {/* Videos */}
              {videos.map((vid) => (
                <div key={vid.id} className="mt-2">
                  <video
                    src={vid.url}
                    controls
                    className="w-full rounded-lg border"
                    preload="metadata"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Footer / Votes */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            {isAuthor ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  你的发布
                </span>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(post.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    删除
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  这篇评测是否有价值？
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={userVote === true ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1",
                      userVote === true &&
                        "bg-green-600 hover:bg-green-700 text-white"
                    )}
                    onClick={() => handleVote(true)}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    有用{" "}
                    {votes?.helpful_count ? `(${votes.helpful_count})` : ""}
                  </Button>
                  <Button
                    variant={userVote === false ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1",
                      userVote === false &&
                        "bg-red-600 hover:bg-red-700 text-white"
                    )}
                    onClick={() => handleVote(false)}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    无用{" "}
                    {votes?.not_helpful_count
                      ? `(${votes.not_helpful_count})`
                      : ""}
                  </Button>
                </div>
              </div>
            )}

            {/* Show vote stats for author too */}
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
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
