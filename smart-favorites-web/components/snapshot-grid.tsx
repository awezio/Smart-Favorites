import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

export interface SnapshotCardData {
  id: string;
  title: string;
  url: string;
  snapshotUrl?: string | null;
  category?: string;
}

interface SnapshotGridProps {
  items: SnapshotCardData[];
  className?: string;
  columns?: 2 | 3 | 4;
}

export function SnapshotGrid({
  items,
  className,
  columns = 3,
}: SnapshotGridProps) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }[columns];

  return (
    <motion.div
      className={cn("@container grid gap-4 sm:gap-6", colClass, className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
    >
      {items.map((item) => (
        <SnapshotCard key={item.id} item={item} />
      ))}
    </motion.div>
  );
}

function SnapshotCard({ item }: { item: SnapshotCardData }) {
  return (
    <motion.article variants={staggerItem} className="group @container">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden border border-border bg-card transition-colors hover:bg-muted/30"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {item.snapshotUrl ? (
            <Image
              src={item.snapshotUrl}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
              className="object-cover object-top"
            />
          ) : (
            <SnapshotPlaceholder title={item.title} />
          )}
          <div className="absolute inset-0 hidden" />
          <div className="absolute bottom-0 left-0 right-0 hidden p-4">
            <p className="truncate font-medium text-white">{item.title}</p>
            <p className="truncate text-xs text-white/80">{item.url}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 p-4 @xs:p-5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-serif text-base font-semibold text-foreground">{item.title}</h3>
            {item.category && (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>
            )}
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </a>
    </motion.article>
  );
}

function SnapshotPlaceholder({ title }: { title: string }) {
  return (
    <div className="texture-accent noise-overlay flex h-full w-full flex-col items-center justify-center gap-3 p-6">
      <svg viewBox="0 0 80 60" className="h-16 w-20 text-primary/40" aria-hidden>
        <rect x="4" y="4" width="72" height="52" rx="4" fill="currentColor" fillOpacity="0.2" />
        <rect x="12" y="14" width="24" height="18" rx="2" fill="currentColor" fillOpacity="0.35" />
        <rect x="42" y="14" width="26" height="4" rx="1" fill="currentColor" fillOpacity="0.25" />
        <rect x="42" y="22" width="20" height="3" rx="1" fill="currentColor" fillOpacity="0.2" />
        <rect x="12" y="38" width="56" height="3" rx="1" fill="currentColor" fillOpacity="0.15" />
      </svg>
      <span className="max-w-full truncate text-center text-xs text-muted-foreground">
        {title}
      </span>
    </div>
  );
}

export function SnapshotMarquee({ items }: { items: SnapshotCardData[] }) {
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden py-4">
      <div className="flex animate-marquee gap-4 hover:[animation-play-state:paused]">
        {doubled.map((item, i) => (
          <Link
            key={`${item.id}-${i}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative h-40 w-64 shrink-0 overflow-hidden border border-border bg-card"
          >
            {item.snapshotUrl ? (
              <Image
                src={item.snapshotUrl}
                alt={item.title}
                fill
                sizes="256px"
                unoptimized
                className="object-cover object-top"
              />
            ) : (
              <SnapshotPlaceholder title={item.title} />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
