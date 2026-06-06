import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const iconPath = join(repoRoot, "app", "icon.svg");
const layout = read("app", "layout.tsx");

assert.equal(
  existsSync(iconPath),
  true,
  "Smart Favorites should provide an app/icon.svg favicon asset."
);

const icon = read("app", "icon.svg");

assert.match(
  layout,
  /icons:\s*\{[\s\S]*url:\s*"\/icon\.svg"[\s\S]*type:\s*"image\/svg\+xml"/,
  "Root metadata should explicitly point browsers at the SVG favicon."
);
assert.match(
  icon,
  /<title>Smart Favorites favicon<\/title>/,
  "The favicon SVG should include an accessible title."
);
assert.match(
  icon,
  /data-mark="bookmark"/,
  "The favicon should include a bookmark mark for product recognition."
);
assert.match(
  icon,
  /data-mark="star"/,
  "The favicon should include a star mark for favorites recognition."
);

console.log("favicon contract passed");
