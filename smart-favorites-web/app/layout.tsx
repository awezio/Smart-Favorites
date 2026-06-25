import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { ToasterClient } from "@/components/toaster-client";
import { DitherFilterDefs } from "@/components/layout/dither-filter-defs";
import { fontVariables } from "@/lib/fonts";
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
  const randomTokenPattern = /^[a-z0-9]{8,}$/i;

  const removeMatchingAttributes = (node, prefixes) => {
    if (!node || !node.attributes) return;
    for (const attribute of Array.from(node.attributes)) {
      if (prefixes.some((prefix) => attribute.name.startsWith(prefix))) {
        node.removeAttribute(attribute.name);
      }
    }
  };

  const isKnownExtensionOverlay = (node) => {
    if (!(node instanceof HTMLElement) || node.tagName !== "DIV") return false;

    const inlineStyle = node.getAttribute("style") || "";
    const className = typeof node.className === "string" ? node.className.trim() : "";
    const hasRandomSignature =
      randomTokenPattern.test(node.id || "") && randomTokenPattern.test(className);
    const hasFloatingOverlayStyle =
      inlineStyle.includes("position: fixed") &&
      inlineStyle.includes("z-index: 100000") &&
      (inlineStyle.includes("width: 369px") ||
        inlineStyle.includes("right: 100px") ||
        inlineStyle.includes("top: 150px"));

    return hasRandomSignature && hasFloatingOverlayStyle;
  };

  const removeKnownInjectedNodes = (root) => {
    if (!root) return;
    if (isKnownExtensionOverlay(root)) {
      root.remove();
      return;
    }

    if (!root.querySelectorAll) return;
    for (const node of Array.from(root.querySelectorAll("div[style]"))) {
      if (isKnownExtensionOverlay(node)) {
        node.remove();
      }
    }
  };

  const clean = () => {
    removeMatchingAttributes(document.documentElement, htmlAttributePrefixes);
    removeMatchingAttributes(document.body, bodyAttributePrefixes);
    removeKnownInjectedNodes(document.documentElement);
  };

  clean();
  const observer = new MutationObserver(clean);
  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  const observeBody = () => {
    if (!document.body) return;
    removeMatchingAttributes(document.body, bodyAttributePrefixes);
    removeKnownInjectedNodes(document.body);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  };

  observeBody();
  document.addEventListener("DOMContentLoaded", observeBody, { once: true });
  window.addEventListener("load", () => {
    clean();
    window.setTimeout(() => observer.disconnect(), 1000);
  }, { once: true });
})();
`;

const themeInitScript = `
(() => {
  try {
    const root = document.documentElement;
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (stored !== "light" && prefersDark);
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${fontVariables} min-h-dvh antialiased`}
        suppressHydrationWarning
      >
        <Script
          id="sf-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <Script
          id="sf-root-hydration-sanitizer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: rootHydrationSanitizerScript }}
        />
        <ThemeProvider>
          <DitherFilterDefs />
          {children}
          <ToasterClient />
        </ThemeProvider>
      </body>
    </html>
  );
}
