import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@xenova/transformers",
    "@sparticuz/chromium",
    "playwright-core",
  ],
  outputFileTracingIncludes: {
    "/api/bookmarks/snapshot-page": [
      "./node_modules/@sparticuz/chromium/**",
    ],
    "/api/ai/describe": ["./node_modules/@sparticuz/chromium/**"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
