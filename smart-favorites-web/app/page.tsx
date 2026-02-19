"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  MessageSquare,
  Bookmark,
  Star,
  Puzzle,
  Sparkles,
  ArrowRight,
  Github,
  Globe,
  ChevronRight,
  Download,
  Check,
  Import,
  Brain,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { translations, type Locale } from "@/lib/i18n";

const GITHUB_URL = "https://github.com/nichuanfang/Smart-Favorites";
const EXTENSION_URL =
  "https://github.com/nichuanfang/Smart-Favorites/tree/main/extension";

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>("zh");
  const t = translations[locale];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                SF
              </div>
              <span className="font-bold text-lg hidden sm:inline">
                Smart Favorites
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">
                {t.nav.features}
              </a>
              <a href="#extension" className="hover:text-foreground transition-colors">
                {t.nav.extension}
              </a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">
                {t.nav.howItWorks}
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t.nav.github}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
            >
              <Globe className="h-4 w-4" />
              {locale === "zh" ? "EN" : "中文"}
            </button>
            <Link href="/dashboard">
              <Button size="sm">{t.nav.dashboard}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-30" />

        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm mb-8">
            <span className="text-primary font-medium">Open Source</span>
            <span className="text-muted-foreground">
              {locale === "zh"
                ? "使用 Next.js + Supabase + pgvector 构建"
                : "Built with Next.js + Supabase + pgvector"}
            </span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.1]">
            {t.hero.title}
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 text-base px-8 h-12">
                {t.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 text-base px-8 h-12"
              >
                <Github className="h-5 w-5" />
                {t.hero.ctaSecondary}
              </Button>
            </a>
          </div>

          {/* Tech stack badges */}
          <div className="mt-12 flex items-center justify-center gap-3 flex-wrap text-sm text-muted-foreground">
            {["Next.js 15", "React 19", "Supabase", "pgvector", "Tailwind CSS"].map(
              (tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 rounded-full border bg-card/50"
                >
                  {tech}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 border-t">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t.features.title}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                ...t.features.semanticSearch,
                gradient: "from-blue-500/10 to-cyan-500/10",
                iconColor: "text-blue-500",
              },
              {
                icon: MessageSquare,
                ...t.features.aiChat,
                gradient: "from-purple-500/10 to-pink-500/10",
                iconColor: "text-purple-500",
              },
              {
                icon: Bookmark,
                ...t.features.bookmarks,
                gradient: "from-orange-500/10 to-amber-500/10",
                iconColor: "text-orange-500",
              },
              {
                icon: Star,
                ...t.features.stars,
                gradient: "from-yellow-500/10 to-orange-500/10",
                iconColor: "text-yellow-500",
              },
              {
                icon: Puzzle,
                ...t.features.extension,
                gradient: "from-green-500/10 to-emerald-500/10",
                iconColor: "text-green-500",
              },
              {
                icon: Sparkles,
                ...t.features.aiDesc,
                gradient: "from-pink-500/10 to-rose-500/10",
                iconColor: "text-pink-500",
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group relative rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20"
                >
                  <div
                    className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
                  />
                  <div className="relative">
                    <div
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-card border mb-4 ${feature.iconColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Browser Extension Section */}
      <section id="extension" className="py-24 border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {t.extensionSection.title}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t.extensionSection.subtitle}
              </p>

              <div className="mt-8 space-y-3">
                {t.extensionSection.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <a
                  href={EXTENSION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="gap-2">
                    <Download className="h-5 w-5" />
                    {t.extensionSection.download}
                  </Button>
                </a>
              </div>
            </div>

            {/* Extension preview card */}
            <div className="relative">
              <div className="rounded-xl border bg-card shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-xs">
                    SF
                  </div>
                  <span className="font-semibold">Smart Favorites</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Side Panel
                  </span>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {locale === "zh"
                      ? "搜索您的收藏..."
                      : "Search your favorites..."}
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    {
                      title: "Next.js Documentation",
                      url: "nextjs.org",
                      badge: "92%",
                    },
                    {
                      title: "Supabase",
                      url: "supabase.com",
                      badge: "87%",
                    },
                    {
                      title: "Tailwind CSS",
                      url: "tailwindcss.com",
                      badge: "84%",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="rounded-lg border p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.url}
                        </p>
                      </div>
                      <span className="text-xs text-primary font-medium">
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 border-t">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t.howItWorks.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.howItWorks.steps.map((step, i) => {
              const icons = [Import, Brain, Zap];
              const Icon = icons[i];
              return (
                <div key={i} className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-primary text-primary font-bold text-sm mb-4">
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {locale === "zh"
              ? "开始智能管理你的收藏"
              : "Start Managing Your Favorites Smartly"}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {locale === "zh"
              ? "免费、开源、自托管。你的数据完全由你掌控。"
              : "Free, open-source, self-hosted. Your data, your control."}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 text-base px-8 h-12">
                {t.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 text-base px-8 h-12"
              >
                <Github className="h-5 w-5" />
                GitHub
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                SF
              </div>
              <div>
                <span className="font-bold">Smart Favorites</span>
                <p className="text-xs text-muted-foreground">
                  {t.footer.desc}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <span>{t.footer.builtWith}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
