"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  Search,
  MessageSquare,
  Bookmark,
  FileText,
  Star,
  Settings,
  Menu,
  X,
  Home,
  LogOut,
  User,
  Globe,
  Languages,
  Network,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getDiceBearUrl } from "@/lib/avatars";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import type { Profile } from "@/types";
import { type DashboardLanguage, pickLanguage, useDashboardLanguage } from "@/lib/dashboard-language";

const primaryNavItems = [
  { href: "/dashboard", icon: Search, label: { zh: "搜索", en: "Search" } },
  { href: "/dashboard/chat", icon: MessageSquare, label: { zh: "AI 问答", en: "AI Chat" } },
  { href: "/dashboard/bookmarks", icon: Bookmark, label: { zh: "书签管理", en: "Bookmarks" } },
  { href: "/dashboard/documents", icon: FileText, label: { zh: "文档", en: "Documents" } },
  { href: "/dashboard/stars", icon: Star, label: { zh: "GitHub 星标", en: "GitHub Stars" } },
  { href: "/dashboard/knowledge", icon: Network, label: { zh: "知识图谱", en: "Knowledge Graph" } },
  { href: "/dashboard/square", icon: Globe, label: { zh: "广场", en: "Square" } },
];

const accountNavItems = [
  { href: "/dashboard/settings", icon: Settings, label: { zh: "设置", en: "Settings" } },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [language, setLanguage] = useDashboardLanguage();
  const supabase = useMemo(() => createClient(), []);
  const isChatPage = pathname.startsWith("/dashboard/chat");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        // Fetch profile data
        try {
          const res = await fetch("/api/profile");
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
          }
        } catch (e) {
          console.error("Failed to load profile:", e);
        }
      }
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(pickLanguage(language, "已退出登录", "Logged out"));
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex h-dvh min-h-0 bg-sky-50/50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-sky-100 bg-white transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sky-100 px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-sm">
              SF
            </div>
            <span className="text-lg font-bold">Smart Favorites</span>
          </Link>
          <button
            className="lg:hidden p-1 rounded hover:bg-sky-50"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <LanguageSwitch language={language} setLanguage={setLanguage} />
        </div>

        <nav className="space-y-5 p-4">
          <div className="space-y-1">
            {primaryNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                pathname={pathname}
                language={language}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </div>

          <div className="space-y-1 border-t border-sky-100 pt-4">
            <p className="px-3 text-xs font-medium text-slate-500">
              {pickLanguage(language, "账户", "Account")}
            </p>
            {accountNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                pathname={pathname}
                language={language}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-sky-100 bg-white p-4 space-y-1">
          {user && (
            <Link
              href="/dashboard/profile"
              onClick={() => setSidebarOpen(false)}
              title={pickLanguage(language, "个人资料", "Profile")}
              className={cn(
                "flex items-center gap-3 px-3 py-2 mb-2 rounded-lg transition-colors",
                pathname.startsWith("/dashboard/profile")
                  ? "bg-sky-50 text-sky-700"
                  : "hover:bg-sky-50"
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700 overflow-hidden">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : profile?.avatar_seed ? (
                  <Image
                    src={getDiceBearUrl(
                      profile.avatar_seed.includes(":")
                        ? profile.avatar_seed.split(":")[0]
                        : "adventurer",
                      profile.avatar_seed.includes(":")
                        ? profile.avatar_seed.split(":")[1]
                        : profile.avatar_seed,
                      32
                    )}
                    alt="Avatar"
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 rounded-full"
                  />
                ) : user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.display_name ||
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email?.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-sky-50 hover:text-sky-700 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>{pickLanguage(language, "返回首页", "Home")}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>{pickLanguage(language, "退出登录", "Log out")}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header: mobile menu + title + theme (GitHub-style compact) */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-sky-100 bg-white px-6">
          <button
            className="p-1 rounded hover:bg-sky-50 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="flex-1 font-semibold">Smart Favorites</span>
          <LanguageSwitch language={language} setLanguage={setLanguage} compact />
          <ThemeToggleCompact className="h-9 w-9 p-1.5" />
        </header>

        <main className={cn("min-h-0 flex-1", isChatPage ? "overflow-hidden" : "overflow-y-auto")}>
          <div className={cn(isChatPage ? "h-full min-h-0" : "container mx-auto max-w-6xl p-6")}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  pathname,
  language,
  onNavigate,
}: {
  item: {
    href: string;
    icon: ComponentType<{ className?: string }>;
    label: Record<DashboardLanguage, string>;
  };
  pathname: string;
  language: DashboardLanguage;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        isActive
          ? "bg-sky-50 text-sky-700 font-medium"
          : "text-slate-500 hover:bg-sky-50 hover:text-sky-700"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="min-w-0 truncate">{item.label[language]}</span>
    </Link>
  );
}

function LanguageSwitch({
  language,
  setLanguage,
  compact,
}: {
  language: DashboardLanguage;
  setLanguage: (language: DashboardLanguage) => void;
  compact?: boolean;
}) {
  const options: Array<{ value: DashboardLanguage; label: string }> = [
    { value: "zh", label: "中文" },
    { value: "en", label: "EN" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-sky-200 bg-sky-50 p-1 shadow-sm shadow-sky-100/50",
        compact ? "h-9" : "w-full"
      )}
      aria-label="Language"
    >
      <Languages className={cn("ml-2 h-4 w-4 text-sky-600", compact ? "hidden sm:block" : "")} />
      {options.map((option) => {
        const active = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => setLanguage(option.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              compact ? "min-w-12" : "flex-1",
              active
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-500 hover:bg-white/70 hover:text-sky-700"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
