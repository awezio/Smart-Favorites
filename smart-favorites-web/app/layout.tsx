import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ToasterClient } from "@/components/toaster-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Favorites - 智能收藏夹",
  description:
    "基于 AI 的智能书签和 GitHub Stars 管理系统。使用语义搜索，在收藏中找到一切。",
  openGraph: {
    title: "Smart Favorites - 智能收藏夹",
    description:
      "基于 AI 的智能书签和 GitHub Stars 管理系统。使用语义搜索，在收藏中找到一切。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <ToasterClient />
        </ThemeProvider>
      </body>
    </html>
  );
}
