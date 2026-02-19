import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/square/[id]/vote - Vote on a post
 * Body: { helpful: boolean } or { helpful: null } to remove vote
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: postId } = await context.params;

    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { helpful } = body;

    // Validate helpful field exists
    if (!("helpful" in body)) {
      return NextResponse.json(
        { error: "Missing 'helpful' field (boolean or null)" },
        { status: 400 }
      );
    }

    if (helpful !== null && typeof helpful !== "boolean") {
      return NextResponse.json(
        { error: "'helpful' must be a boolean or null" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify the post exists
    const { data: post, error: postError } = await supabase
      .from("square_posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (postError && postError.code === "PGRST116") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (postError) throw postError;
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (helpful === null) {
      // Remove the vote
      await supabase
        .from("square_post_votes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
    } else {
      // Upsert the vote — check if vote exists, then insert or update
      const { data: existingVote } = await supabase
        .from("square_post_votes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingVote) {
        const { error: updateError } = await supabase
          .from("square_post_votes")
          .update({ helpful })
          .eq("post_id", postId)
          .eq("user_id", userId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("square_post_votes")
          .insert({
            post_id: postId,
            user_id: userId,
            helpful,
          });
        if (insertError) throw insertError;
      }
    }

    // Fetch updated vote counts
    const { data: allVotes, error: votesError } = await supabase
      .from("square_post_votes")
      .select("helpful")
      .eq("post_id", postId);

    if (votesError) throw votesError;

    const helpfulCount = (allVotes || []).filter((v) => v.helpful).length;
    const notHelpfulCount = (allVotes || []).filter((v) => !v.helpful).length;

    return NextResponse.json({
      helpful_count: helpfulCount,
      not_helpful_count: notHelpfulCount,
      user_vote: helpful,
    });
  } catch (error: any) {
    console.error("[POST /api/square/[id]/vote]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
