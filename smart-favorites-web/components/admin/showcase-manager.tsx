"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionPanel } from "@/components/layout/section-panel";
import type { HomepageShowcaseItem } from "@/lib/showcase-homepage";
import { BOOKMARK_SNAPSHOT_IMAGE_SENTINEL } from "@/lib/showcase-merge";
import { EDITORIAL_IMAGES } from "@/lib/editorial-images";

const IMAGE_PRESETS = [
  { label: "Use bookmark snapshot", value: BOOKMARK_SNAPSHOT_IMAGE_SENTINEL },
  { label: "Hero paper", value: EDITORIAL_IMAGES.heroPaper },
  { label: "Study notes", value: EDITORIAL_IMAGES.studyNotes },
  { label: "Archive pages", value: EDITORIAL_IMAGES.archivePages },
  { label: "Grain abstract", value: EDITORIAL_IMAGES.grainAbstract },
];

type DraftItem = {
  title: string;
  url: string;
  image_url: string;
  category: string;
  enabled: boolean;
  bookmark_url_match: string;
};

const emptyDraft = (): DraftItem => ({
  title: "",
  url: "",
  image_url: BOOKMARK_SNAPSHOT_IMAGE_SENTINEL,
  category: "",
  enabled: true,
  bookmark_url_match: "",
});

export function ShowcaseManager() {
  const [items, setItems] = useState<HomepageShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [applyingOverrides, setApplyingOverrides] = useState(false);
  const [draft, setDraft] = useState<DraftItem>(emptyDraft);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/showcase");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load showcase items");
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load showcase items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const persistOrder = async (ordered: HomepageShowcaseItem[]) => {
    const response = await fetch("/api/admin/showcase/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to reorder items");
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setItems(next);
    try {
      await persistOrder(next);
      toast.success("Order updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder");
      void loadItems();
    }
  };

  const updateItem = async (item: HomepageShowcaseItem, patch: Partial<HomepageShowcaseItem>) => {
    setSavingId(item.id);
    try {
      const response = await fetch(`/api/admin/showcase/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update item");
      }
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? data.item : entry))
      );
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update item");
    } finally {
      setSavingId(null);
    }
  };

  const deleteItem = async (item: HomepageShowcaseItem) => {
    if (!window.confirm(`Delete "${item.title}" from homepage showcase?`)) return;
    setSavingId(item.id);
    try {
      const response = await fetch(`/api/admin/showcase/${item.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete item");
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      toast.success("Deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete item");
    } finally {
      setSavingId(null);
    }
  };

  const createItem = async () => {
    if (!draft.title.trim() || !draft.url.trim() || !draft.image_url.trim()) {
      toast.error("Title, URL, and image are required");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          sort_order: items.length,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create item");
      }
      setItems((current) => [...current, data.item]);
      setDraft(emptyDraft());
      toast.success("Item created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create item");
    } finally {
      setCreating(false);
    }
  };

  const applyOverrides = async () => {
    setApplyingOverrides(true);
    try {
      const response = await fetch("/api/admin/showcase/apply-overrides", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to apply showcase overrides");
      }
      toast.success(data.message || "Overrides applied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply overrides");
    } finally {
      setApplyingOverrides(false);
    }
  };

  return (
    <div className="page-stack">
      <SectionPanel
        title="Homepage Showcase Overrides"
        description="Patch specific bookmark cards on the landing page without replacing the whole gallery. Use bookmark URL match (for example smart-favorites.cc.cd or chatexcel), then apply overrides to update the bookmark URL and regenerate snapshots. The dither filter stays on the frontend."
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={applyingOverrides}
            onClick={() => void applyOverrides()}
            className="gap-2"
          >
            {applyingOverrides ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Apply overrides & refresh snapshots
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading showcase items...
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No curated items yet. The homepage will fall back to bookmark snapshots until you add one.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="border border-border p-4">
                <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
                  <div
                    className="aspect-[4/3] border border-border bg-muted bg-cover bg-center"
                    style={
                      item.image_url === BOOKMARK_SNAPSHOT_IMAGE_SENTINEL
                        ? undefined
                        : { backgroundImage: `url(${item.image_url})` }
                    }
                  >
                    {item.image_url === BOOKMARK_SNAPSHOT_IMAGE_SENTINEL && (
                      <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
                        Uses bookmark snapshot (dithered on homepage)
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`title-${item.id}`}>Title</Label>
                      <Input
                        id={`title-${item.id}`}
                        defaultValue={item.title}
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          if (value && value !== item.title) {
                            void updateItem(item, { title: value });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`url-${item.id}`}>URL</Label>
                      <Input
                        id={`url-${item.id}`}
                        defaultValue={item.url}
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          if (value && value !== item.url) {
                            void updateItem(item, { url: value });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`image-${item.id}`}>Image URL</Label>
                      <Input
                        id={`image-${item.id}`}
                        defaultValue={item.image_url}
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          if (value && value !== item.image_url) {
                            void updateItem(item, { image_url: value });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`match-${item.id}`}>Bookmark URL match</Label>
                      <Input
                        id={`match-${item.id}`}
                        defaultValue={item.bookmark_url_match || ""}
                        placeholder="smart-favorites.cc.cd"
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          if (value !== (item.bookmark_url_match || "")) {
                            void updateItem(item, { bookmark_url_match: value });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`category-${item.id}`}>Category</Label>
                      <Input
                        id={`category-${item.id}`}
                        defaultValue={item.category || ""}
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          if (value !== (item.category || "")) {
                            void updateItem(item, { category: value });
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <Checkbox
                        id={`enabled-${item.id}`}
                        checked={item.enabled}
                        onChange={(event) =>
                          void updateItem(item, { enabled: event.target.checked })
                        }
                      />
                      <Label htmlFor={`enabled-${item.id}`}>Visible on homepage</Label>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 lg:flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={index === 0 || savingId === item.id}
                      onClick={() => void moveItem(index, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={index === items.length - 1 || savingId === item.id}
                      onClick={() => void moveItem(index, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" size="icon" aria-label="Open URL">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={savingId === item.id}
                      onClick={() => void deleteItem(item)}
                      aria-label="Delete item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      <SectionPanel title="Add Carousel Item">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="draft-title">Title</Label>
            <Input
              id="draft-title"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="draft-category">Category</Label>
            <Input
              id="draft-category"
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="draft-match">Bookmark URL match</Label>
            <Input
              id="draft-match"
              value={draft.bookmark_url_match}
              onChange={(event) =>
                setDraft((current) => ({ ...current, bookmark_url_match: event.target.value }))
              }
              placeholder="chatexcel"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="draft-url">URL</Label>
            <Input
              id="draft-url"
              value={draft.url}
              onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
              placeholder="https://www.smart-favorites.cc.cd/"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="draft-image">Image URL</Label>
            <Input
              id="draft-image"
              value={draft.image_url}
              onChange={(event) =>
                setDraft((current) => ({ ...current, image_url: event.target.value }))
              }
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {IMAGE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft((current) => ({ ...current, image_url: preset.value }))
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button type="button" onClick={() => void createItem()} disabled={creating} className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add item
          </Button>
        </div>
      </SectionPanel>
    </div>
  );
}
