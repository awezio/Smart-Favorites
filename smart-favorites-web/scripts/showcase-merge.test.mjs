import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...parts) => readFileSync(join(repoRoot, ...parts), "utf8");

assert.match(read("lib", "showcase-merge.ts"), /mergeShowcaseBookmarks/);
assert.match(read("app", "api", "showcase", "route.ts"), /mergeShowcaseBookmarks/);
assert.match(
  read("supabase", "migrations", "20260626143000_homepage_showcase_overrides.sql"),
  /awwwards\.com/
);
assert.match(
  read("supabase", "migrations", "20260626143000_homepage_showcase_overrides.sql"),
  /httpster\.net/
);

console.log("showcase-merge.test.mjs passed");
