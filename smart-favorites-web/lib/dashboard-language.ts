"use client";

import { useCallback, useEffect, useState } from "react";

export type DashboardLanguage = "zh" | "en";

const STORAGE_KEY = "smart-favorites:dashboard-language";
const CHANGE_EVENT = "smart-favorites:dashboard-language-change";

function normalizeLanguage(value: unknown): DashboardLanguage {
  return value === "en" ? "en" : "zh";
}

function readStoredLanguage(): DashboardLanguage {
  if (typeof window === "undefined") {
    return "zh";
  }

  return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
}

function applyDocumentLanguage(language: DashboardLanguage) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
}

export function useDashboardLanguage() {
  const [language, setLanguageState] = useState<DashboardLanguage>("zh");

  useEffect(() => {
    const storedLanguage = readStoredLanguage();
    setLanguageState(storedLanguage);
    applyDocumentLanguage(storedLanguage);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }
      const nextLanguage = normalizeLanguage(event.newValue);
      setLanguageState(nextLanguage);
      applyDocumentLanguage(nextLanguage);
    };

    const handleCustomEvent = (event: Event) => {
      const nextLanguage = normalizeLanguage((event as CustomEvent).detail);
      setLanguageState(nextLanguage);
      applyDocumentLanguage(nextLanguage);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANGE_EVENT, handleCustomEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHANGE_EVENT, handleCustomEvent);
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: DashboardLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    applyDocumentLanguage(nextLanguage);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: nextLanguage }));
  }, []);

  return [language, setLanguage] as const;
}

export function pickLanguage(language: DashboardLanguage, zh: string, en: string) {
  return language === "zh" ? zh : en;
}
