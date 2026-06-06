import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const chatPagePath = join(repoRoot, "app", "dashboard", "chat", "page.tsx");
const source = readFileSync(chatPagePath, "utf8");

assert.match(
  source,
  /const\s+openSession\s*=\s*useCallback/,
  "Chat page should use an openSession callback for selecting saved conversations."
);

assert.match(
  source,
  /fetch\(`\/api\/chat\/sessions\/\$\{session\.id\}`\)/,
  "Opening a saved conversation should fetch the session detail by id instead of trusting the list item payload."
);

assert.match(
  source,
  /onClick=\{\(\)\s*=>\s*\{\s*openSession\(session\);?\s*\}\s*\}/s,
  "The conversation list item click handler should call openSession(session)."
);

assert.doesNotMatch(
  source,
  /onClick=\{\(\)\s*=>\s*\{\s*setCurrentSession\(session\);\s*setMessages\(session\.messages\s*\|\|\s*\[\]\);?\s*\}\s*\}/s,
  "Conversation list item clicks must not only copy messages from the sidebar list payload."
);

console.log("chat session opening contract passed");
