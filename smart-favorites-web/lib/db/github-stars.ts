import { createAdminClient } from "@/lib/supabase/admin";
import type { GitHubStar } from "@/types";

type StarInsert = Omit<GitHubStar, "id" | "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

type StarUpdate = Partial<Omit<GitHubStar, "id" | "user_id" | "created_at">> & {
  updated_at?: string;
};

export async function getStars(
  limit: number,
  offset: number,
  userId?: string
): Promise<GitHubStar[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("github_stars")
    .select("*")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data as GitHubStar[];
}

export async function createStar(payload: StarInsert): Promise<GitHubStar> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("github_stars")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GitHubStar;
}

export async function updateStar(
  id: string,
  updates: StarUpdate
): Promise<GitHubStar> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("github_stars")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GitHubStar;
}

export async function deleteStar(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("github_stars").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function bulkInsertStars(payload: StarInsert[]): Promise<void> {
  if (payload.length === 0) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("github_stars").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}
