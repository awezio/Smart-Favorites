import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const bookmarksPage = read("app", "dashboard", "bookmarks", "page.tsx");
const landingPage = read("app", "page.tsx");
const starsPage = read("app", "dashboard", "stars", "page.tsx");
const starsSyncRoute = read("app", "api", "stars", "sync", "route.ts");
const githubStarsParser = read("lib", "parsers", "github-stars.ts");
const bookmarksRoute = read("app", "api", "bookmarks", "route.ts");
const bookmarksSyncRoute = read("app", "api", "bookmarks", "sync", "route.ts");
const profileRoute = read("app", "api", "profile", "route.ts");
const settingsRoute = read("app", "api", "settings", "route.ts");
const bookmarksDb = read("lib", "db", "bookmarks.ts");
const githubStarsDb = read("lib", "db", "github-stars.ts");
const dashboardLayout = read("app", "dashboard", "layout.tsx");
const manifest = read("..", "extension", "manifest.json");
const extensionBackground = read("..", "extension", "background", "background.js");
const extensionSidepanel = read("..", "extension", "sidepanel", "sidepanel.js");
const extensionOptions = read("..", "extension", "options", "options.html");
const extensionAuthCallback = read("..", "extension", "auth-callback.js");
const extensionSources = [
  extensionBackground,
  extensionSidepanel,
  extensionOptions,
  extensionAuthCallback,
].join("\n");
const releaseUrl = "https://github.com/awezio/Smart-Favorites/releases/latest";

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
  `${landingPage}\n${bookmarksPage}\n${extensionSources}`,
  /smart-favorites-web\.vercel\.app|nichuanfang\/Smart-Favorites/,
  "Extension sync entry points must not point at old deployments or repository paths."
);
assert.match(
  landingPage,
  new RegExp(releaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  "Landing page extension entry point should target the latest GitHub Release."
);
assert.match(
  bookmarksPage,
  new RegExp(releaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  "Bookmarks extension sync entry point should target the latest GitHub Release."
);
assert.match(
  extensionSources,
  /https:\/\/smart-favorites\.vercel\.app/,
  "Extension should default to the production web app domain."
);
assert.match(
  extensionSidepanel,
  /\/auth\/extension[\s\S]*searchParams\.set\('ext_id'/,
  "Extension login should use the web-to-extension auth bridge."
);
assert.match(
  extensionSidepanel,
  /waitForExtensionAuthToken/,
  "Extension login should wait for the extension token to be stored before continuing sync."
);
assert.doesNotMatch(
  extensionSidepanel,
  /launchWebAuthFlow/,
  "Extension login should not open a separate browser auth window."
);
assert.match(
  manifest,
  /externally_connectable/,
  "Extension manifest should allow the Smart Favorites web app to send the extension token back directly."
);
assert.match(
  extensionBackground,
  /onMessageExternal/,
  "Extension background should receive extension tokens from the Smart Favorites web app."
);
assert.match(
  extensionSidepanel,
  /redirect_uri/,
  "Extension auth bridge should pass a browser-extension redirect URI to the web connect page."
);
assert.match(
  read("app", "auth", "extension", "page.tsx"),
  /sendMessage\(\s*extId/,
  "Web extension connect page should deliver the extension token by external extension messaging."
);
assert.match(
  extensionSidepanel,
  /detectSmartFavoritesOriginFromActiveTab/,
  "Extension should detect the currently open Smart Favorites web app origin instead of sticking to stale backend URLs."
);
assert.match(
  extensionSidepanel,
  /ensureExtensionAuthenticated/,
  "Extension sync should require an extension auth token before posting browser bookmarks."
);
assert.match(
  extensionSidepanel,
  /maybeAutoConnectFromActiveWebSession/,
  "Extension should try the auth bridge when opened on an already logged-in Smart Favorites web page."
);
assert.match(
  extensionSidepanel,
  /openExtensionLogin\(\)/,
  "Unauthenticated extension sync should open the web-to-extension auth bridge."
);
assert.match(
  extensionSources,
  /topK:\s*10/,
  "Extension search requests should use the current Web API topK field."
);
assert.doesNotMatch(
  extensionSources,
  /top_k|include_sources|session_id/,
  "Extension requests should not use legacy Python-style API payload fields."
);
assert.match(
  extensionSources,
  /body:\s*JSON\.stringify\(\{\s*query/,
  "Extension chat/search requests should send query-based payloads."
);
assert.match(
  extensionAuthCallback,
  /extensionToken/,
  "Extension callback should persist an extension-scoped token."
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
  starsSyncRoute,
  /isUsableGitHubToken/,
  "Stars sync API should ignore placeholder or legacy invalid GitHub tokens during automatic sync."
);
assert.match(
  starsSyncRoute,
  /sanitizeGitHubToken/,
  "Stars sync API should sanitize GitHub tokens before sending them to GitHub."
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
  githubStarsParser,
  /readGitHubErrorMessage/,
  "GitHub parser should surface GitHub's response body for sync diagnostics."
);

assert.match(
  `${bookmarksRoute}\n${bookmarksSyncRoute}\n${starsPage}\n${starsSyncRoute}`,
  /createServerSupabaseClient/,
  "User-facing bookmark and GitHub Stars APIs should use the logged-in Supabase session instead of requiring the service role key."
);
assert.match(
  `${profileRoute}\n${settingsRoute}\n${bookmarksSyncRoute}`,
  /isExtensionAuthUser/,
  "Extension-authenticated requests should switch data access away from cookie-only Supabase sessions."
);
assert.match(
  `${profileRoute}\n${settingsRoute}\n${bookmarksSyncRoute}`,
  /createAdminClient/,
  "Extension token routes should use a trusted server client after token-to-user resolution and explicit user_id constraints."
);
assert.match(
  `${bookmarksDb}\n${githubStarsDb}`,
  /type SupabaseQueryClient/,
  "Bookmark and GitHub Stars database helpers should accept an injected Supabase query client."
);
assert.match(
  `${bookmarksDb}\n${githubStarsDb}`,
  /\.eq\("user_id", userId\)/,
  "Bookmark and GitHub Stars mutations should constrain updates/deletes to the current user."
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

assert.match(
  extensionSidepanel,
  /async function readApiError/,
  "Extension sync should surface API error details instead of hiding every failure behind a generic backend message."
);
assert.match(
  bookmarksSyncRoute,
  /total_bookmarks:\s*parsedBookmarks\.length/,
  "Bookmarks sync API should return the parsed bookmark total, not only added or modified rows."
);
assert.match(
  extensionSidepanel,
  /localBookmarkCount/,
  "Extension sync should compare browser-read bookmark count with server parsed count."
);
assert.match(
  extensionSidepanel,
  /data\.total_bookmarks/,
  "Extension sync success display should use server parsed bookmark total when available."
);
assert.match(
  extensionSidepanel,
  /fetchWithAuth\(`\$\{API_BASE_URL\}\/api\/settings`/,
  "Extension settings should load through the authenticated Web settings API."
);
assert.match(
  extensionSidepanel,
  /renderSettingsLoginRequired/,
  "Extension settings should not expose provider/API configuration while the extension is unauthenticated."
);
assert.match(
  extensionSidepanel,
  /testOllamaConnection/,
  "Extension settings should provide a local Ollama connection check."
);
assert.match(
  manifest,
  /http:\/\/localhost:11434\/\*/,
  "Extension should be allowed to call the default local Ollama endpoint."
);
assert.doesNotMatch(
  extensionSidepanel,
  /\/api\/settings\/(?:provider|apikey)/,
  "Extension settings should not call legacy settings endpoints that do not exist in the Next.js API."
);
assert.match(
  extensionSidepanel,
  /extensionAuthChanged/,
  "Extension auth callback/status flow should notify other extension contexts after storing a token."
);
assert.doesNotMatch(
  read("app", "dashboard", "settings", "page.tsx"),
  /github_token|Personal Access Token|showGithubToken|setGithubToken/,
  "GitHub/Copilot-style sync should use GitHub OAuth login or account binding, not manual token entry in settings."
);

console.log("sync experience contract passed");
