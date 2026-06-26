import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { HomepageShowcaseItem } from "@/lib/showcase-homepage";

export async function listHomepageShowcaseItems(): Promise<HomepageShowcaseItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("homepage_showcase_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as HomepageShowcaseItem[];
}

export async function listEnabledHomepageShowcaseItems(): Promise<HomepageShowcaseItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("homepage_showcase_items")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as HomepageShowcaseItem[];
}
