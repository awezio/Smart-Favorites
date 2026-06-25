"use client";

import { useEffect, useState } from "react";
import { SnapshotGrid, SnapshotMarquee, type SnapshotCardData } from "@/components/snapshot-grid";
import { EditorialSection } from "@/components/layout/editorial-section";
import { Reveal } from "@/components/motion/reveal";
import { defaultShowcaseItems } from "@/lib/showcase";
interface ShowcaseSectionProps {
  title: string;
  subtitle: string;
}

export function ShowcaseSection({ title, subtitle }: ShowcaseSectionProps) {
  const [items, setItems] = useState<SnapshotCardData[]>(defaultShowcaseItems);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadShowcase() {
      try {
        const res = await fetch("/api/showcase");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        }
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadShowcase();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <EditorialSection id="showcase" title={title} subtitle={subtitle}>
      <Reveal>
        <div className="mb-8 hidden border border-border md:block">
          <SnapshotMarquee items={items} />
        </div>

        <div className={loading ? "opacity-80 transition-opacity" : undefined}>
          <SnapshotGrid items={items} columns={3} />
        </div>
      </Reveal>
    </EditorialSection>  );
}
