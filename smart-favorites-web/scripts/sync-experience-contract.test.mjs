import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const bookmarksPage = read("app", "dashboard", "bookmarks", "page.tsx");
const starsPage = read("app", "dashboard", "stars", "page.tsx");
const starsSyncRoute = read("app", "api", "stars", "sync", "route.ts");
const githubStarsParser = read("lib", "parsers", "github-stars.ts");
const dashboardLayout = read("app", "dashboard", "layout.tsx");
const manifest = read("..", "extension", "manifest.json");

assert.match(
  manifest,
  /"bookmarks"/,
  "The browser extension must keep the bookmarks permission for direct browser bookmark sync."
);

assert.match(
  bookmarksPage,
  /openExtensionGuide/,
  "Bookmarks page should expose an extension-based browser sync entry point."
);
assert.match(
  bookmarksPage,
  /浏览器扩展自动同步/,
  "Bookmarks page should make extension sync the primary sync path."
);
assert.match(
  bookmarksPage,
  /网页无法直接读取浏览器收藏夹/,
  "Bookmarks page should explain why direct web-page bookmark access is not possible."
);

assert.doesNotMatch(
  starsPage,
  /const \[token/,
  "GitHub Stars page should not require a manually entered token for normal sync."
);
assert.match(
  starsPage,
  /留空使用 GitHub 登录账号/,
  "GitHub Stars page should let the GitHub OAuth account drive sync by default."
);
assert.match(
  starsPage,
  /body: JSON\.stringify\(\{ username: username\.trim\(\) \|\| undefined \}\)/,
  "GitHub Stars sync should allow username to be omitted so the API can use the logged-in GitHub account."
);

assert.match(
  starsSyncRoute,
  /resolveGitHubSyncCredentials/,
  "Stars sync API should resolve username and token from the current user/session/settings."
);
assert.match(
  starsSyncRoute,
  /provider_token/,
  "Stars sync API should use the Supabase GitHub provider token when available."
);
assert.match(
  githubStarsParser,
  /fetchAuthenticatedUserStars/,
  "GitHub parser should support the authenticated /user/starred endpoint."
);
assert.match(
  githubStarsParser,
  /https:\/\/api\.github\.com\/user\/starred/,
  "Authenticated GitHub sync should call /user/starred."
);

assert.match(
  dashboardLayout,
  /const primaryNavItems/,
  "Dashboard sidebar should separate primary navigation from account navigation."
);
assert.match(
  dashboardLayout,
  /const accountNavItems/,
  "Dashboard sidebar should have a separate account navigation group."
);
const accountNavItemsBlock = dashboardLayout.match(
  /const accountNavItems = \[[\s\S]*?\];/
)?.[0] || "";
assert.doesNotMatch(
  accountNavItemsBlock,
  /\/dashboard\/profile/,
  "Profile should be integrated into the lower-left account card, not repeated as a sidebar nav item."
);
assert.match(
  dashboardLayout,
  /href="\/dashboard\/profile"[\s\S]*profile\?\.display_name/,
  "The lower-left account card should remain the profile entry point."
);
assert.match(
  dashboardLayout,
  /账户/,
  "The sidebar should label the separate profile/settings group as account-related."
);

console.log("sync experience contract passed");
