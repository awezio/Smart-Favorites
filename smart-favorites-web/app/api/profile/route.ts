import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/get-user";
import type { Profile } from "@/types";

/**
 * GET /api/profile - Get current user's profile
 * Creates a default profile if one doesn't exist yet.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, userId } = await getAuthUser(request);
    if (!userId || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Try to fetch existing profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = row not found; any other error is unexpected
      throw error;
    }

    if (profile) {
      return NextResponse.json(profile);
    }

    // No profile exists — create a default one
    const meta = "user_metadata" in user ? user.user_metadata : null;
    const email = "email" in user ? user.email : null;
    const defaultProfile = {
      id: userId,
      display_name:
        meta?.full_name ||
        meta?.name ||
        (email ? email.split("@")[0] : null) ||
        "User",
      avatar_url: meta?.avatar_url || null,
      avatar_seed: userId, // unique DiceBear seed per user
      bio: null,
    };

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(defaultProfile)
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(newProfile);
  } catch (error: any) {
    console.error("[GET /api/profile]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile - Update current user's profile
 * Accepts optional fields: display_name, bio, avatar_url, avatar_seed
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const supabase = await createServerSupabaseClient();

    // Build update payload — only include fields that were provided
    const updateData: Partial<Pick<Profile, "display_name" | "bio" | "avatar_url" | "avatar_seed">> = {};

    if (body.display_name !== undefined) {
      updateData.display_name = body.display_name;
    }
    if (body.bio !== undefined) {
      updateData.bio = body.bio;
    }
    if (body.avatar_url !== undefined) {
      updateData.avatar_url = body.avatar_url;
    }
    if (body.avatar_seed !== undefined) {
      updateData.avatar_seed = body.avatar_seed;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PUT /api/profile]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
