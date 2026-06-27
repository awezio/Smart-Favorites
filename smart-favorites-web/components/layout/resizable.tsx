"use client";

import { useMemo, type ComponentProps } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelRef,
  type Layout,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

type ResizablePanelGroupProps = Omit<ComponentProps<typeof Group>, "orientation"> & {
  direction?: "horizontal" | "vertical";
  autoSaveId?: string;
  panelIds?: string[];
  fallbackLayout?: Layout;
  sanitizeLayout?: (layout: Layout) => Layout;
};

function ResizablePanelGroup({
  direction = "horizontal",
  autoSaveId,
  panelIds,
  fallbackLayout,
  sanitizeLayout,
  className,
  defaultLayout,
  onLayoutChanged,
  ...props
}: ResizablePanelGroupProps) {
  const persistedLayout = useDefaultLayout({
    id: autoSaveId ?? "resizable-panel-group",
    panelIds: panelIds ?? [],
  });

  const resolvedDefaultLayout = useMemo(() => {
    const candidate =
      (autoSaveId ? persistedLayout.defaultLayout : undefined) ??
      defaultLayout ??
      fallbackLayout;

    if (!candidate) {
      return undefined;
    }

    const sanitized = sanitizeLayout ? sanitizeLayout(candidate) : candidate;

    if (fallbackLayout) {
      const values = Object.values(sanitized);
      const sum = values.reduce((total, size) => total + size, 0);
      if (Math.abs(sum - 100) > 0.5 || values.some((size) => size <= 0)) {
        return fallbackLayout;
      }
    }

    return sanitized;
  }, [
    autoSaveId,
    defaultLayout,
    fallbackLayout,
    persistedLayout.defaultLayout,
    sanitizeLayout,
  ]);

  return (
    <Group
      id={autoSaveId}
      orientation={direction}
      className={cn("h-full w-full", className)}
      defaultLayout={resolvedDefaultLayout}
      onLayoutChanged={autoSaveId ? persistedLayout.onLayoutChanged : onLayoutChanged}
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
  usePanelRef,
  type Layout,
};
