import { NextRequest, NextResponse } from "next/server";
import { generateBookmarkDescription } from "@/lib/ai/description-generator";
import { updateBookmark } from "@/lib/db/bookmarks";
import { updateStar } from "@/lib/db/github-stars";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { type, item, batch = false } = body;

    if (!type || !item) {
      return NextResponse.json(
        { error: "Type and item are required" },
        { status: 400 }
      );
    }

    if (type === "bookmark") {
      const description = await generateBookmarkDescription(item.url, item.title);

      const textToEmbed = `${item.title} ${description} ${item.url}`;
      const embedding = await generateEmbedding(textToEmbed);

      await updateBookmark(item.id, {
        description,
        embedding,
      });

      return NextResponse.json({
        success: true,
        description,
      });
    } else if (type === "star") {
      const textToEmbed = `${item.owner}/${item.repo} ${item.description || ""} ${item.language || ""}`;
      const embedding = await generateEmbedding(textToEmbed);

      await updateStar(item.id, {
        embedding,
      });

      return NextResponse.json({
        success: true,
        description: item.description,
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
