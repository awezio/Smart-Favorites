"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PostCard } from "@/components/square/post-card";
import { CreatePostModal } from "@/components/square/create-post-modal";
import { createClient } from "@/lib/supabase/client";
import type { SquarePost } from "@/types";

type FilterType = "all" | "bookmark" | "star" | "general";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "bookmark", label: "书签" },
  { value: "star", label: "Stars" },
  { value: "general", label: "通用" },
];

const PAGE_SIZE = 20;

function PostCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-4" />
          ))}
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-4 w-[60%]" />
        <div className="flex items-center gap-2 pt-3 border-t mt-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SquarePage() {
  const [posts, setPosts] = useState<SquarePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  const supabase = createClient();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    getUser();
  }, []);

  const fetchPosts = useCallback(
    async (pageNum: number, append = false) => {
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (filter !== "all") {
          params.set("target_type", filter);
        }

        const res = await fetch(`/api/square?${params}`);
        if (!res.ok) throw new Error("Failed to fetch posts");

        const data = await res.json();
        const newPosts: SquarePost[] = data.posts || data.items || data.data || [];

        if (append) {
          setPosts((prev) => [...prev, ...newPosts]);
        } else {
          setPosts(newPosts);
        }
        setHasMore(newPosts.length >= PAGE_SIZE);
      } catch (err) {
        console.error("Failed to load posts:", err);
        if (!append) {
          toast.error("加载失败，请重试");
        }
      }
    },
    [filter]
  );

  // Initial load and filter change
  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchPosts(1).finally(() => setLoading(false));
  }, [filter, fetchPosts]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    await fetchPosts(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleCreated = () => {
    setPage(1);
    setLoading(true);
    fetchPosts(1).finally(() => setLoading(false));
  };

  const handleVote = async (postId: string, helpful: boolean | null) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const oldVote = post.votes?.user_vote ?? null;
        let helpfulCount = post.votes?.helpful_count || 0;
        let notHelpfulCount = post.votes?.not_helpful_count || 0;

        // Remove old vote
        if (oldVote === true) helpfulCount--;
        if (oldVote === false) notHelpfulCount--;

        // Add new vote
        if (helpful === true) helpfulCount++;
        if (helpful === false) notHelpfulCount++;

        return {
          ...post,
          votes: {
            helpful_count: Math.max(0, helpfulCount),
            not_helpful_count: Math.max(0, notHelpfulCount),
            user_vote: helpful,
          },
        };
      })
    );

    try {
      const res = await fetch(`/api/square/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful }),
      });
      if (!res.ok) {
        throw new Error("Vote failed");
      }
    } catch {
      // Revert on error - refetch
      toast.error("投票失败");
      fetchPosts(1);
      setPage(1);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("确定删除这条发布？")) return;

    // Optimistic remove
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      const res = await fetch(`/api/square/${postId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("已删除");
    } catch {
      toast.error("删除失败");
      // Revert
      fetchPosts(1);
      setPage(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">广场</h1>
          <p className="text-muted-foreground mt-1">
            分享你的发现，查看社区推荐
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          发布
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Post feed */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="暂无内容"
          description="成为第一个分享者吧！点击「发布」开始"
          action={
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              发布第一条
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onVote={handleVote}
              onDelete={handleDelete}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    加载中...
                  </>
                ) : (
                  "加载更多"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
