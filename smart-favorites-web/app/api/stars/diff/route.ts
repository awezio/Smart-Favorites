import { NextRequest, NextResponse } from "next/server";
import { fetchUserStars, diffStars } from "@/lib/parsers/github-stars";
import { getStars } from "@/lib/db/github-stars";
import { getAuthUser } from "@/lib/auth/get-user";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { username, token, format = "json" } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "GitHub username is required" },
        { status: 400 }
      );
    }

    // Fetch new stars from GitHub
    const newStars = await fetchUserStars(username, token);

    // Get existing stars for this user
    const existingStars = await getStars(10000, 0, userId);

    // Perform diff
    const diff = diffStars(existingStars, newStars);

    if (format === "markdown") {
      const markdown = generateDiffMarkdown(diff);
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="stars_diff_${new Date().toISOString().split("T")[0]}.md"`,
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
    console.error("Stars diff error:", error);
    return NextResponse.json(
      { error: error.message || "Diff failed" },
      { status: 500 }
    );
  }
}

function generateDiffMarkdown(diff: any): string {
  let md = `# GitHub Stars 变更报告\n\n`;
  md += `生成时间: ${new Date().toLocaleString("zh-CN")}\n\n`;
  md += `## 统计摘要\n\n`;
  md += `- 新增: ${diff.added.length}\n`;
  md += `- 修改: ${diff.modified.length}\n`;
  md += `- 删除: ${diff.removed.length}\n`;
  md += `- 未变更: ${diff.unchanged_count}\n\n`;

  if (diff.added.length > 0) {
    md += `## 新增 Stars (${diff.added.length})\n\n`;
    diff.added.forEach((star: any, index: number) => {
      md += `### ${index + 1}. ${star.owner}/${star.repo}\n`;
      md += `- URL: ${star.url}\n`;
      if (star.description) md += `- 描述: ${star.description}\n`;
      if (star.language) md += `- 语言: ${star.language}\n`;
      md += `- Stars: ${star.stars} | Forks: ${star.forks}\n`;
      md += `\n`;
    });
  }

  if (diff.modified.length > 0) {
    md += `## 修改 Stars (${diff.modified.length})\n\n`;
    diff.modified.forEach((item: any, index: number) => {
      md += `### ${index + 1}. ${item.new.owner}/${item.new.repo}\n`;
      md += `- 变更类型: ${item.change_type}\n`;
      md += `- Stars: ${item.old.stars} → ${item.new.stars}\n`;
      md += `- Forks: ${item.old.forks} → ${item.new.forks}\n`;
      md += `\n`;
    });
  }

  if (diff.removed.length > 0) {
    md += `## 删除 Stars (${diff.removed.length})\n\n`;
    diff.removed.forEach((star: any, index: number) => {
      md += `### ${index + 1}. ${star.owner}/${star.repo}\n`;
      md += `- URL: ${star.url}\n`;
      md += `\n`;
    });
  }

  return md;
}
