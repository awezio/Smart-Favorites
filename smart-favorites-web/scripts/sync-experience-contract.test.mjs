import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...segments) => readFileSync(join(repoRoot, ...segments), "utf8");

const bookmarksPage = read("app", "dashboard", "bookmarks", "page.tsx");
const extensionBridge = read("lib", "extension", "bridge.ts");
const landingPage = read("app", "page.tsx");
const starsPage = read("app", "dashboard", "stars", "page.tsx");
const starsSyncRoute = read("app", "api", "stars", "sync", "route.ts");
const githubStarsParser = read("lib", "parsers", "github-stars.ts");
const bookmarksRoute = read("app", "api", "bookmarks", "route.ts");
const bookmarksSyncRoute = read("app", "api", "bookmarks", "sync", "route.ts");
const profileRoute = read("app", "api", "profile", "route.ts");
const settingsRoute = read("app", "api", "settings", "route.ts");
const healthRoute = read("app", "api", "health", "route.ts");
const bookmarksDb = read("lib", "db", "bookmarks.ts");
const githubStarsDb = read("lib", "db", "github-stars.ts");
const dashboardLayout = read("app", "dashboard", "layout.tsx");
const manifest = read("..", "extension", "manifest.json");
const extensionBackground = read("..", "extension", "background", "background.js");
const extensionSidepanel = read("..", "extension", "sidepanel", "sidepanel.js");
const extensionOptions = read("..", "extension", "options", "options.html");
const extensionAuthCallback = read("..", "extension", "auth-callback.js");
const authExtensionPage = read("app", "auth", "extension", "page.tsx");
const supabaseMiddleware = read("lib", "supabase", "middleware.ts");
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
assert.doesNotMatch(
  extensionSources,
  /(?:API_BASE_URL\s*=\s*|value=|placeholder=|\|\|\s*)['"]https:\/\/smart-favorites\.vercel\.app/,
  "Extension runtime should not default to the legacy Vercel domain when the production app uses the custom domain."
);
assert.match(
  landingPage,
  new RegExp(releaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  "Landing page extension entry point should target the latest GitHub Release."
);
assert.match(
  `${bookmarksPage}\n${extensionBridge}`,
  new RegExp(releaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  "Bookmarks extension sync entry point should target the latest GitHub Release."
);
assert.match(
  bookmarksPage,
  /一键同步/,
  "Bookmarks page should expose a one-click sync action."
);
assert.match(
  extensionBackground,
  /action === 'ping'/,
  "Extension background should answer web-page ping requests for install detection."
);
assert.match(
  extensionBridge,
  /connectInstalledExtensionSession/,
  "Web app should proactively bridge the current logged-in session into an installed extension."
);
assert.match(
  bookmarksPage,
  /connectInstalledExtensionSession\(detected\.extensionId\)/,
  "Bookmarks page should connect the installed extension to the current web login after detection."
);
assert.match(
  extensionBridge,
  /EXTENSION_MESSAGE_TIMEOUT_MS/,
  "Web-to-extension messages should have a timeout so extension detection never stays loading forever."
);
assert.match(
  extensionBridge,
  /window\.setTimeout/,
  "Web-to-extension message timeout should settle missing extension responses."
);
assert.match(
  extensionBridge,
  /window\.clearTimeout/,
  "Web-to-extension message timeout should be cleared after a real extension response."
);
assert.match(
  extensionBridge,
  /iikmkjmpaadaobahmlepeloendndfphd/,
  "Default extension detection should include the currently installed development extension ID."
);
assert.match(
  bookmarksPage,
  /finally\s*\{[\s\S]*setCheckingExtension\(false\)/,
  "Bookmarks page should always leave extension detection state, even if ping fails or times out."
);
assert.match(
  extensionBackground,
  /action === 'triggerSync'/,
  "Extension background should allow the web page to trigger bookmark sync directly."
);
assert.match(
  extensionBackground,
  /chrome\.windows\.create[\s\S]*sidepanel\/sidepanel\.html/,
  "Extension open requests should fall back to an extension popup window when sidePanel.open is rejected."
);
assert.match(
  extensionBackground,
  /sidePanel[\s\S]*\.open[\s\S]*catch[\s\S]*openExtensionPopupWindow/,
  "Extension open requests should not fail permanently when the browser rejects sidePanel.open from a web-page message."
);
assert.match(
  extensionSources,
  /https:\/\/www\.smart-favorites\.cc\.cd/,
  "Extension should default to the production web app domain."
);
assert.match(
  extensionSidepanel,
  /\/auth\/extension[\s\S]*searchParams\.set\('ext_id'/,
  "Extension login should use the web-to-extension auth bridge."
);
assert.match(
  extensionSidepanel,
  /launchWebAuthFlow/,
  "Extension login should prefer Chrome identity web auth flow so the extension receives the auth redirect directly."
);
assert.match(
  extensionSidepanel,
  /getRedirectURL\('auth-callback'\)/,
  "Extension login should use the Chrome identity redirect URL for the primary auth callback."
);
assert.match(
  extensionSidepanel,
  /parseExtensionAuthRedirect/,
  "Extension login should parse the returned identity auth redirect URL for the extension token."
);
assert.match(
  extensionSidepanel,
  /persistExtensionAuthToken/,
  "Extension login should persist the returned extension token before syncing."
);
assert.match(
  extensionSidepanel,
  /waitForExtensionAuthToken/,
  "Extension tab fallback should still wait for the extension token to be stored before continuing sync."
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
  /chrome-extension:\/\/\$\{chrome\.runtime\.id\}\/auth-callback\.html[\s\S]*redirect_uri/,
  "Extension auth bridge should keep a web-accessible extension callback URI as the tab fallback."
);
assert.match(
  authExtensionPage,
  /sendMessage\(\s*extId/,
  "Web extension connect page should deliver the extension token by external extension messaging."
);
assert.match(
  authExtensionPage,
  /callbackUrl/,
  "Web extension connect page should keep a browser-extension callback fallback."
);
assert.match(
  authExtensionPage,
  /extensionToken/,
  "Web extension connect page fallback should include the extension token in the callback hash."
);
assert.match(
  authExtensionPage,
  /accessToken[\s\S]*Authorization:\s*`Bearer \$\{accessToken\}`/,
  "Web extension connect page should optionally send the browser Supabase access token to the extension session API."
);
assert.match(
  authExtensionPage,
  /fetch\("\/api\/auth\/extension\/session"/,
  "Web extension connect page should ask the server API to resolve auth from SSR cookies even when the browser client session is unavailable."
);
assert.doesNotMatch(
  authExtensionPage,
  /if\s*\(\s*(?:error\s*\|\|\s*)?!session\s*\)[\s\S]*router\.replace\(`\/login\?redirect=/,
  "Web extension connect page must not redirect to login before trying the server-side extension session API."
);
assert.match(
  authExtensionPage,
  /backendUrl:\s*window\.location\.origin/,
  "Web extension connect page fallback should tell the extension which backend origin issued the token."
);
assert.match(
  authExtensionPage,
  /runtime\.lastError[\s\S]*redirectToExtensionCallback\(\)/,
  "Web extension connect page should fall back to the extension callback when external messaging fails."
);
assert.match(
  authExtensionPage,
  /window\.setTimeout\(redirectToExtensionCallback,\s*3000\)/,
  "Web extension connect page should time out external messaging so chrome.identity flows are never left waiting."
);
assert.match(
  authExtensionPage,
  /window\.clearTimeout\(fallbackTimer\)/,
  "Web extension connect page should cancel the external messaging timeout once the extension responds."
);
assert.match(
  authExtensionPage,
  /response\?\.success[\s\S]*redirectToExtensionCallback\(\)/,
  "Web extension connect page should still route through the extension callback after external messaging succeeds so storage is written in the extension context."
);
assert.match(
  supabaseMiddleware,
  /pathname === "\/login" && user[\s\S]*getSafeRedirect\(request\.nextUrl\.searchParams\.get\("redirect"\)\)[\s\S]*NextResponse\.redirect\(new URL\(redirect, request\.url\)\)/,
  "Middleware should preserve /login?redirect=/auth/extension... for already logged-in users instead of sending them to /dashboard."
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
  /validateStoredExtensionAuthToken/,
  "Extension sync should validate a stored token before treating the extension as logged in."
);
assert.match(
  extensionSidepanel,
  /response\.status === 401 \|\| response\.status === 403[\s\S]*clearStoredAuthTokens/,
  "Extension should clear stale or forbidden auth tokens before retrying the login bridge."
);
assert.match(
  extensionSidepanel,
  /maybeAutoConnectFromActiveWebSession/,
  "Extension should try the auth bridge when opened on an already logged-in Smart Favorites web page."
);
assert.match(
  extensionSidepanel,
  /trySilentExtensionLogin/,
  "Extension should have a silent login probe for an already-open logged-in Smart Favorites web session."
);
assert.match(
  extensionSidepanel,
  /launchWebAuthFlow\(\{[\s\S]*interactive:\s*false/,
  "Extension silent login probe should use chrome.identity without prompting when a web session already exists."
);
assert.match(
  extensionSidepanel,
  /maybeAutoConnectFromActiveWebSession[\s\S]*trySilentExtensionLogin/,
  "Extension should invoke the silent login probe during active web-session auto-connect."
);
assert.doesNotMatch(
  extensionSidepanel,
  /openExtensionLogin\(\{\s*interactive:\s*false\s*\}\)/,
  "Extension should not start a hidden auth wait that never opens the connect page."
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
assert.match(
  extensionAuthCallback,
  /backendUrl/,
  "Extension callback should persist the backend origin from the web auth page."
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
assert.match(
  extensionSidepanel,
  /handleExtensionAuthChanged[\s\S]*syncBookmarks\(false\)/,
  "Extension should automatically sync browser bookmarks once extension auth succeeds."
);
assert.doesNotMatch(
  healthRoute,
  /createAdminClient/,
  "Health checks used by the extension should not require the Supabase service role key."
);
assert.doesNotMatch(
  read("app", "dashboard", "settings", "page.tsx"),
  /github_token|Personal Access Token|showGithubToken|setGithubToken/,
  "GitHub/Copilot-style sync should use GitHub OAuth login or account binding, not manual token entry in settings."
);

console.log("sync experience contract passed");
