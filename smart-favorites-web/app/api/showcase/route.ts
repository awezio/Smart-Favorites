import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultShowcaseItems } from "@/lib/showcase";
import type { SnapshotCardData } from "@/components/snapshot-grid";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: posts } = await supabase
      .from("square_posts")
      .select("id, title, target_url, target_id, target_type")
      .eq("target_type", "bookmark")
      .not("target_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(12);

    if (!posts?.length) {
      return NextResponse.json({ items: defaultShowcaseItems });
    }

    const bookmarkIds = posts
      .map((post) => post.target_id)
      .filter((id): id is string => Boolean(id));

    const { data: bookmarks } = await supabase
      .from("bookmarks")
      .select("id, title, url, snapshot_url, snapshot_status")
      .in("id", bookmarkIds);

    const bookmarkMap = new Map((bookmarks || []).map((b) => [b.id, b]));

    const fromSquare = posts.flatMap((post): SnapshotCardData[] => {
      const bookmark = post.target_id
        ? bookmarkMap.get(post.target_id)
        : undefined;
      const url = post.target_url || bookmark?.url;
      if (!url) return [];

      return [
        {
          id: post.id,
          title: post.title || bookmark?.title || url,
          url,
          category: "Square",
          snapshotUrl:
            bookmark?.snapshot_status === "ready"
              ? bookmark.snapshot_url
              : null,
        },
      ];
    });

    const withSnapshots = fromSquare.filter((item) => item.snapshotUrl);
    const merged =
      withSnapshots.length >= 3
        ? withSnapshots.slice(0, 6)
        : [...fromSquare, ...defaultShowcaseItems].slice(0, 6);

    return NextResponse.json({ items: merged });
  } catch (error) {
    console.error("[GET /api/showcase]", error);
    return NextResponse.json({ items: defaultShowcaseItems });
  }
}
