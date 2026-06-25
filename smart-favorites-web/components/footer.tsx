import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PowerIndicator } from "@/components/layout/power-indicator";
import { cn } from "@/lib/utils";

interface FooterProps {
  locale?: "zh" | "en";
  className?: string;
}

const copy = {
  zh: {
    tagline: "个人知识库与 AI 工具平台",
    builtWith: "基于 Next.js 与 Supabase 构建",
    sections: {
      navigate: "导航",
      resources: "资源",
      system: "系统",
    },
    github: "GitHub",
    home: "首页",
    dashboard: "控制台",
    extension: "浏览器扩展",
    docs: "文档",
    status: "服务正常",
  },
  en: {
    tagline: "Personal knowledge base & AI tools",
    builtWith: "Built with Next.js & Supabase",
    sections: {
      navigate: "Navigate",
      resources: "Resources",
      system: "System",
    },
    github: "GitHub",
    home: "Home",
    dashboard: "Dashboard",
    extension: "Extension",
    docs: "Docs",
    status: "Operational",
  },
};

const GITHUB_URL = "https://github.com/awezio/Smart-Favorites";
const EXTENSION_URL =
  "https://github.com/awezio/Smart-Favorites/releases/latest";

export function Footer({ locale = "zh", className }: FooterProps) {
  const t = copy[locale];

  return (
    <footer className={cn("border-t border-border bg-card", className)}>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            <Link href="/">
              <Logo size="sm" />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t.tagline}
            </p>
            <PowerIndicator label={t.status} />
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t.sections.navigate}</h3>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                {t.home}
              </Link>
              <Link href="/dashboard" className="hover:text-foreground">
                {t.dashboard}
              </Link>
              <Link href="/login" className="hover:text-foreground">
                {locale === "zh" ? "登录" : "Sign in"}
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t.sections.resources}</h3>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {t.github}
              </a>
              <a
                href={EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {t.extension}
              </a>
              <a href="#features" className="hover:text-foreground">
                {locale === "zh" ? "功能" : "Features"}
              </a>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t.sections.system}</h3>
            <p className="text-sm text-muted-foreground">{t.builtWith}</p>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Smart Favorites
        </div>
      </div>
    </footer>
  );
}
