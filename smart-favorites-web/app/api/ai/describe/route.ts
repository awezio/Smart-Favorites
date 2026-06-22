import { NextRequest, NextResponse } from "next/server";
import { generateBookmarkDescription, generateStarDescription } from "@/lib/ai/description-generator";
import { updateBookmark } from "@/lib/db/bookmarks";
import { updateStar } from "@/lib/db/github-stars";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { type, item, batch = false } = body;
    const supabase = await createServerSupabaseClient();

    if (!type || !item) {
      return NextResponse.json(
        { error: "Type and item are required" },
        { status: 400 }
      );
    }

    if (type === "bookmark") {
      const generated = await generateBookmarkDescription(item.url, item.title, { userId });

      const textToEmbed = `${item.title} ${generated.description_zh} ${generated.description_en} ${item.url}`;
      const embedding = await generateEmbedding(textToEmbed, { userId });

      await updateBookmark(
        item.id,
        {
          description: generated.description_zh,
          description_zh: generated.description_zh,
          description_en: generated.description_en,
          description_metadata: generated.description_metadata,
          embedding,
        },
        userId,
        supabase
      );

      return NextResponse.json({
        success: true,
        description: generated.description_zh,
        ...generated,
      });
    } else if (type === "star") {
      const generated = await generateStarDescription(item, { userId });
      const textToEmbed = `${item.owner}/${item.repo} ${generated.description_zh} ${generated.description_en} ${item.language || ""}`;
      const embedding = await generateEmbedding(textToEmbed, { userId });

      await updateStar(
        item.id,
        {
          description: generated.description_zh,
          description_zh: generated.description_zh,
          description_en: generated.description_en,
          description_metadata: generated.description_metadata,
          embedding,
        },
        userId,
        supabase
      );

      return NextResponse.json({
        success: true,
        description: generated.description_zh,
        ...generated,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("AI describe error:", error);
    return NextResponse.json(
      { error: error.message || "Description generation failed" },
      { status: 500 }
    );
  }
}
