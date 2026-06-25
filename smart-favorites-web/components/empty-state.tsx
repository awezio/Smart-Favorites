"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  textured?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  textured = false,
}: EmptyStateProps) {
  return (
    <Reveal>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center border border-dashed border-border px-6 py-16 text-center",
          textured && "texture-accent noise-overlay"
        )}
      >
      <div className="mb-4 border border-border p-4">
        <Icon className="h-10 w-10 text-muted-foreground" strokeWidth={1.25} />
      </div>
      <h3 className="font-serif text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
      </div>
    </Reveal>
  );
}
