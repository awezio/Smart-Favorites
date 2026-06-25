import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FeedListProps {
  children: ReactNode;
  className?: string;
}

/** Editorial archive list — single border, divided rows (HN / Low-tech Magazine style). */
export function FeedList({ children, className }: FeedListProps) {
  return (
    <div
      className={cn(
        "divide-y divide-border border border-border bg-card",
        className
      )}
    >
      {children}
    </div>
  );
}

interface FeedListItemProps {
  children: ReactNode;
  selected?: boolean;
  className?: string;
}

export function FeedListItem({
  children,
  selected = false,
  className,
}: FeedListItemProps) {
  return (
    <div
      className={cn(
        "transition-colors hover:bg-muted/30",
        selected && "border-l-2 border-l-primary bg-primary/[0.03]",
        className
      )}
    >
      {children}
    </div>
  );
}
