"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export type StatMetric = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: "primary" | "emerald" | "amber" | "violet";
};

export type ChartDatum = {
  name: string;
  value: number;
};

type StatsOverviewProps = {
  metrics: StatMetric[];
  donut?: {
    title: string;
    data: ChartDatum[];
    centerLabel?: string;
    centerValue?: string;
  };
  bars?: {
    title: string;
    data: ChartDatum[];
    layout?: "vertical" | "horizontal";
  };
  className?: string;
};

const ACCENT_BAR: Record<NonNullable<StatMetric["accent"]>, string> = {
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
};

const CHART_FILLS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.72)",
  "hsl(var(--primary) / 0.52)",
  "hsl(var(--primary) / 0.36)",
  "hsl(var(--primary) / 0.24)",
  "hsl(var(--muted-foreground) / 0.35)",
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 px-3 py-2 shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label ?? item.name}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight">
        {item.value?.toLocaleString()}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div className="border-b border-border/50 px-5 py-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatsOverview({
  metrics,
  donut,
  bars,
  className,
}: StatsOverviewProps) {
  const donutTotal = donut?.data.reduce((sum, item) => sum + item.value, 0) ?? 0;

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Overview
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">数据概览</h2>
        </div>
        <div className="hidden h-px flex-1 bg-border/60 sm:block" aria-hidden />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const accent = metric.accent ?? "primary";
          return (
            <article
              key={metric.label}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-muted/15 p-4 shadow-sm transition-colors duration-200 hover:bg-muted/25"
            >
              <span
                className={cn(
                  "absolute inset-y-4 left-0 w-[3px] rounded-r-full",
                  ACCENT_BAR[accent]
                )}
              />
              <div className="flex items-start justify-between gap-3 pl-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                    {typeof metric.value === "number"
                      ? metric.value.toLocaleString()
                      : metric.value}
                  </p>
                  {metric.hint && (
                    <p className="mt-1.5 text-xs text-muted-foreground/90">
                      {metric.hint}
                    </p>
                  )}
                </div>
                {Icon && (
                  <div className="rounded-xl border border-border/50 bg-background/80 p-2.5 text-muted-foreground transition-colors group-hover:text-foreground">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {(donut || bars) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {donut && (
            <Panel title={donut.title} className="xl:col-span-2">
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donut.data}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="transparent"
                    >
                      {donut.data.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_FILLS[index % CHART_FILLS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight">
                    {donut.centerValue ?? donutTotal.toLocaleString()}
                  </span>
                  {donut.centerLabel && (
                    <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {donut.centerLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {donut.data.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 text-xs"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: CHART_FILLS[index % CHART_FILLS.length],
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="font-medium tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {bars && (
            <Panel title={bars.title} className={donut ? "xl:col-span-3" : "xl:col-span-5"}>
              <ResponsiveContainer width="100%" height={220}>
                {bars.layout === "horizontal" ? (
                  <BarChart
                    data={bars.data}
                    layout="vertical"
                    margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={108}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
                      {bars.data.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_FILLS[index % CHART_FILLS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart
                    data={bars.data}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={24}>
                      {bars.data.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_FILLS[index % CHART_FILLS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
