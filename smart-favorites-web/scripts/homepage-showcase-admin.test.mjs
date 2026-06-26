import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...parts) => readFileSync(join(repoRoot, ...parts), "utf8");

const migrations = read("supabase", "migrations", "20260626120000_homepage_showcase_items.sql");
const showcaseRoute = read("app", "api", "showcase", "route.ts");
const adminShowcaseRoute = read("app", "api", "admin", "showcase", "route.ts");
const adminShowcasePage = read("app", "admin", "showcase", "page.tsx");
const snapshotGrid = read("components", "snapshot-grid.tsx");
const showcaseSection = read("components", "home", "showcase-section.tsx");

assert.match(migrations, /homepage_showcase_items/, "Migration should create homepage_showcase_items.");
assert.match(
  migrations,
  /smart-favorites\.cc\.cd/,
  "Migration should seed Smart Favorites showcase item."
);
assert.match(showcaseRoute, /listEnabledHomepageShowcaseItems/, "Public showcase API should prefer curated items.");
assert.match(adminShowcaseRoute, /requireAdminUser/, "Admin showcase API should require admin access.");
assert.match(adminShowcasePage, /ShowcaseManager/, "Admin showcase page should render management UI.");
assert.match(snapshotGrid, /SnapshotCarousel/, "Snapshot grid should expose carousel component.");
assert.match(showcaseSection, /SnapshotCarousel/, "Landing showcase should use carousel instead of marquee.");

console.log("homepage-showcase-admin.test.mjs passed");
