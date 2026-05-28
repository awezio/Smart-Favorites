import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import type { SquareFeedStats, SquareTargetType } from "@/types";

const TARGET_TYPES: SquareTargetType[] = ["bookmark", "star", "general"];

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const [postsResult, mediaResult, votesResult, profilesResult] =
      await Promise.all([
        supabase.from("square_posts").select("id, target_type, created_at"),
        supabase.from("square_post_media").select("id"),
        supabase.from("square_post_votes").select("helpful"),
        supabase.from("profiles").select("id"),
      ]);

    if (postsResult.error) throw postsResult.error;
    if (mediaResult.error) throw mediaResult.error;
    if (votesResult.error) throw votesResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const posts = postsResult.data || [];
    const helpfulVotes = (votesResult.data || []).filter((vote) => vote.helpful).length;
    const notHelpfulVotes = (votesResult.data || []).filter((vote) => !vote.helpful).length;

    const postsByType = TARGET_TYPES.reduce((acc, type) => {
      acc[type] = posts.filter((post) => post.target_type === type).length;
      return acc;
    }, {} as Record<SquareTargetType, number>);

    const stats: SquareFeedStats = {
      total_posts: posts.length,
      total_media: mediaResult.data?.length || 0,
      active_authors: profilesResult.data?.length || 0,
      latest_post_at: posts[0]?.created_at || null,
      helpful_votes: helpfulVotes,
      not_helpful_votes: notHelpfulVotes,
      posts_by_type: postsByType,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("[GET /api/square/stats]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
