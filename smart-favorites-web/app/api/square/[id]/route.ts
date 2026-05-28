import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { isSquareTargetType } from "@/lib/square";
import type {
  SquarePost,
  SquarePostMedia,
  SquarePostUpdateInput,
  SquarePostVotes,
} from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/square/[id] - Get a single post by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Try to get current user (optional)
    const { userId } = await getAuthUser(request);

    const supabase = await createServerSupabaseClient();

    // Fetch the post
    const { data: post, error } = await supabase
      .from("square_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code === "PGRST116") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (error) throw error;
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Fetch author profile, media, votes in parallel
    const [profileResult, mediaResult, votesResult, userVoteResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, avatar_seed")
          .eq("id", post.user_id)
          .single(),

        supabase
          .from("square_post_media")
          .select("*")
          .eq("post_id", id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("square_post_votes")
          .select("helpful")
          .eq("post_id", id),

        userId
          ? supabase
              .from("square_post_votes")
              .select("helpful")
              .eq("post_id", id)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    // Aggregate votes
    const helpfulCount = (votesResult.data || []).filter(
      (v) => v.helpful
    ).length;
    const notHelpfulCount = (votesResult.data || []).filter(
      (v) => !v.helpful
    ).length;

    const userVote =
      userVoteResult.data !== null && userVoteResult.data !== undefined
        ? (userVoteResult.data as { helpful: boolean }).helpful
        : null;

    const votes: SquarePostVotes = {
      helpful_count: helpfulCount,
      not_helpful_count: notHelpfulCount,
      user_vote: userVote,
    };

    const profile = profileResult.data;
    const enrichedPost: SquarePost = {
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
      media: (mediaResult.data as SquarePostMedia[]) || [],
      votes,
    };

    return NextResponse.json(enrichedPost);
  } catch (error: any) {
    console.error("[GET /api/square/[id]]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/square/[id] - Update own post
 * Body: { title?, content?, rating?, target_type?, target_url? }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check post exists and belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from("square_posts")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (fetchError) throw fetchError;

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: "You can only edit your own posts" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as SquarePostUpdateInput;
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      updateData.title = body.title.trim();
    }

    if (body.content !== undefined) {
      if (
        typeof body.content !== "string" ||
        body.content.trim().length === 0
      ) {
        return NextResponse.json(
          { error: "Content cannot be empty" },
          { status: 400 }
        );
      }
      updateData.content = body.content.trim();
    }

    if (body.rating !== undefined) {
      if (
        body.rating !== null &&
        (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)
      ) {
        return NextResponse.json(
          { error: "Rating must be an integer between 1 and 5" },
          { status: 400 }
        );
      }
      updateData.rating = body.rating;
    }

    if (body.target_type !== undefined) {
      if (body.target_type !== null && !isSquareTargetType(body.target_type)) {
        return NextResponse.json(
          { error: "Invalid target_type" },
          { status: 400 }
        );
      }
      updateData.target_type = body.target_type;
    }

    if (body.target_url !== undefined) {
      updateData.target_url = body.target_url;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("square_posts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PUT /api/square/[id]]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/square/[id] - Delete own post
 * Cascade deletes media and votes via DB constraints.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { userId } = await getAuthUser(_request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check post exists and belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from("square_posts")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (fetchError) throw fetchError;

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    const { data: mediaRows, error: mediaError } = await supabase
      .from("square_post_media")
      .select("storage_path")
      .eq("post_id", id);

    if (mediaError) throw mediaError;

    const storagePaths = (mediaRows || [])
      .map((row) => row.storage_path)
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("square_media")
        .remove(storagePaths);

      if (storageError) {
        console.error(
          "[DELETE /api/square/[id]] storage cleanup error",
          storageError
        );
      }
    }

    const { error: deleteError } = await supabase
      .from("square_posts")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/square/[id]]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
