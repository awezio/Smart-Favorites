import * as cheerio from "cheerio";
import type { Bookmark, DiffResult } from "@/types";
import { parseNetscapeTimestamp } from "@/lib/utils/timestamp";

export type ParsedBookmark = {
  title: string;
  url: string;
  folder_path?: string;
  add_date?: string;
  icon?: string;
};

export function parseBookmarksHtml(htmlContent: string): ParsedBookmark[] {
  const $ = cheerio.load(htmlContent);
  const rootDl = $("dl").first();

  if (!rootDl.length) {
    return [];
  }

  const results: ParsedBookmark[] = [];

  function joinFolderPath(basePath: string, folderName: string) {
    if (!folderName) return basePath;
    if (!basePath || basePath === "/") return `/${folderName}`;
    return `${basePath}/${folderName}`;
  }

  function walkDl(dl: cheerio.Cheerio<any>, basePath: string) {
    dl.children("dt").each((_: number, dt: any) => {
      const dtNode = $(dt);
      const h3 = dtNode.children("h3").first();
      const link = dtNode.children("a").first();

      if (h3.length) {
        const folderName = h3.text().trim();
        const nestedDl = dtNode.children("dl").first();
        const siblingDl = dtNode.next("dl").first();
        const folderPath = joinFolderPath(basePath, folderName);

        if (nestedDl.length) {
          walkDl(nestedDl, folderPath);
        } else if (siblingDl.length) {
          walkDl(siblingDl, folderPath);
        }
        return;
      }

      if (link.length) {
        const title = link.text().trim();
        const url = link.attr("href") || "";
        if (!url) {
          return;
        }

        const rawAddDate = link.attr("add_date") || undefined;
        results.push({
          title: title || url,
          url,
          folder_path: basePath === "/" ? "" : basePath,
          add_date: parseNetscapeTimestamp(rawAddDate),
          icon: link.attr("icon") || undefined,
        });
      }
    });
  }

  walkDl(rootDl, "/");
  return results;
}

export function toBookmarkRecord(parsed: ParsedBookmark): Omit<Bookmark, "id" | "user_id" | "updated_at"> {
  return {
    title: parsed.title,
    url: parsed.url,
    description: "",
    folder_path: parsed.folder_path || "",
    add_date: parsed.add_date,
    icon: parsed.icon,
    created_at: new Date().toISOString(),
  };
}

export function diffBookmarks(
  existing: Bookmark[],
  incoming: Array<Bookmark | ParsedBookmark>
): DiffResult<Bookmark> {
  const existingByUrl = new Map(existing.map((item) => [item.url, item]));
  const incomingByUrl = new Map(
    incoming.map((item) => [item.url, toBookmark(item)])
  );

  const added: Bookmark[] = [];
  const removed: Bookmark[] = [];
  const modified: DiffResult<Bookmark>["modified"] = [];
  let unchangedCount = 0;

  for (const [url, newItem] of incomingByUrl.entries()) {
    const oldItem = existingByUrl.get(url);
    if (!oldItem) {
      added.push(newItem);
      continue;
    }

    const titleChanged = oldItem.title !== newItem.title;
    const folderChanged = (oldItem.folder_path || "") !== (newItem.folder_path || "");
    const descriptionChanged = (oldItem.description || "") !== (newItem.description || "");

    if (titleChanged || folderChanged || descriptionChanged) {
      const changeType = titleChanged ? "title" : "data";
      modified.push({
        old: oldItem,
        new: newItem,
        change_type: changeType,
      });
    } else {
      unchangedCount += 1;
    }
  }

  for (const [url, oldItem] of existingByUrl.entries()) {
    if (!incomingByUrl.has(url)) {
      removed.push(oldItem);
    }
  }

  return {
    added,
    removed,
    modified,
    unchanged_count: unchangedCount,
  };
}

function toBookmark(item: Bookmark | ParsedBookmark): Bookmark {
  if ("user_id" in item) {
    return item as Bookmark;
  }

  return {
    id: "",
    user_id: "",
    title: item.title,
    url: item.url,
    description: "",
    folder_path: item.folder_path || "",
    add_date: item.add_date,
    icon: item.icon,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
