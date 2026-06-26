import type { ReactNode } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DitheredSurface } from "@/components/layout/dithered-image";

export type SquareHeroStat = {
  label: string;
  value: string;
  icon: LucideIcon;
};

type SquareHeroProps = {
  badge: string;
  title: string;
  description: string;
  publishLabel: string;
  updatesOnLabel: string;
  stats: SquareHeroStat[];
  onPublish: () => void;
};

export function SquareHero({
  badge,
  title,
  description,
  publishLabel,
  updatesOnLabel,
  stats,
  onPublish,
}: SquareHeroProps) {
  return (
    <DitheredSurface className="noise-overlay overflow-hidden p-0">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[min(46%,28rem)] lg:block" aria-hidden>
        <div className="square-art-tint relative h-full w-full">
          <Image
            src="/images/square/hero-dashboard.png"
            alt=""
            fill
            className="object-cover object-center"
            sizes="(min-width: 1024px) 28rem, 0px"
            priority
          />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-[38%] hidden h-40 w-40 opacity-30 xl:block" aria-hidden>
        <div className="relative h-full w-full">
          <Image
            src="/images/square/logo.svg"
            alt=""
            fill
            className="object-contain"
            sizes="10rem"
          />
        </div>
      </div>

      <div className="relative z-[2] flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="square-glass-panel max-w-2xl space-y-4 p-6 sm:p-7">
          <p className="utility-label inline-flex w-fit items-center gap-2 border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
            <Image
              src="/images/square/logo.svg"
              alt=""
              width={20}
              height={20}
              className="shrink-0"
            />
            {badge}
          </p>
          <div className="space-y-2">
            <h1 className="type-h1 text-foreground">{title}</h1>
            <p className="max-w-xl text-sm leading-6 text-foreground/80 sm:text-base">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onPublish} variant="creative">
              <Plus className="mr-2 h-4 w-4" />
              {publishLabel}
            </Button>
            <div className="square-glass-chip flex items-center gap-2 px-3 py-2 text-sm text-foreground/75">
              <TrendingUp className="h-4 w-4 text-primary" />
              {updatesOnLabel}
            </div>
          </div>
        </div>

        <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-none lg:min-w-[36rem]">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="square-glass-panel panel-pad">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="utility-label">{item.label}</span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3 text-2xl font-semibold text-foreground">{item.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </DitheredSurface>
  );
}

export function SquareWorkflowStrip({
  steps,
}: {
  steps: { step: string; title: string; description: string }[];
}) {
  return (
    <div className="square-glass-panel relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full max-w-md opacity-90 sm:max-w-lg" aria-hidden>
        <div className="square-art-tint relative h-full min-h-[7rem] w-full">
          <Image
            src="/images/square/workflow.png"
            alt=""
            fill
            className="object-contain object-right"
            sizes="(min-width: 640px) 32rem, 100vw"
          />
        </div>
      </div>
      <div className="relative z-[1] grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        {steps.map((item) => (
          <WorkflowStep key={item.step} {...item} />
        ))}
      </div>
    </div>
  );
}

function WorkflowStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1 border border-primary/10 bg-primary/5 p-3 sm:p-4">
      <p className="font-mono text-xs tracking-wider text-primary">{step}</p>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

export function SquareEmptyPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="square-glass-panel relative overflow-hidden px-6 py-14 text-center">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 max-w-xs opacity-70" aria-hidden>
        <div className="square-art-tint relative h-full min-h-[12rem] w-full">
          <Image
            src="/images/square/hero-desk.png"
            alt=""
            fill
            className="object-contain object-right"
            sizes="20rem"
          />
        </div>
      </div>
      <div className="relative z-[1] mx-auto max-w-md space-y-3">
        <div className="mx-auto h-28 w-28">
          <div className="square-art-tint relative h-full w-full">
            <Image
              src="/images/square/sync-cloud.png"
              alt=""
              fill
              className="object-contain"
              sizes="7rem"
            />
          </div>
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        {action && <div className="pt-4">{action}</div>}
      </div>
    </div>
  );
}
