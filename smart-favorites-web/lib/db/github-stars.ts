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

const SYNC_STAR_COLUMNS =
  "id, user_id, url, owner, repo, description, description_zh, description_en, description_metadata, language, stars, forks, updated";
const DB_BATCH_SIZE = 200;
const POSTGREST_PAGE_SIZE = 1000;

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  handler: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let index = 0; index < items.length; index += batchSize) {
    await handler(items.slice(index, index + batchSize));
  }
}

export async function getStars(
  limit: number,
  offset: number,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<GitHubStar[]> {
  const supabase = client || createAdminClient();
  const results: GitHubStar[] = [];
  let remaining = limit;
  let currentOffset = offset;

  while (remaining > 0) {
    const batchSize = Math.min(POSTGREST_PAGE_SIZE, remaining);
    let query = supabase
      .from("github_stars")
      .select("*")
      .order("updated_at", { ascending: false })
      .range(currentOffset, currentOffset + batchSize - 1);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      break;
    }

    results.push(...(data as GitHubStar[]));
    remaining -= data.length;
    currentOffset += data.length;

    if (data.length < batchSize) {
      break;
    }
  }

  return results;
}

export async function getStarsForSync(
  userId: string,
  client?: SupabaseQueryClient
): Promise<GitHubStar[]> {
  const supabase = client || createAdminClient();
  const results: GitHubStar[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("github_stars")
      .select(SYNC_STAR_COLUMNS)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + 999);

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      break;
    }

    results.push(...(data as GitHubStar[]));
    if (data.length < 1000) {
      break;
    }

    offset += 1000;
  }

  return results;
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
  await runInBatches(payload, DB_BATCH_SIZE, async (batch) => {
    const { error } = await supabase.from("github_stars").insert(batch);
    if (error) {
      throw new Error(error.message);
    }
  });
}

export async function bulkUpsertStars(
  payload: Array<StarInsert & { id: string }>,
  client?: SupabaseQueryClient
): Promise<void> {
  if (payload.length === 0) {
    return;
  }

  const supabase = client || createAdminClient();
  await runInBatches(payload, DB_BATCH_SIZE, async (batch) => {
    const { error } = await supabase.from("github_stars").upsert(batch);
    if (error) {
      throw new Error(error.message);
    }
  });
}

export async function bulkDeleteStars(
  ids: string[],
  userId: string,
  client?: SupabaseQueryClient
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const supabase = client || createAdminClient();
  await runInBatches(ids, DB_BATCH_SIZE, async (batch) => {
    const { error } = await supabase
      .from("github_stars")
      .delete()
      .in("id", batch)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }
  });
}
