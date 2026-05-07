import { NextRequest, NextResponse } from "next/server";
import { getBookmarks } from "@/lib/db/bookmarks";
import { getAuthUser } from "@/lib/auth/get-user";

// Conservative concurrency to reduce network pressure and timeouts.
const LINK_CHECK_CONCURRENCY = 5;

interface LinkCheckResult {
  id: string;
  url: string;
  title: string;
  status: "ok" | "dead" | "error" | "redirect";
  statusCode?: number;
  finalUrl?: string;
  error?: string;
}

async function checkUrl(url: string): Promise<{
  status: "ok" | "dead" | "error" | "redirect";
  statusCode?: number;
  finalUrl?: string;
  error?: string;
}> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SmartFavorites-LinkChecker/1.0)",
      },
    });

    const finalUrl = res.url !== url ? res.url : undefined;

    if (res.status >= 400) {
      return { status: "dead", statusCode: res.status, finalUrl };
    }

    if (finalUrl) {
      return { status: "redirect", statusCode: res.status, finalUrl };
    }

    return { status: "ok", statusCode: res.status };
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      return { status: "error", error: "Timeout (10s)" };
    }
    return { status: "error", error: err.message };
  }
}

/**
 * POST /api/bookmarks/check-links
 * Checks a batch of bookmark URLs for dead links.
 *
 * Body: { ids?: string[] }
 * If ids is empty/omitted, checks all bookmarks for the user.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { ids } = body as { ids?: string[] };

    // Load all bookmarks in pages
    const pageSize = 500;
    const allBookmarks = [];
    for (let offset = 0; ; offset += pageSize) {
      const page = await getBookmarks(pageSize, offset, userId);
      allBookmarks.push(...page);
      if (page.length < pageSize) break;
    }
    const toCheck = ids?.length
      ? allBookmarks.filter((b) => ids.includes(b.id))
      : allBookmarks;

    if (toCheck.length === 0) {
      return NextResponse.json({ results: [], checked: 0 });
    }

    // Check URLs concurrently
    const results: LinkCheckResult[] = [];

    for (let i = 0; i < toCheck.length; i += LINK_CHECK_CONCURRENCY) {
      const batch = toCheck.slice(i, i + LINK_CHECK_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (bookmark) => {
          const check = await checkUrl(bookmark.url);
          return {
            id: bookmark.id,
            url: bookmark.url,
            title: bookmark.title,
            ...check,
          } as LinkCheckResult;
        })
      );
      results.push(...batchResults);
    }

    const dead = results.filter((r) => r.status === "dead" || r.status === "error");

    return NextResponse.json({
      results,
      checked: results.length,
      dead: dead.length,
      ok: results.filter((r) => r.status === "ok").length,
      redirects: results.filter((r) => r.status === "redirect").length,
    });
  } catch (error: any) {
    console.error("[check-links]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
