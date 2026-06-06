import { NextRequest, NextResponse } from "next/server";
import { parseBookmarksHtml, diffBookmarks, toBookmarkRecord } from "@/lib/parsers/bookmark-parser";
import { getBookmarks } from "@/lib/db/bookmarks";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { htmlContent, format = "json" } = body;

    if (!htmlContent || typeof htmlContent !== "string") {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    const parsedBookmarks = parseBookmarksHtml(htmlContent);
    const supabase = await createServerSupabaseClient();
    const existingBookmarks = await getBookmarks(10000, 0, userId, supabase);

    const newBookmarks = parsedBookmarks.map(pb => ({
      ...toBookmarkRecord(pb),
      id: '',
      created_at: new Date().toISOString(),
    }));

    const diff = diffBookmarks(existingBookmarks, newBookmarks);

    if (format === "markdown") {
      const markdown = generateDiffMarkdown(diff);
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="bookmarks_diff_${new Date().toISOString().split("T")[0]}.md"`,
        },
      });
    }

    return NextResponse.json({
      diff,
      summary: {
        added: diff.added.length,
        modified: diff.modified.length,
        removed: diff.removed.length,
        unchanged: diff.unchanged_count,
      },
    });
  } catch (error: any) {
    console.error("Bookmark diff error:", error);
    return NextResponse.json(
      { error: error.message || "Diff failed" },
      { status: 500 }
    );
  }
}

function generateDiffMarkdown(diff: any): string {
  let md = `# 书签变更报告\n\n`;
  md += `生成时间: ${new Date().toLocaleString("zh-CN")}\n\n`;
  md += `## 统计摘要\n\n`;
  md += `- 新增: ${diff.added.length}\n`;
  md += `- 修改: ${diff.modified.length}\n`;
  md += `- 删除: ${diff.removed.length}\n`;
  md += `- 未变更: ${diff.unchanged_count}\n\n`;

  if (diff.added.length > 0) {
    md += `## 新增书签 (${diff.added.length})\n\n`;
    diff.added.forEach((bookmark: any, index: number) => {
      md += `### ${index + 1}. ${bookmark.title}\n`;
      md += `- URL: ${bookmark.url}\n`;
      if (bookmark.folder_path) md += `- 路径: ${bookmark.folder_path}\n`;
      if (bookmark.description) md += `- 描述: ${bookmark.description}\n`;
      md += `\n`;
    });
  }

  if (diff.modified.length > 0) {
    md += `## 修改书签 (${diff.modified.length})\n\n`;
    diff.modified.forEach((item: any, index: number) => {
      md += `### ${index + 1}. 变更类型: ${item.change_type}\n`;
      md += `#### 原内容\n`;
      md += `- 标题: ${item.old.title}\n`;
      md += `- URL: ${item.old.url}\n`;
      md += `#### 新内容\n`;
      md += `- 标题: ${item.new.title}\n`;
      md += `- URL: ${item.new.url}\n`;
      md += `\n`;
    });
  }

  if (diff.removed.length > 0) {
    md += `## 删除书签 (${diff.removed.length})\n\n`;
    diff.removed.forEach((bookmark: any, index: number) => {
      md += `### ${index + 1}. ${bookmark.title}\n`;
      md += `- URL: ${bookmark.url}\n`;
      md += `\n`;
    });
  }

  return md;
}
