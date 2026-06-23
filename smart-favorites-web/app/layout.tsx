import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { ToasterClient } from "@/components/toaster-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Favorites - 智能收藏夹",
  description:
    "基于 AI 的智能书签和 GitHub Stars 管理系统。使用语义搜索，在收藏中找到一切。",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Smart Favorites - 智能收藏夹",
    description:
      "基于 AI 的智能书签和 GitHub Stars 管理系统。使用语义搜索，在收藏中找到一切。",
    type: "website",
  },
};

const rootHydrationSanitizerScript = `
(() => {
  const htmlAttributePrefixes = ["data-immersive-translate-"];
  const bodyAttributePrefixes = ["youmind-"];

  const removeMatchingAttributes = (node, prefixes) => {
    if (!node || !node.attributes) return;
    for (const attribute of Array.from(node.attributes)) {
      if (prefixes.some((prefix) => attribute.name.startsWith(prefix))) {
        node.removeAttribute(attribute.name);
      }
    }
  };

  const clean = () => {
    removeMatchingAttributes(document.documentElement, htmlAttributePrefixes);
    removeMatchingAttributes(document.body, bodyAttributePrefixes);
  };

  clean();
  const observer = new MutationObserver(clean);
  observer.observe(document.documentElement, { attributes: true });

  const observeBody = () => {
    if (!document.body) return;
    removeMatchingAttributes(document.body, bodyAttributePrefixes);
    observer.observe(document.body, { attributes: true });
  };

  observeBody();
  document.addEventListener("DOMContentLoaded", observeBody, { once: true });
  window.addEventListener("load", () => {
    clean();
    window.setTimeout(() => observer.disconnect(), 1000);
  }, { once: true });
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="light"
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <body className="antialiased" suppressHydrationWarning>
        <Script
          id="sf-root-hydration-sanitizer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: rootHydrationSanitizerScript }}
        />
        <ThemeProvider>
          {children}
          <ToasterClient />
        </ThemeProvider>
      </body>
    </html>
  );
}
