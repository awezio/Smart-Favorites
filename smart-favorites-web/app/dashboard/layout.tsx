"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  Search,
  MessageSquare,
  Bookmark,
  Star,
  Settings,
  Menu,
  X,
  Home,
  LogOut,
  User,
  Globe,
  Network,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getDiceBearUrl } from "@/lib/avatars";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import type { Profile } from "@/types";

const primaryNavItems = [
  { href: "/dashboard", icon: Search, label: "搜索" },
  { href: "/dashboard/chat", icon: MessageSquare, label: "AI 问答" },
  { href: "/dashboard/bookmarks", icon: Bookmark, label: "书签管理" },
  { href: "/dashboard/stars", icon: Star, label: "GitHub Stars" },
  { href: "/dashboard/knowledge", icon: Network, label: "Knowledge Graph" },
  { href: "/dashboard/square", icon: Globe, label: "广场" },
];

const accountNavItems = [
  { href: "/dashboard/settings", icon: Settings, label: "设置" },
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
  const supabase = useMemo(() => createClient(), []);

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
    toast.success("已退出登录");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex h-screen bg-background">
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
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              SF
            </div>
            <span className="text-lg font-bold">Smart Favorites</span>
          </Link>
          <button
            className="lg:hidden p-1 rounded hover:bg-accent"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-5 p-4">
          <div className="space-y-1">
            {primaryNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </div>

          <div className="space-y-1 border-t pt-4">
            <p className="px-3 text-xs font-medium text-muted-foreground">账户</p>
            {accountNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t p-4 space-y-1">
          {user && (
            <Link
              href="/dashboard/profile"
              onClick={() => setSidebarOpen(false)}
              title="个人资料"
              className={cn(
                "flex items-center gap-3 px-3 py-2 mb-2 rounded-lg transition-colors",
                pathname.startsWith("/dashboard/profile")
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent"
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
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
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>返回首页</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header: mobile menu + title + theme (GitHub-style compact) */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
          <button
            className="p-1 rounded hover:bg-accent lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="flex-1 font-semibold">Smart Favorites</span>
          <ThemeToggleCompact className="h-9 w-9 p-1.5" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-6xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  pathname,
  onNavigate,
}: {
  item: { href: string; icon: ComponentType<{ className?: string }>; label: string };
  pathname: string;
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
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
    </Link>
  );
}
