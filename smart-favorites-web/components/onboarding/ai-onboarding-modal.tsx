"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionPanel } from "@/components/layout/section-panel";
import { type DashboardLanguage } from "@/lib/dashboard-language";

type AiOnboardingModalVariant = "welcome" | "unconfigured";

interface AiOnboardingModalProps {
  open: boolean;
  variant: AiOnboardingModalVariant;
  language: DashboardLanguage;
  onClose: () => void;
}

const copy = {
  welcome: {
    zh: {
      title: "欢迎使用 Smart Favorites",
      description:
        "建议先配置 AI 模型与 API Key，以便使用 AI 问答、书签描述生成等功能。你可以在下方选择 Provider 并填写密钥。",
      primary: "开始配置",
      secondary: "稍后再说",
    },
    en: {
      title: "Welcome to Smart Favorites",
      description:
        "We recommend configuring an AI model API key first so you can use AI chat, bookmark descriptions, and more. Pick a provider below and add your key.",
      primary: "Start setup",
      secondary: "Maybe later",
    },
  },
  unconfigured: {
    zh: {
      title: "尚未配置 AI 模型",
      description:
        "当前未检测到可用的 AI Provider API Key，无法使用 AI 问答。请前往设置页配置至少一个 Provider 与 API Key。",
      primary: "前往设置",
      secondary: "我知道了",
    },
    en: {
      title: "AI model not configured",
      description:
        "No usable AI provider API key was detected, so AI chat is unavailable. Go to Settings and configure at least one provider API key.",
      primary: "Go to Settings",
      secondary: "Got it",
    },
  },
} as const;

export function AiOnboardingModal({
  open,
  variant,
  language,
  onClose,
}: AiOnboardingModalProps) {
  if (!open) {
    return null;
  }

  const t = copy[variant][language];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 p-4">
      <SectionPanel
        className="w-full max-w-lg border-border shadow-elevated"
        title={
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <span>{t.title}</span>
          </div>
        }
        description={t.description}
        actions={
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        }
        noPadding
      >
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
          <Button variant="outline" onClick={onClose}>
            {t.secondary}
          </Button>
          {variant === "unconfigured" ? (
            <Button variant="creative" asChild>
              <Link href="/dashboard/settings?onboarding=1" onClick={onClose}>
                {t.primary}
              </Link>
            </Button>
          ) : (
            <Button variant="creative" onClick={onClose}>
              {t.primary}
            </Button>
          )}
        </div>
      </SectionPanel>
    </div>
  );
}

export function getOnboardingDismissKey(userId: string) {
  return `smart-favorites:onboarding-dismissed:${userId}`;
}

export function hasDismissedOnboarding(userId: string | undefined): boolean {
  if (!userId || typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(getOnboardingDismissKey(userId)) === "1";
}

export function dismissOnboarding(userId: string | undefined) {
  if (!userId || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getOnboardingDismissKey(userId), "1");
}
