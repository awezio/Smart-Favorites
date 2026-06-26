import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { DitheredImage } from "@/components/layout/dithered-image";
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
        {item.snapshotUrl ? (
          <DitheredImage className="relative aspect-[4/3] w-full bg-muted">
            <Image
              src={item.snapshotUrl}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
              className="object-cover object-top"
            />
          </DitheredImage>
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <SnapshotPlaceholder title={item.title} />
          </div>
        )}
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
  return <SnapshotCarousel items={items} />;
}

const CAROUSEL_INTERVAL_MS = 5000;

export function SnapshotCarousel({ items }: { items: SnapshotCardData[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex((next + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) {
    return null;
  }

  const item = items[index];

  return (
    <div
      className="relative overflow-hidden border border-border bg-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[16/7] w-full bg-muted sm:aspect-[21/8]">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Link
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block h-full w-full"
            >
              {item.snapshotUrl ? (
                <DitheredImage className="relative h-full w-full">
                  <Image
                    src={item.snapshotUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 1200px"
                    unoptimized
                    className="object-cover object-center"
                  />
                </DitheredImage>
              ) : (
                <SnapshotPlaceholder title={item.title} />
              )}
              <div className="absolute inset-x-0 bottom-0 border-t border-border/80 bg-background/90 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-lg font-semibold sm:text-xl">
                      {item.title}
                    </h3>
                    {item.category && (
                      <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                        {item.category}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={(event) => {
                event.preventDefault();
                goTo(index - 1);
              }}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 border border-border bg-background/90 p-2 text-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={(event) => {
                event.preventDefault();
                goTo(index + 1);
              }}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 border border-border bg-background/90 p-2 text-foreground transition-colors hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3">
          {items.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${slideIndex + 1}`}
              onClick={() => goTo(slideIndex)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                slideIndex === index ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
