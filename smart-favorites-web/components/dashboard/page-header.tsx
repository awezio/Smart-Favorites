"use client";

import { cn } from "@/lib/utils";
import { pickLanguage, useDashboardLanguage } from "@/lib/dashboard-language";

const EYEBROW_COPY = {
  zh: "控制台",
  en: "Dashboard",
} as const;

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  eyebrow?: string;
  showEyebrow?: boolean;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  eyebrow,
  showEyebrow = true,
}: PageHeaderProps) {
  const [language] = useDashboardLanguage();
  const label = eyebrow ?? pickLanguage(language, EYEBROW_COPY.zh, EYEBROW_COPY.en);

  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        {showEyebrow && <p className="utility-label">{label}</p>}
        <h1 className="type-page-title font-serif">{title}</h1>
        {description && (
          <p className="type-page-description max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <div className={cn("panel panel-pad", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
