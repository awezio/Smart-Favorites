import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser, adminErrorResponse } from "@/lib/auth/admin";
import {
  isValidShowcaseUrl,
  normalizeShowcaseImageUrl,
} from "@/lib/showcase-homepage";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser(request);
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.url === "string") {
      const url = body.url.trim();
      if (!isValidShowcaseUrl(url)) {
        return NextResponse.json({ error: "url must be a valid http(s) URL" }, { status: 400 });
      }
      updates.url = url;
    }
    if (typeof body.image_url === "string") {
      updates.image_url = normalizeShowcaseImageUrl(body.image_url);
    }
    if (typeof body.category === "string") {
      updates.category = body.category.trim() || null;
    }
    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
      updates.sort_order = body.sort_order;
    }
    if (body.bookmark_id === null) {
      updates.bookmark_id = null;
    } else if (typeof body.bookmark_id === "string") {
      updates.bookmark_id = body.bookmark_id.trim() || null;
    }
    if (body.bookmark_url_match === null) {
      updates.bookmark_url_match = null;
    } else if (typeof body.bookmark_url_match === "string") {
      updates.bookmark_url_match = body.bookmark_url_match.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("homepage_showcase_items")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser(request);
    const { id } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from("homepage_showcase_items").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
