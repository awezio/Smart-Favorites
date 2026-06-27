"use client";

import type { ComponentProps, ReactNode } from "react";
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
};

function ResizablePanelGroup({
  direction = "horizontal",
  autoSaveId,
  panelIds,
  className,
  defaultLayout,
  onLayoutChanged,
  ...props
}: ResizablePanelGroupProps) {
  const persistedLayout = useDefaultLayout({
    id: autoSaveId ?? "resizable-panel-group",
    panelIds: panelIds ?? [],
  });

  return (
    <Group
      id={autoSaveId}
      orientation={direction}
      className={cn("flex h-full w-full", className)}
      defaultLayout={autoSaveId ? persistedLayout.defaultLayout : defaultLayout}
      onLayoutChanged={autoSaveId ? persistedLayout.onLayoutChanged : onLayoutChanged}
      {...props}
    />
  );
}

const ResizablePanel = Panel;

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
        "relative flex w-px items-center justify-center bg-border transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-border bg-background">
          <div className="h-2.5 w-0.5 rounded-full bg-border" />
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
  type Layout,
};
