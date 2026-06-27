import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type UserAgentMemory = {
  user_id: string;
  memory_entries: string[];
  user_profile_entries: string[];
  pending_entries: string[];
  memory_char_limit: number;
  profile_char_limit: number;
  write_approval_required: boolean;
  created_at?: string;
  updated_at?: string;
};

export type MemorySnapshot = {
  memoryBlock: string;
  profileBlock: string;
  frozenAt: string;
};

type MemoryClient = {
  from: ReturnType<typeof createAdminClient>["from"];
};

const DEFAULT_MEMORY: Omit<UserAgentMemory, "user_id"> = {
  memory_entries: [],
  user_profile_entries: [],
  pending_entries: [],
  memory_char_limit: 4000,
  profile_char_limit: 2000,
  write_approval_required: false,
};

export async function getUserAgentMemory(
  userId: string,
  client?: MemoryClient
): Promise<UserAgentMemory> {
  const supabase = client || createAdminClient();
  const { data, error } = await supabase
    .from("user_agent_memory")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return { user_id: userId, ...DEFAULT_MEMORY };
  }

  return normalizeMemoryRow(data);
}

export async function saveUserAgentMemory(
  userId: string,
  updates: Partial<
    Pick<
      UserAgentMemory,
      | "memory_entries"
      | "user_profile_entries"
      | "pending_entries"
      | "memory_char_limit"
      | "profile_char_limit"
      | "write_approval_required"
    >
  >,
  client?: MemoryClient
): Promise<UserAgentMemory> {
  const supabase = client || createAdminClient();
  const payload = {
    user_id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_agent_memory")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeMemoryRow(data);
}

export async function getMemorySnapshot(
  userId: string,
  client?: MemoryClient
): Promise<MemorySnapshot> {
  const memory = await getUserAgentMemory(userId, client);

  return {
    memoryBlock: memory.memory_entries.map((entry, index) => `${index + 1}. ${entry}`).join("\n"),
    profileBlock: memory.user_profile_entries
      .map((entry, index) => `${index + 1}. ${entry}`)
      .join("\n"),
    frozenAt: new Date().toISOString(),
  };
}

function normalizeMemoryRow(row: Record<string, unknown>): UserAgentMemory {
  return {
    user_id: String(row.user_id),
    memory_entries: toStringArray(row.memory_entries),
    user_profile_entries: toStringArray(row.user_profile_entries),
    pending_entries: toStringArray(row.pending_entries),
    memory_char_limit:
      typeof row.memory_char_limit === "number" ? row.memory_char_limit : DEFAULT_MEMORY.memory_char_limit,
    profile_char_limit:
      typeof row.profile_char_limit === "number" ? row.profile_char_limit : DEFAULT_MEMORY.profile_char_limit,
    write_approval_required: row.write_approval_required === true,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function totalEntryChars(entries: string[]): number {
  return entries.reduce((sum, entry) => sum + entry.length, 0);
}
