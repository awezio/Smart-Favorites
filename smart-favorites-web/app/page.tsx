"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Moon,
  Puzzle,
  Search,
  Sparkles,
  Star,
  Sun,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Footer } from "@/components/footer";
import { ShowcaseSection } from "@/components/home/showcase-section";
import {
  ContentList,
  ContentListItem,
  EditorialSection,
} from "@/components/layout/editorial-section";
import { PowerIndicator } from "@/components/layout/power-indicator";
import { DitheredImage } from "@/components/layout/dithered-image";
import { Reveal, RevealHero, RevealItem, RevealStagger } from "@/components/motion/reveal";
import { translations, type Locale } from "@/lib/i18n";
import { HERO_IMAGE } from "@/lib/editorial-images";

const GITHUB_URL = "https://github.com/awezio/Smart-Favorites";
const EXTENSION_URL =
  "https://github.com/awezio/Smart-Favorites/releases/latest";

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>("zh");
  const { theme, setTheme } = useTheme();
  const t = translations[locale];

  const featureCards = [
    { icon: Search, ...t.features.semanticSearch },
    { icon: MessageSquare, ...t.features.aiChat },
    { icon: Bookmark, ...t.features.bookmarks },
    { icon: Star, ...t.features.stars },
    { icon: Puzzle, ...t.features.extension },
    { icon: Sparkles, ...t.features.aiDesc },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navLinks = [
    { href: "#showcase", label: t.nav.showcase, external: false },
    { href: "#features", label: t.nav.features, external: false },
    { href: "#extension", label: t.nav.extension, external: false },
    { href: "#how-it-works", label: t.nav.howItWorks, external: false },
    { href: GITHUB_URL, label: t.nav.github, external: true },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="site-header">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <Logo size="sm" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                >
                  {link.label}
                </a>
              ) : (
                <a key={link.href} href={link.href} className="nav-link">
                  {link.label}
                </a>
              )
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <PowerIndicator compact className="hidden sm:inline-flex" />
            <button
              onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
              className="nav-link flex items-center gap-1 px-2 py-1"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden xs:inline">
                {locale === "zh" ? "EN" : "中文"}
              </span>
            </button>
            <button
              onClick={toggleTheme}
              className="nav-link p-2"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <Link href="/dashboard">
              <Button size="sm" variant="creative" className="inline-flex">
                {t.nav.dashboard}
              </Button>
            </Link>
          </div>
        </div>

        <nav
          className="mx-auto flex max-w-5xl gap-4 overflow-x-auto border-t border-border px-4 py-2 md:hidden"
          aria-label="Primary mobile"
        >
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link shrink-0 whitespace-nowrap"
              >
                {link.label}
              </a>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="nav-link shrink-0 whitespace-nowrap"
              >
                {link.label}
              </a>
            )
          )}
        </nav>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12">
          <RevealHero className="space-y-5">
            <p className="utility-label inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t.hero.badge}
            </p>
            <h1 className="type-display max-w-xl text-4xl md:text-5xl lg:text-6xl">
              {t.hero.title}
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href="/dashboard">
                <Button size="lg" variant="creative" className="gap-2">
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
          </RevealHero>

          <Reveal delay={0.08} className="relative border border-border noise-overlay">
            <DitheredImage>
              <Image
                src={HERO_IMAGE}
                alt={
                  locale === "zh"
                    ? "纸张纹理与知识归档"
                    : "Paper grain texture and knowledge archives"
                }
                width={1200}
                height={900}
                priority
                className="aspect-[4/3] w-full object-cover"
              />
            </DitheredImage>
            <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background/95 px-4 py-3">
              <PowerIndicator label={locale === "zh" ? "系统就绪" : "Ready"} />
            </div>
          </Reveal>
        </div>
      </section>

      <ShowcaseSection title={t.showcase.title} subtitle={t.showcase.subtitle} />

      <EditorialSection id="features" title={t.features.title} subtitle={t.features.subtitle}>
        <RevealStagger>
          <ContentList>
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title}>
                  <RevealItem>
                    <div className="flex gap-4 px-4 py-5 sm:px-6 sm:py-6">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-muted/50 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-serif text-lg font-semibold sm:text-xl">
                          {feature.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  </RevealItem>
                </li>
              );
            })}
          </ContentList>
        </RevealStagger>
      </EditorialSection>

      <EditorialSection
        id="extension"
        title={t.extensionSection.title}
        subtitle={t.extensionSection.subtitle}
        className="bg-muted/20"
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            {t.extensionSection.features.map((feature) => (
              <div key={feature} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-primary text-primary">
                  <Check className="h-3 w-3" />
                </span>
                <span>{feature}</span>
              </div>
            ))}
            <a
              href={EXTENSION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block pt-4"
            >
              <Button size="lg" variant="creative" className="gap-2">
                <Download className="h-5 w-5" />
                {t.extensionSection.download}
              </Button>
            </a>
          </div>

          <div className="panel">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Logo size="sm" showText={false} />
              <span className="font-medium">Smart Favorites</span>
              <span className="ml-auto utility-label">Side Panel</span>
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-center gap-2 border border-border bg-muted/30 p-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {locale === "zh" ? "搜索你的收藏..." : "Search your favorites..."}
                </span>
              </div>
              {[
                { title: "Next.js Documentation", tag: locale === "zh" ? "文档" : "Docs" },
                { title: "Supabase", tag: locale === "zh" ? "数据库" : "Database" },
                { title: "Tailwind CSS", tag: locale === "zh" ? "样式" : "CSS" },
              ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between border border-border p-3 text-sm"
                  >
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.tag}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection id="how-it-works" title={t.howItWorks.title} narrow>
        <ContentList>
          {t.howItWorks.steps.map((step, index) => {
            const icons = [Import, Brain, Zap];
            const Icon = icons[index];
            return (
              <ContentListItem
                key={step.title}
                title={step.title}
                description={step.desc}
                trailing={<Icon className="h-5 w-5 text-primary" />}
              />
            );
          })}
        </ContentList>
      </EditorialSection>

      <Reveal as="section" className="border-b border-border py-14 sm:py-16">
        <div className="editorial-column px-4 text-center sm:px-6">
          <h2 className="type-h2">{t.cta.title}</h2>
          <p className="mt-4 max-w-md mx-auto text-muted-foreground">{t.cta.subtitle}</p>
          <Link href="/dashboard" className="mt-8 inline-block">
            <Button size="lg" variant="creative" className="gap-2">
              {t.hero.cta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Reveal>

      <Footer locale={locale} />
    </div>
  );
}
