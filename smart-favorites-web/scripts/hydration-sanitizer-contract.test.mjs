import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rootLayout = readFileSync("app/layout.tsx", "utf8");

assert.match(
  rootLayout,
  /from\s+["']next\/script["']/,
  "Root layout should use next/script for pre-hydration root attribute cleanup."
);

assert.match(
  rootLayout,
  /id=["']sf-root-hydration-sanitizer["']/,
  "Root layout should include the Smart Favorites root hydration sanitizer."
);

assert.match(
  rootLayout,
  /strategy=["']beforeInteractive["']/,
  "Root hydration sanitizer must run before React hydrates."
);

assert.match(
  rootLayout,
  /<html[^>]*className=["']light["']/,
  "Root layout should render the default light html class on the server to match the first hydrated theme state."
);

assert.match(
  rootLayout,
  /style=\{\{\s*colorScheme:\s*["']light["']\s*\}\}/,
  "Root layout should render the default light color-scheme on the server to match the first hydrated theme state."
);

assert.match(
  rootLayout,
  /data-immersive-translate-/,
  "Hydration sanitizer should remove observed immersive-translate html attributes."
);

assert.match(
  rootLayout,
  /youmind-/,
  "Hydration sanitizer should remove observed YouMind body attributes."
);

assert.match(
  rootLayout,
  /isKnownExtensionOverlay/,
  "Hydration sanitizer should recognize known extension overlay nodes inserted before React loads."
);

assert.match(
  rootLayout,
  /z-index:\s*100000/,
  "Hydration sanitizer should target the observed high-z-index extension overlay signature."
);

assert.match(
  rootLayout,
  /childList:\s*true/,
  "Hydration sanitizer should watch child node injection, not only root attributes."
);

assert.match(
  rootLayout,
  /MutationObserver/,
  "Hydration sanitizer should keep cleaning until hydration starts because extensions can inject asynchronously."
);

console.log("hydration sanitizer contract passed");
