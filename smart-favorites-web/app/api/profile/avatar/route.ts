import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth/get-user";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * POST /api/profile/avatar - Upload a custom avatar image
 * Accepts multipart FormData with an "avatar" file field.
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

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No avatar file provided" },
        { status: 400 }
      );
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 2 MB.`,
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Build storage path: {user_id}/{timestamp}.{ext}
    const ext = EXTENSION_MAP[file.type] || "png";
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("[POST /api/profile/avatar] upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Update profile with the new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      console.error("[POST /api/profile/avatar] profile update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({ avatar_url: publicUrl });
  } catch (error: any) {
    console.error("[POST /api/profile/avatar]", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
