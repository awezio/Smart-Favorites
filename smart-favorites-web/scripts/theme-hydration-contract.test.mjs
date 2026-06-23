import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const themeProvider = readFileSync("components/theme-provider.tsx", "utf8");

assert.match(
  themeProvider,
  /useState/,
  "ThemeProvider should track client mount state."
);

assert.match(
  themeProvider,
  /useEffect/,
  "ThemeProvider should enable next-themes only after hydration begins."
);

assert.match(
  themeProvider,
  /if\s*\(\s*!mounted\s*\)\s*\{\s*return\s*<>\s*\{\s*children\s*\}\s*<\/>/s,
  "ThemeProvider should render children without next-themes on the server and first client render."
);

assert.match(
  themeProvider,
  /<NextThemesProvider[\s\S]*>\s*\{\s*children\s*\}\s*<\/NextThemesProvider>/,
  "ThemeProvider should still provide next-themes after mount."
);

console.log("theme hydration contract passed");
