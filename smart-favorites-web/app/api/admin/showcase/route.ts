import { NextRequest, NextResponse } from "next/server";
import { listHomepageShowcaseItems } from "@/lib/admin/homepage-showcase";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser, adminErrorResponse } from "@/lib/auth/admin";
import {
  isValidShowcaseUrl,
  normalizeShowcaseImageUrl,
} from "@/lib/showcase-homepage";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request);
    const items = await listHomepageShowcaseItems();
    return NextResponse.json({ items });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser(request);
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const imageUrl =
      typeof body.image_url === "string" ? normalizeShowcaseImageUrl(body.image_url) : "";
    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim()
        : null;
    const enabled = body.enabled !== false;
    const sortOrder =
      typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
        ? body.sort_order
        : 0;
    const bookmarkId =
      typeof body.bookmark_id === "string" && body.bookmark_id.trim()
        ? body.bookmark_id.trim()
        : null;
    const bookmarkUrlMatch =
      typeof body.bookmark_url_match === "string" && body.bookmark_url_match.trim()
        ? body.bookmark_url_match.trim()
        : null;

    if (!title || !url || !imageUrl) {
      return NextResponse.json(
        { error: "title, url, and image_url are required" },
        { status: 400 }
      );
    }

    if (!isValidShowcaseUrl(url)) {
      return NextResponse.json({ error: "url must be a valid http(s) URL" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("homepage_showcase_items")
      .insert({
        title,
        url,
        image_url: imageUrl,
        category,
        enabled,
        sort_order: sortOrder,
        bookmark_id: bookmarkId,
        bookmark_url_match: bookmarkUrlMatch,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
