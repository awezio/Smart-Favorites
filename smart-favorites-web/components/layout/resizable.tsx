"use client";

import { useCallback, useEffect, useMemo, type ComponentProps } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  useGroupRef,
  usePanelRef,
  type Layout,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

type ResizablePanelGroupProps = Omit<ComponentProps<typeof Group>, "orientation"> & {
  direction?: "horizontal" | "vertical";
  autoSaveId?: string;
  fallbackLayout?: Layout;
  sanitizeLayout?: (layout: Layout) => Layout;
  groupRef?: ComponentProps<typeof Group>["groupRef"];
};

function layoutsEqual(a: Layout, b: Layout): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => Math.abs((a[key] ?? 0) - (b[key] ?? 0)) < 0.01);
}

function ResizablePanelGroup({
  direction = "horizontal",
  autoSaveId,
  fallbackLayout,
  sanitizeLayout,
  groupRef,
  className,
  defaultLayout,
  onLayoutChanged,
  ...props
}: ResizablePanelGroupProps) {
  const persistedLayout = useDefaultLayout({
    id: autoSaveId ?? "resizable-panel-group",
  });

  const { resolvedDefaultLayout, invalidStoredLayout } = useMemo(() => {
    const candidate =
      (autoSaveId ? persistedLayout.defaultLayout : undefined) ??
      defaultLayout ??
      fallbackLayout;

    if (!candidate) {
      return { resolvedDefaultLayout: undefined, invalidStoredLayout: false };
    }

    const sanitized = sanitizeLayout ? sanitizeLayout(candidate) : candidate;
    const invalidStoredLayout = Boolean(
      sanitizeLayout && autoSaveId && persistedLayout.defaultLayout && !layoutsEqual(sanitized, candidate)
    );

    if (fallbackLayout) {
      const values = Object.values(sanitized);
      const sum = values.reduce((total, size) => total + size, 0);
      if (Math.abs(sum - 100) > 0.5 || values.some((size) => size <= 0)) {
        return { resolvedDefaultLayout: fallbackLayout, invalidStoredLayout: true };
      }
    }

    return { resolvedDefaultLayout: sanitized, invalidStoredLayout };
  }, [
    autoSaveId,
    defaultLayout,
    fallbackLayout,
    persistedLayout.defaultLayout,
    sanitizeLayout,
  ]);

  useEffect(() => {
    if (!invalidStoredLayout || !autoSaveId || typeof window === "undefined") {
      return;
    }

    for (const key of Object.keys(localStorage)) {
      if (key.includes(String(autoSaveId))) {
        localStorage.removeItem(key);
      }
    }
  }, [autoSaveId, invalidStoredLayout]);

  const handleLayoutChanged = useCallback(
    (layout: Layout) => {
      const sanitized = sanitizeLayout ? sanitizeLayout(layout) : layout;
      if (sanitizeLayout && !layoutsEqual(sanitized, layout)) {
        return;
      }
      if (autoSaveId) {
        persistedLayout.onLayoutChanged(sanitized);
      }
      onLayoutChanged?.(sanitized);
    },
    [autoSaveId, onLayoutChanged, persistedLayout, sanitizeLayout]
  );

  return (
    <Group
      id={autoSaveId}
      groupRef={groupRef}
      orientation={direction}
      className={cn("h-full w-full", className)}
      defaultLayout={resolvedDefaultLayout}
      onLayoutChanged={handleLayoutChanged}
      resizeTargetMinimumSize={{ coarse: 32, fine: 12 }}
      {...props}
    />
  );
}

function ResizablePanel({
  className,
  children,
  ...props
}: ComponentProps<typeof Panel>) {
  return (
    <Panel className={className} {...props}>
      <div className="h-full min-h-0 min-w-0 overflow-hidden">{children}</div>
    </Panel>
  );
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) {
  return (
    <Separator
      className={cn(
        "relative z-30 flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center bg-border/60 transition-colors hover:bg-primary/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[panel-group-direction=vertical]:h-3 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="pointer-events-none z-10 flex h-8 w-3 items-center justify-center rounded-sm border border-border bg-background shadow-sm">
          <div className="h-4 w-0.5 rounded-full bg-muted-foreground/50" />
        </div>
      ) : null}
    </Separator>
  );
}

export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  useDefaultLayout,
  useGroupRef,
  usePanelRef,
  type Layout,
};
