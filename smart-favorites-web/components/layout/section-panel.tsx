import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionPanelProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  noPadding?: boolean;
}

export function SectionPanel({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  headerClassName,
  noPadding = false,
}: SectionPanelProps) {
  const hasHeader = title || description || actions;

  return (
    <section className={cn("border border-border bg-card", className)}>
      {hasHeader && (
        <header
          className={cn(
            "flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5",
            headerClassName
          )}
        >
          <div className="min-w-0 space-y-1">
            {title && (
              <h2 className="font-serif text-base font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(!noPadding && "panel-pad", contentClassName)}>{children}</div>
    </section>
  );
}
