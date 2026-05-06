import { Bookmark, DiffResult } from "@/types";

interface ParsedBookmark {
  title: string;
  url: string;
  folder_path: string;
  add_date?: string;
  icon?: string;
}

export function parseBookmarksHtml(html: string): ParsedBookmark[] {
  const results: ParsedBookmark[] = [];
  const folderStack: string[] = [];

  // Normalize line endings
  const text = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect folder open: <DT><H3 ...>Folder Name</H3>
    const folderMatch = trimmed.match(/<H3[^>]*>([^<]+)<\/H3>/i);
    if (folderMatch) {
      folderStack.push(folderMatch[1].trim());
      continue;
    }

    // Detect folder close: </DL>
    if (/<\/DL>/i.test(trimmed)) {
      folderStack.pop();
      continue;
    }

    // Detect bookmark: <A HREF="..." ...>Title</A>
    const bookmarkMatch = trimmed.match(
      /<A\s+HREF="([^"]*)"([^>]*)>([^<]*)<\/A>/i
    );
    if (bookmarkMatch) {
      const url = bookmarkMatch[1];
      const attrs = bookmarkMatch[2];
      const title = bookmarkMatch[3].trim();

      const addDateMatch = attrs.match(/ADD_DATE="(\d+)"/i);
      const iconMatch = attrs.match(/ICON="([^"]*)"/i);

      results.push({
        title: title || url,
        url,
        folder_path: folderStack.join("/"),
        add_date: addDateMatch ? addDateMatch[1] : undefined,
        icon: iconMatch ? iconMatch[1] : undefined,
      });
    }
  }

  return results;
}

export function toBookmarkRecord(
  parsed: ParsedBookmark,
  userId?: string
): Omit<Bookmark, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId ?? "",
    title: parsed.title,
    url: parsed.url,
    folder_path: parsed.folder_path || undefined,
    add_date: parsed.add_date || undefined,
    icon: parsed.icon || undefined,
    description: undefined,
    embedding: undefined,
    source_hash: undefined,
  };
}

export function diffBookmarks(
  existing: Bookmark[],
  newBookmarks: Bookmark[]
): DiffResult<Bookmark> {
  const existingByUrl = new Map(existing.map((b) => [b.url, b]));
  const newByUrl = new Map(newBookmarks.map((b) => [b.url, b]));

  const added: Bookmark[] = [];
  const removed: Bookmark[] = [];
  const modified: DiffResult<Bookmark>["modified"] = [];
  let unchanged_count = 0;

  for (const nb of newBookmarks) {
    const eb = existingByUrl.get(nb.url);
    if (!eb) {
      added.push(nb);
    } else {
      const titleChanged = eb.title !== nb.title;
      const folderChanged = eb.folder_path !== nb.folder_path;
      if (titleChanged || folderChanged) {
        const changeType = titleChanged && folderChanged ? "both" : titleChanged ? "title" : "both";
        modified.push({
          old: eb,
          new: { ...eb, title: nb.title, folder_path: nb.folder_path },
          change_type: changeType,
        });
      } else {
        unchanged_count++;
      }
    }
  }

  for (const eb of existing) {
    if (!newByUrl.has(eb.url)) {
      removed.push(eb);
    }
  }

  return { added, removed, modified, unchanged_count };
}
