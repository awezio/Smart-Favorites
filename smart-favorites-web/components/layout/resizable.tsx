"use client";

import type { ComponentProps } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type Layout,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

type ResizablePanelGroupProps = Omit<ComponentProps<typeof Group>, "orientation"> & {
  direction?: "horizontal" | "vertical";
  autoSaveId?: string;
  panelIds?: string[];
  fallbackLayout?: Layout;
};

function ResizablePanelGroup({
  direction = "horizontal",
  autoSaveId,
  panelIds,
  fallbackLayout,
  className,
  defaultLayout,
  onLayoutChanged,
  ...props
}: ResizablePanelGroupProps) {
  const persistedLayout = useDefaultLayout({
    id: autoSaveId ?? "resizable-panel-group",
    panelIds: panelIds ?? [],
  });

  const resolvedDefaultLayout =
    (autoSaveId ? persistedLayout.defaultLayout : undefined) ??
    defaultLayout ??
    fallbackLayout;

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
        "relative z-20 mx-[-4px] flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-border/80 transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[panel-group-direction=vertical]:mx-0 data-[panel-group-direction=vertical]:my-[-4px] data-[panel-group-direction=vertical]:h-2 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
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

export { ResizablePanelGroup, ResizablePanel, ResizableHandle, useDefaultLayout, type Layout };
