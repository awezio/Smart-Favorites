import type { Metadata } from "next";
import Link from "next/link";
import { Search, MessageSquare, Bookmark, Star, Settings } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Favorites - 智能收藏夹",
  description: "基于 AI 的智能书签和 GitHub Stars 管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navItems = [
    { href: "/", icon: Search, label: "搜索" },
    { href: "/chat", icon: MessageSquare, label: "AI 问答" },
    { href: "/bookmarks", icon: Bookmark, label: "书签管理" },
    { href: "/stars", icon: Star, label: "GitHub Stars" },
    { href: "/settings", icon: Settings, label: "设置" },
  ];

  return (
    <html lang="zh-CN">
      <body>
        <div className="flex h-screen bg-background">
          <aside className="w-64 border-r bg-card">
            <div className="flex h-16 items-center border-b px-6">
              <h1 className="text-xl font-bold">Smart Favorites</h1>
            </div>
            <nav className="space-y-1 p-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
