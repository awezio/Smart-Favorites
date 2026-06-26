"use client";

import { useEffect, useState } from "react";
import { SnapshotGrid, SnapshotMarquee, type SnapshotCardData } from "@/components/snapshot-grid";
import { EditorialSection } from "@/components/layout/editorial-section";
import { Reveal } from "@/components/motion/reveal";

interface ShowcaseSectionProps {
  title: string;
  subtitle: string;
}

export function ShowcaseSection({ title, subtitle }: ShowcaseSectionProps) {
  const [items, setItems] = useState<SnapshotCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadShowcase() {
      try {
        const res = await fetch("/api/showcase");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.items)) {
          setItems(
            data.items.filter(
              (item: SnapshotCardData) =>
                Boolean(item.snapshotUrl) && Boolean(item.url) && Boolean(item.title)
            )
          );
        }
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadShowcase();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || items.length === 0) {
    return null;
  }

  return (
    <EditorialSection id="showcase" title={title} subtitle={subtitle}>
      <Reveal>
        <div className="mb-8 hidden border border-border md:block">
          <SnapshotMarquee items={items} />
        </div>
        <SnapshotGrid items={items} columns={3} />
      </Reveal>
    </EditorialSection>
  );
}
