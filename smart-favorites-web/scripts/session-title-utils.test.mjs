import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...parts) => readFileSync(join(repoRoot, ...parts), "utf8");

const utils = read("lib", "chat", "session-title-utils.ts");
const chatPage = read("app", "dashboard", "chat", "page.tsx");
const generateTitleRoute = read(
  "app",
  "api",
  "chat",
  "sessions",
  "[id]",
  "generate-title",
  "route.ts"
);

assert.match(utils, /对话\|Conversation/, "Placeholder titles should include timestamped session names.");
assert.match(
  chatPage,
  /JSON\.stringify\(\{[\s\S]*messages:\s*sessionMessages[\s\S]*locale:\s*language/,
  "Chat page should send session messages and locale when generating titles."
);
assert.match(
  chatPage,
  /t\.emptyTitle/,
  "New sessions should use the empty-session label instead of a timestamp title."
);
assert.match(
  generateTitleRoute,
  /normalizeSessionMessages/,
  "Generate-title API should normalize stored session messages robustly."
);
assert.match(
  chatPage,
  /maybeGenerateSessionTitle\(hydratedSession\.id/,
  "Opening a saved session should retry title generation when the title is still a placeholder."
);

console.log("session-title-utils.test.mjs passed");
