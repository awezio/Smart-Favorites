"use client";

import { useTheme } from "next-themes";
import { useState, useEffect, useRef } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "系统", icon: Monitor },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground", className)}>
        <Monitor className="h-5 w-5" />
        <span>主题</span>
      </div>
    );
  }

  const current = themes.find((t) => t.value === theme) ?? themes[2];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="切换主题"
      >
        <CurrentIcon className="h-5 w-5" />
        <span className="flex-1 text-left">主题</span>
        <span className="text-xs text-muted-foreground/70">{current.label}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-xl border border-border bg-popover p-1 shadow-elevated">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Compact version for use in headers / mobile bars */
export function ThemeToggleCompact({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  if (!mounted) {
    return (
      <button className={cn("p-2 rounded-lg text-muted-foreground", className)} aria-label="切换主题">
        <Monitor className="h-5 w-5" />
      </button>
    );
  }

  const current = themes.find((t) => t.value === theme) ?? themes[2];
  const CurrentIcon = current.icon;

  return (
    <button
      onClick={cycle}
      className={cn(
        "p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        className
      )}
      aria-label={`当前主题: ${current.label}，点击切换`}
      title={`主题: ${current.label}`}
    >
      <CurrentIcon className="h-5 w-5" />
    </button>
  );
}
