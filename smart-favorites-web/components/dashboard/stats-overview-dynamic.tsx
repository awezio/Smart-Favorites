"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function StatsOverviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="px-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-7 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Skeleton className="h-[280px] xl:col-span-2" />
        <Skeleton className="h-[280px] xl:col-span-3" />
      </div>
    </div>
  );
}

export const StatsOverview = dynamic(
  () => import("./stats-overview").then((mod) => mod.StatsOverview),
  {
    ssr: false,
    loading: () => <StatsOverviewSkeleton />,
  }
);

export type { StatMetric, ChartDatum } from "./stats-overview";
