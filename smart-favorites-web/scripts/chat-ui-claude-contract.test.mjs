import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const chatPage = read("app", "dashboard", "chat", "page.tsx");
const dashboardLayout = read("app", "dashboard", "layout.tsx");

assert.match(
  chatPage,
  /function ChatSidebar/,
  "Chat page should render a dedicated Claude Code style session sidebar."
);
assert.match(
  chatPage,
  /function WorkspaceTabs/,
  "Chat page should render top workspace tabs."
);
assert.match(
  chatPage,
  /function Composer/,
  "Chat page should render a large bottom composer instead of a plain input row."
);
assert.match(
  chatPage,
  /Search sessions\.\.\./,
  "Chat sidebar should include session search."
);
assert.match(
  chatPage,
  /PINNED_STORAGE_KEY|ARCHIVED_STORAGE_KEY/,
  "Chat sidebar should support pinned and archived conversations."
);
assert.match(
  chatPage,
  /onRegenerate|onBranch|onCopy/,
  "Assistant messages should expose regenerate, branch, and copy actions."
);
assert.match(
  chatPage,
  /Paperclip/,
  "Composer should expose a multimodal attachment control."
);
assert.match(
  chatPage,
  /knowledgeModeLabels/,
  "Composer should expose knowledge routing controls."
);
assert.match(
  dashboardLayout,
  /isChatPage[\s\S]*h-full/,
  "Dashboard layout should allow the chat workbench to use the full available width."
);

console.log("chat UI Claude-style contract passed");
