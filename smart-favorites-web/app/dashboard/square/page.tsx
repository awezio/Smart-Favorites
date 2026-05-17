"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Globe, Plus, Loader2, Sparkles, Users, Image as ImageIcon, ThumbsUp, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { PostCard } from "@/components/square/post-card";
import { CreatePostModal } from "@/components/square/create-post-modal";
import { createClient } from "@/lib/supabase/client";
import { SQUARE_TARGET_OPTIONS } from "@/lib/square";
import type { SquareFeedStats, SquarePost } from "@/types";

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
  const [stats, setStats] = useState<SquareFeedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  const supabase = useMemo(() => createClient(), []);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    getUser();
  }, [supabase]);

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

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/square/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data: SquareFeedStats = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to load square stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Initial load and filter change
  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchPosts(1).finally(() => setLoading(false));
  }, [filter, fetchPosts]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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
    void loadStats();
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
      void loadStats();
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
      void loadStats();
    } catch {
      toast.error("删除失败");
      // Revert
      fetchPosts(1);
      setPage(1);
    }
  };

  const heroStats = [
    {
      label: "帖子",
      value: statsLoading ? "..." : String(stats?.total_posts ?? posts.length),
      icon: TrendingUp,
    },
    {
      label: "媒体",
      value: statsLoading ? "..." : String(stats?.total_media ?? 0),
      icon: ImageIcon,
    },
    {
      label: "作者",
      value: statsLoading ? "..." : String(stats?.active_authors ?? 0),
      icon: Users,
    },
    {
      label: "有用投票",
      value: statsLoading ? "..." : String(stats?.helpful_votes ?? 0),
      icon: ThumbsUp,
    },
  ];

  const targetCounts = stats?.posts_by_type ?? {
    bookmark: 0,
    star: 0,
    general: 0,
  };

  const filterButtons = FILTER_OPTIONS.map((opt) => {
    const count =
      opt.value === "all" ? stats?.total_posts ?? posts.length : targetCounts[opt.value];

    return {
      ...opt,
      count,
    };
  });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 p-6 text-white shadow-[0_20px_80px_-24px_rgba(15,23,42,0.75)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.16),transparent_28%)]" />
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge
              variant="secondary"
              className="w-fit border-white/20 bg-white/10 text-white"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              社区广场
            </Badge>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                分享、评测、发现
              </h1>
              <p className="max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                这里是你整理书签、GitHub Stars 和灵感碎片的公共展示台。
                发帖、投票、晒资源，让好的信息更容易被看见。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 hover:bg-white/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                发布内容
              </Button>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80">
                <TrendingUp className="h-4 w-4" />
                最新动态已开启
              </div>
            </div>
          </div>

          <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-none lg:min-w-[36rem]">
            {heroStats.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
                >
                  <div className="flex items-center justify-between text-white/75">
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">
                      {item.label}
                    </span>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold">{item.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {SQUARE_TARGET_OPTIONS.map((option) => (
          <Card key={option.value} className="border-dashed bg-card/80">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {targetCounts[option.value]}
                </div>
                <div className="text-xs text-muted-foreground">条发布</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {filterButtons.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(opt.value)}
            className="gap-2"
          >
            <span>{opt.label}</span>
            <Badge variant={filter === opt.value ? "secondary" : "outline"} className="h-5 px-2 text-[11px]">
              {opt.count}
            </Badge>
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
