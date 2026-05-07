import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ToasterClient } from "@/components/toaster-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Favorites - 智能收藏夹",
  description:
    "基于 AI 的智能书签和 GitHub Stars 管理系统。使用语义搜索，在收藏中找到一切。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Smart Favorites",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Smart Favorites - 智能收藏夹",
    description:
      "基于 AI 的智能书签和 GitHub Stars 管理系统。使用语义搜索，在收藏中找到一切。",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <ToasterClient />
        </ThemeProvider>
      </body>
    </html>
  );
}
