import type { DashboardLanguage } from "@/lib/dashboard-language";

type NavLabel = { zh: string; en: string };

const dashboardPageTitles: Array<{ href: string; label: NavLabel; exact?: boolean }> = [
  { href: "/dashboard", label: { zh: "智能搜索", en: "Smart Search" }, exact: true },
  { href: "/dashboard/chat", label: { zh: "AI 问答", en: "AI Chat" } },
  { href: "/dashboard/bookmarks", label: { zh: "书签管理", en: "Bookmarks" } },
  { href: "/dashboard/documents", label: { zh: "文档", en: "Documents" } },
  { href: "/dashboard/stars", label: { zh: "GitHub 星标", en: "GitHub Stars" } },
  { href: "/dashboard/knowledge", label: { zh: "知识图谱", en: "Knowledge Graph" } },
  { href: "/dashboard/square", label: { zh: "广场", en: "Square" } },
  { href: "/dashboard/settings", label: { zh: "设置", en: "Settings" } },
  { href: "/dashboard/profile", label: { zh: "个人资料", en: "Profile" } },
];

export function getDashboardPageTitle(
  pathname: string,
  language: DashboardLanguage
): string {
  for (const item of dashboardPageTitles) {
    const matches = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches) return item.label[language];
  }
  return language === "zh" ? "控制台" : "Dashboard";
}
