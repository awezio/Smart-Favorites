"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PowerIndicatorProps {
  className?: string;
  compact?: boolean;
  label?: string;
}

export function PowerIndicator({
  className,
  compact = false,
  label = "在线",
}: PowerIndicatorProps) {
  const [level, setLevel] = useState(88);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLevel((prev) => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1);
        return Math.min(100, Math.max(72, next));
      });
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  const segments = 5;
  const filled = Math.round((level / 100) * segments);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 border border-border bg-background px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground",
        className
      )}
      title={`系统状态：${label}`}
      aria-label={`系统状态：${label}，电量 ${level}%`}
    >
      {!compact && <span className="hidden sm:inline">{label}</span>}
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-1 border border-border",
              i < filled ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </span>
      <span className="tabular-nums text-foreground">{level}%</span>
    </div>
  );
}
