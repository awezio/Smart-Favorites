import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "..");
const nextConfig = readFileSync(join(repoRoot, "next.config.ts"), "utf8");

assert.match(
  nextConfig,
  /serverExternalPackages:\s*\[[\s\S]*["@']@xenova\/transformers["@']/,
  "Next server config should externalize @xenova/transformers so Vercel resolves its package.json main entry instead of a missing index.js.",
);

console.log("server runtime contract passed");
