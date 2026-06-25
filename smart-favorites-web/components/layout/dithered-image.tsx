import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DitheredImageProps {
  children: ReactNode;
  className?: string;
}

/** Wraps photos with ordered-dither + grain (solar.lowtechmagazine.com style). */
export function DitheredImage({ children, className }: DitheredImageProps) {
  return <div className={cn("dither-image", className)}>{children}</div>;
}

interface DitheredSurfaceProps {
  children: ReactNode;
  className?: string;
}

/** Background texture layer with dither; keeps foreground text crisp. */
export function DitheredSurface({ children, className }: DitheredSurfaceProps) {
  return (
    <div className={cn("dither-surface relative overflow-hidden", className)}>
      <div className="dither-surface-bg" aria-hidden />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
