import { createAdminClient } from "@/lib/supabase/admin";
import type { GitHubStar } from "@/types";

type SupabaseQueryClient = {
  from: ReturnType<typeof createAdminClient>["from"];
};

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
  userId?: string,
  client?: SupabaseQueryClient
): Promise<GitHubStar[]> {
  const supabase = client || createAdminClient();
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

export async function createStar(
  payload: StarInsert,
  client?: SupabaseQueryClient
): Promise<GitHubStar> {
  const supabase = client || createAdminClient();
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
  updates: StarUpdate,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<GitHubStar> {
  const supabase = client || createAdminClient();
  let query = supabase
    .from("github_stars")
    .update(updates)
    .eq("id", id);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GitHubStar;
}

export async function deleteStar(
  id: string,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<void> {
  const supabase = client || createAdminClient();
  let query = supabase.from("github_stars").delete().eq("id", id);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

export async function bulkInsertStars(
  payload: StarInsert[],
  client?: SupabaseQueryClient
): Promise<void> {
  if (payload.length === 0) {
    return;
  }

  const supabase = client || createAdminClient();
  const { error } = await supabase.from("github_stars").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}
