import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isExtensionAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  approvePendingEntries,
  rejectPendingEntries,
} from "@/lib/agent/memory/memory-tool";
import {
  getUserAgentMemory,
  saveUserAgentMemory,
  totalEntryChars,
} from "@/lib/agent/memory/memory-store";

function getClient(user: Awaited<ReturnType<typeof getAuthUser>>["user"]) {
  return isExtensionAuthUser(user) ? createAdminClient() : createServerSupabaseClient();
}

export async function GET(request: NextRequest) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await getClient(user);
    const memory = await getUserAgentMemory(userId, supabase);

    return NextResponse.json({
      memory_entries: memory.memory_entries,
      user_profile_entries: memory.user_profile_entries,
      pending_entries: memory.pending_entries,
      memory_char_limit: memory.memory_char_limit,
      profile_char_limit: memory.profile_char_limit,
      write_approval_required: memory.write_approval_required,
      memory_chars_used: totalEntryChars(memory.memory_entries),
      profile_chars_used: totalEntryChars(memory.user_profile_entries),
      updated_at: memory.updated_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load agent memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const supabase = await getClient(user);
    const current = await getUserAgentMemory(userId, supabase);
    const updates: Parameters<typeof saveUserAgentMemory>[1] = {};

    if (Array.isArray(body.memory_entries)) {
      const memoryEntries = body.memory_entries
        .filter((item: unknown): item is string => typeof item === "string")
        .map((item: string) => item.trim())
        .filter(Boolean);
      if (totalEntryChars(memoryEntries) > current.memory_char_limit) {
        return NextResponse.json({ error: "Memory entries exceed char limit" }, { status: 400 });
      }
      updates.memory_entries = memoryEntries;
    }

    if (Array.isArray(body.user_profile_entries)) {
      const profileEntries = body.user_profile_entries
        .filter((item: unknown): item is string => typeof item === "string")
        .map((item: string) => item.trim())
        .filter(Boolean);
      if (totalEntryChars(profileEntries) > current.profile_char_limit) {
        return NextResponse.json({ error: "Profile entries exceed char limit" }, { status: 400 });
      }
      updates.user_profile_entries = profileEntries;
    }

    if (body.write_approval_required !== undefined) {
      updates.write_approval_required = Boolean(body.write_approval_required);
    }

    if (Array.isArray(body.approve_pending) && body.approve_pending.length > 0) {
      const approved = approvePendingEntries(
        current.pending_entries,
        current.memory_entries,
        body.approve_pending,
        current.memory_char_limit
      );
      updates.pending_entries = approved.pending_entries;
      updates.memory_entries = approved.memory_entries;
    }

    if (Array.isArray(body.reject_pending) && body.reject_pending.length > 0) {
      const rejected = rejectPendingEntries(current.pending_entries, body.reject_pending);
      updates.pending_entries = rejected.pending_entries;
    }

    const saved = await saveUserAgentMemory(userId, updates, supabase);

    return NextResponse.json({
      success: true,
      memory_entries: saved.memory_entries,
      user_profile_entries: saved.user_profile_entries,
      pending_entries: saved.pending_entries,
      write_approval_required: saved.write_approval_required,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update agent memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
