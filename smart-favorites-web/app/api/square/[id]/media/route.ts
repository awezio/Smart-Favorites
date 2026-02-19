import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  return map[mimeType] || "bin";
}

/**
 * POST /api/square/[id]/media - Upload media for a post
 * Accepts FormData with "file" field.
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

    const supabase = createAdminClient();

    // Verify post exists and belongs to user
    const { data: post, error: postError } = await supabase
      .from("square_posts")
      .select("id, user_id")
      .eq("id", postId)
      .single();

    if (postError && postError.code === "PGRST116") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (postError) throw postError;

    if (post.user_id !== userId) {
      return NextResponse.json(
        { error: "You can only add media to your own posts" },
        { status: 403 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Use 'file' field in FormData." },
        { status: 400 }
      );
    }

    const mimeType = file.type;
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${mimeType}. Allowed: jpg, png, gif, webp, mp4, webm`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const limitMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        {
          error: `File too large. Maximum size for ${isImage ? "images" : "videos"} is ${limitMB}MB`,
        },
        { status: 400 }
      );
    }

    // Build storage path
    const ext = getExtension(mimeType);
    const timestamp = Date.now();
    const storagePath = `${postId}/${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("square_media")
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("square_media").getPublicUrl(storagePath);

    // Get current media count for sort_order
    const { count: mediaCount } = await supabase
      .from("square_post_media")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    // Insert media record
    const { data: mediaRecord, error: insertError } = await supabase
      .from("square_post_media")
      .insert({
        post_id: postId,
        url: publicUrl,
        media_type: isImage ? "image" : "video",
        sort_order: mediaCount || 0,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(mediaRecord, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/square/[id]/media]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
