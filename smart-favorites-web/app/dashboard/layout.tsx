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
  Check,
  ChevronDown,
  Languages,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getDiceBearUrl } from "@/lib/avatars";
import { Logo } from "@/components/brand/logo";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import { PowerIndicator } from "@/components/layout/power-indicator";
import type { Profile } from "@/types";
import { getDashboardPageTitle } from "@/lib/dashboard-page-title";
import { type DashboardLanguage, pickLanguage, useDashboardLanguage } from "@/lib/dashboard-language";
import { useExtensionSessionBridge } from "@/lib/extension/use-extension-session-bridge";
import {
  readDashboardNavCollapsed,
  writeDashboardNavCollapsed,
} from "@/lib/layout/dashboard-nav-layout";

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
  const [navCollapsed, setNavCollapsed] = useState(false);
  const navPreferenceInitializedRef = useRef(false);
  const navUserToggledRef = useRef(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [language, setLanguage] = useDashboardLanguage();
  const supabase = useMemo(() => createClient(), []);
  const isChatPage = pathname.startsWith("/dashboard/chat");
  const pageTitle = useMemo(
    () => getDashboardPageTitle(pathname, language),
    [pathname, language]
  );
  useExtensionSessionBridge();

  useEffect(() => {
    setNavCollapsed(readDashboardNavCollapsed());
    navPreferenceInitializedRef.current = true;
  }, []);

  useEffect(() => {
    if (!navPreferenceInitializedRef.current || navUserToggledRef.current || !isChatPage) {
      return;
    }

    const media = window.matchMedia("(max-width: 1023px)");
    const applyChatDefault = () => {
      if (media.matches) {
        setNavCollapsed(true);
      }
    };

    applyChatDefault();
    media.addEventListener("change", applyChatDefault);
    return () => media.removeEventListener("change", applyChatDefault);
  }, [isChatPage]);

  const toggleNavCollapsed = () => {
    setNavCollapsed((current) => {
      const next = !current;
      writeDashboardNavCollapsed(next);
      navUserToggledRef.current = true;
      return next;
    });
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
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
    <div className="flex h-dvh min-h-0 bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-background transition-[width,transform] duration-300 lg:static lg:translate-x-0",
          navCollapsed ? "w-14" : "w-56",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border px-4",
            navCollapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link href="/" onClick={() => setSidebarOpen(false)} title="Smart Favorites">
            <Logo size="sm" />
          </Link>
          {!navCollapsed && (
            <button
              className="rounded-lg p-1.5 hover:bg-accent lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {primaryNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                pathname={pathname}
                language={language}
                collapsed={navCollapsed}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </div>

          <div className="space-y-0.5 border-t border-border pt-4">
            {!navCollapsed && (
              <p className="px-3 pb-1 utility-label">
                {pickLanguage(language, "账户", "Account")}
              </p>
            )}
            {accountNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                pathname={pathname}
                language={language}
                collapsed={navCollapsed}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </div>
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-border p-3">
          {user && (
            <Link
              href="/dashboard/profile"
              onClick={() => setSidebarOpen(false)}
              title={pickLanguage(language, "个人资料", "Profile")}
              className={cn(
                "mb-2 flex items-center transition-colors",
                navCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
                pathname.startsWith("/dashboard/profile")
                  ? "border border-primary/30 bg-primary/5 text-primary"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
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
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {!navCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {profile?.display_name ||
                      user.user_metadata?.full_name ||
                      user.user_metadata?.name ||
                      user.email?.split("@")[0]}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              )}
            </Link>
          )}
          <Link
            href="/"
            title={pickLanguage(language, "返回首页", "Home")}
            className={cn(
              "flex items-center text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
              navCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
            )}
          >
            <Home className="h-5 w-5 shrink-0" />
            {!navCollapsed && <span>{pickLanguage(language, "返回首页", "Home")}</span>}
          </Link>
          <button
            onClick={handleLogout}
            title={pickLanguage(language, "退出登录", "Log out")}
            className={cn(
              "flex w-full items-center text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              navCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!navCollapsed && <span>{pickLanguage(language, "退出登录", "Log out")}</span>}
          </button>
          <button
            type="button"
            onClick={toggleNavCollapsed}
            title={pickLanguage(
              language,
              navCollapsed ? "展开导航栏" : "折叠导航栏",
              navCollapsed ? "Expand navigation" : "Collapse navigation"
            )}
            aria-label={pickLanguage(
              language,
              navCollapsed ? "展开导航栏" : "折叠导航栏",
              navCollapsed ? "Expand navigation" : "Collapse navigation"
            )}
            className={cn(
              "hidden w-full items-center text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground lg:flex",
              navCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
            )}
          >
            {navCollapsed ? (
              <PanelLeftOpen className="h-5 w-5 shrink-0" />
            ) : (
              <PanelLeftClose className="h-5 w-5 shrink-0" />
            )}
            {!navCollapsed && (
              <span>{pickLanguage(language, "折叠导航栏", "Collapse navigation")}</span>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
          <button
            className="p-1.5 hover:bg-muted/50 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="min-w-0 flex-1 truncate font-serif text-base font-semibold text-foreground sm:text-lg lg:hidden">
            {pageTitle}
          </span>
          <div className="hidden flex-1 lg:block" aria-hidden />
          <PowerIndicator compact className="hidden md:inline-flex" />
          <LanguageSwitch language={language} setLanguage={setLanguage} compact />
          <ThemeToggleCompact className="h-9 w-9 p-1.5" />
        </header>

        <main className={cn("min-h-0 flex-1", isChatPage ? "overflow-hidden" : "overflow-y-auto")}>
          <div
            className={cn(
              isChatPage ? "flex h-full min-h-0 w-full flex-col" : "page-shell"
            )}
          >
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
  collapsed,
  onNavigate,
}: {
  item: {
    href: string;
    icon: ComponentType<{ className?: string }>;
    label: Record<DashboardLanguage, string>;
  };
  pathname: string;
  language: DashboardLanguage;
  collapsed?: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const label = item.label[language];
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={label}
      className={cn(
        "flex items-center text-sm transition-colors",
        collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
        isActive
          ? "border border-primary/30 bg-primary/5 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="min-w-0 truncate">{label}</span>}
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const options: Array<{ value: DashboardLanguage; label: string; shortLabel: string }> = [
    { value: "zh", label: "中文", shortLabel: "中" },
    { value: "en", label: "English", shortLabel: "EN" },
  ];
  const activeOption = options.find((option) => option.value === language) || options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={cn("relative inline-flex", compact ? "h-9" : "w-full")}>
      <button
        type="button"
        aria-label="Language"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground",
          compact ? "w-9 px-0 sm:w-auto sm:px-3" : "w-full justify-between"
        )}
      >
        <span className="inline-flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <span className={cn(compact ? "hidden sm:inline" : "inline")}>{activeOption.label}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition",
            compact ? "hidden sm:block" : "",
            open ? "rotate-180" : ""
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Language"
          className={cn(
            "absolute z-50 mt-2 min-w-36 overflow-hidden border border-border bg-popover py-1",
            compact ? "right-0 top-full" : "left-0 top-full w-full"
          )}
        >
          {options.map((option) => {
            const active = language === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLanguage(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                    {option.shortLabel}
                  </span>
                  {option.label}
                </span>
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
