"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Brain,
  Check,
  Download,
  Github,
  Globe,
  Import,
  MessageSquare,
  Puzzle,
  Search,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { translations, type Locale } from "@/lib/i18n";

const GITHUB_URL = "https://github.com/awezio/Smart-Favorites";
const EXTENSION_URL =
  "https://github.com/awezio/Smart-Favorites/tree/main/extension";

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>("zh");
  const t = translations[locale];

  const featureCards = [
    { icon: Search, ...t.features.semanticSearch },
    { icon: MessageSquare, ...t.features.aiChat },
    { icon: Bookmark, ...t.features.bookmarks },
    { icon: Star, ...t.features.stars },
    { icon: Puzzle, ...t.features.extension },
    { icon: Sparkles, ...t.features.aiDesc },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              SF
            </span>
            <span className="hidden text-lg font-bold sm:inline">
              Smart Favorites
            </span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              {t.nav.features}
            </a>
            <a href="#extension" className="transition-colors hover:text-foreground">
              {t.nav.extension}
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              {t.nav.howItWorks}
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {t.nav.github}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
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

      <section className="border-b">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            {locale === "zh"
              ? "使用 Next.js + Supabase + pgvector 构建"
              : "Built with Next.js + Supabase + pgvector"}
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t.hero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t.hero.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                {t.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="gap-2">
                <Github className="h-5 w-5" />
                {t.hero.ctaSecondary}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="border-b py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.features.title}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              {t.features.subtitle}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-lg border bg-card p-6">
                  <Icon className="mb-4 h-6 w-6 text-primary" />
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="extension" className="border-b bg-muted/30 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.extensionSection.title}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t.extensionSection.subtitle}
            </p>
            <div className="mt-8 space-y-3">
              {t.extensionSection.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-4 w-4" />
                  </span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <a
              href={EXTENSION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block"
            >
              <Button size="lg" className="gap-2">
                <Download className="h-5 w-5" />
                {t.extensionSection.download}
              </Button>
            </a>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3 border-b pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
                SF
              </span>
              <span className="font-semibold">Smart Favorites</span>
              <span className="ml-auto text-xs text-muted-foreground">Side Panel</span>
            </div>
            <div className="mb-4 flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {locale === "zh" ? "搜索你的收藏..." : "Search your favorites..."}
              </span>
            </div>
            {["Next.js Documentation", "Supabase", "Tailwind CSS"].map((title, index) => (
              <div
                key={title}
                className="mb-2 flex items-center justify-between rounded-lg border p-3"
              >
                <span className="text-sm font-medium">{title}</span>
                <span className="text-xs font-medium text-primary">
                  {[92, 87, 84][index]}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            {t.howItWorks.title}
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {t.howItWorks.steps.map((step, index) => {
              const icons = [Import, Brain, Zap];
              const Icon = icons[index];
              return (
                <div key={step.title} className="text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-20 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {locale === "zh"
              ? "开始智能管理你的收藏"
              : "Start Managing Your Favorites Smartly"}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {locale === "zh"
              ? "免费、开源、自托管。你的数据完全由你掌控。"
              : "Free, open-source, self-hosted. Your data, your control."}
          </p>
          <Link href="/dashboard" className="mt-8 inline-block">
            <Button size="lg" className="gap-2">
              {t.hero.cta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
