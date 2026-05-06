import { createAdminClient } from "@/lib/supabase/admin";
import { GitHubStar } from "@/types";

export async function getStars(
  limit: number = 50,
  offset: number = 0,
  userId?: string
): Promise<GitHubStar[]> {
  const admin = createAdminClient();
  let query = admin
    .from("github_stars")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as GitHubStar[];
}

export async function getStar(id: string): Promise<GitHubStar | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("github_stars")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as GitHubStar;
}

export async function createStar(
  data: Omit<GitHubStar, "id" | "created_at" | "updated_at">
): Promise<GitHubStar> {
  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("github_stars")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return created as GitHubStar;
}

export async function bulkInsertStars(
  stars: Omit<GitHubStar, "id" | "created_at" | "updated_at">[]
): Promise<number> {
  if (stars.length === 0) return 0;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("github_stars")
    .insert(stars)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export async function updateStar(
  id: string,
  updates: Partial<Omit<GitHubStar, "id" | "created_at">>
): Promise<GitHubStar> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("github_stars")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as GitHubStar;
}

export async function deleteStar(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("github_stars").delete().eq("id", id);
  if (error) throw error;
}
