import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSquareTargetType } from "@/lib/square";
import type {
  SquarePost,
  SquarePostCreateInput,
  SquarePostMedia,
  SquarePostVotes,
} from "@/types";

/**
 * GET /api/square - List posts with pagination
 * Query params: page, limit, target_type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const targetType = searchParams.get("target_type");
    const offset = (page - 1) * limit;

    // Try to get current user (optional — for fetching their votes)
    const { userId } = await getAuthUser();

    const supabase = createAdminClient();

    // Build query for posts
    let query = supabase
      .from("square_posts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (targetType) {
      query = query.eq("target_type", targetType);
    }

    const { data: posts, error, count } = await query;

    if (error) throw error;
    if (!posts) {
      return NextResponse.json({ posts: [], total: 0, page, limit });
    }

    // Collect post IDs and user IDs for batch lookups
    const postIds = posts.map((p) => p.id);
    const userIds = [...new Set(posts.map((p) => p.user_id))];

    // Batch fetch: profiles, media, and votes in parallel
    const [profilesResult, mediaResult, votesResult, userVotesResult] =
      await Promise.all([
        // Fetch author profiles
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, avatar_seed")
          .in("id", userIds),

        // Fetch media for all posts
        supabase
          .from("square_post_media")
          .select("*")
          .in("post_id", postIds)
          .order("sort_order", { ascending: true }),

        // Fetch vote aggregates for all posts
        supabase
          .from("square_post_votes")
          .select("post_id, helpful")
          .in("post_id", postIds),

        // Fetch current user's votes (if authenticated)
        userId
          ? supabase
              .from("square_post_votes")
              .select("post_id, helpful")
              .in("post_id", postIds)
              .eq("user_id", userId)
          : Promise.resolve({ data: [] as { post_id: string; helpful: boolean }[] }),
      ]);

    // Build lookup maps
    const profileMap = new Map(
      (profilesResult.data || []).map((p) => [p.id, p])
    );

    const mediaMap = new Map<string, SquarePostMedia[]>();
    for (const m of mediaResult.data || []) {
      const list = mediaMap.get(m.post_id) || [];
      list.push(m as SquarePostMedia);
      mediaMap.set(m.post_id, list);
    }

    // Aggregate votes per post
    const voteAggMap = new Map<
      string,
      { helpful_count: number; not_helpful_count: number }
    >();
    for (const v of votesResult.data || []) {
      const agg = voteAggMap.get(v.post_id) || {
        helpful_count: 0,
        not_helpful_count: 0,
      };
      if (v.helpful) {
        agg.helpful_count++;
      } else {
        agg.not_helpful_count++;
      }
      voteAggMap.set(v.post_id, agg);
    }

    // Current user's votes
    const userVoteMap = new Map<string, boolean>();
    const userVotesData = Array.isArray(userVotesResult)
      ? []
      : (userVotesResult as { data: { post_id: string; helpful: boolean }[] | null }).data || [];
    for (const v of userVotesData) {
      userVoteMap.set(v.post_id, v.helpful);
    }

    // Assemble response
    const enrichedPosts: SquarePost[] = posts.map((post) => {
      const profile = profileMap.get(post.user_id);
      const agg = voteAggMap.get(post.id) || {
        helpful_count: 0,
        not_helpful_count: 0,
      };
      const userVote = userVoteMap.has(post.id)
        ? userVoteMap.get(post.id)!
        : null;

      const votes: SquarePostVotes = {
        helpful_count: agg.helpful_count,
        not_helpful_count: agg.not_helpful_count,
        user_vote: userVote,
      };

      return {
        id: post.id,
        user_id: post.user_id,
        title: post.title,
        content: post.content,
        rating: post.rating,
        target_type: post.target_type,
        target_id: post.target_id,
        target_url: post.target_url,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: profile
          ? {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              avatar_seed: profile.avatar_seed,
            }
          : undefined,
        media: mediaMap.get(post.id) || [],
        votes,
      };
    });

    return NextResponse.json({
      posts: enrichedPosts,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("[GET /api/square]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/square - Create a new post
 * Body: { title, content, rating?, target_type?, target_id?, target_url? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as SquarePostCreateInput;
    const { title, content, rating, target_type, target_id, target_url } = body;

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (rating !== undefined && rating !== null) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "Rating must be an integer between 1 and 5" },
          { status: 400 }
        );
      }
    }

    if (target_type !== undefined && target_type !== null && !isSquareTargetType(target_type)) {
      return NextResponse.json(
        { error: "Invalid target_type" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const insertData: Record<string, unknown> = {
      user_id: userId,
      title: title.trim(),
      content: content.trim(),
    };

    if (rating !== undefined) insertData.rating = rating;
    if (target_type !== undefined) insertData.target_type = target_type;
    if (target_id !== undefined) insertData.target_id = target_id;
    if (target_url !== undefined) insertData.target_url = target_url;

    const { data: post, error } = await supabase
      .from("square_posts")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/square]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
