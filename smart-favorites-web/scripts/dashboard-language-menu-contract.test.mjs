import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const layout = readFileSync(join(repoRoot, "app", "dashboard", "layout.tsx"), "utf8");

assert.match(
  layout,
  /aria-haspopup="menu"/,
  "Dashboard language switch should be a single icon button that opens a menu."
);
assert.match(
  layout,
  /role="menuitemradio"/,
  "Dashboard language choices should be rendered as menu radio items."
);
assert.match(
  layout,
  /aria-expanded=\{open\}/,
  "Dashboard language menu trigger should expose its open state."
);
assert.doesNotMatch(
  layout,
  /aria-pressed=/,
  "Dashboard language switch should not render the old two-button segmented control."
);

console.log("dashboard language menu contract passed");
