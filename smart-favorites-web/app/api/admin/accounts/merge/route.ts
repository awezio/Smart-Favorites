import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser, adminErrorResponse } from "@/lib/auth/admin";

const directOwnerTables = [
  "bookmarks",
  "github_stars",
  "chat_sessions",
  "documents",
  "document_chunks",
  "api_keys",
  "api_audit_logs",
  "square_posts",
  "square_post_votes",
  "extension_sessions",
  "ai_call_logs",
];

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser(request);
    const body = await request.json();
    const sourceUserId = String(body.sourceUserId || "");
    const targetUserId = String(body.targetUserId || "");

    if (!sourceUserId || !targetUserId || sourceUserId === targetUserId) {
      return NextResponse.json(
        { error: "sourceUserId and targetUserId are required and must differ" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const summary: Record<string, number | string> = {};

    for (const table of directOwnerTables) {
      const { count, error } = await supabase
        .from(table)
        .update({ user_id: targetUserId }, { count: "exact" })
        .eq("user_id", sourceUserId);

      if (error && !isMissingTable(error.message)) throw error;
      summary[table] = count || 0;
    }

    await mergeUserSettings(supabase, sourceUserId, targetUserId, summary);
    await mergeProfiles(supabase, sourceUserId, targetUserId, summary);

    return NextResponse.json({
      success: true,
      sourceUserId,
      targetUserId,
      summary,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

function isMissingTable(message: string) {
  return /does not exist|schema cache|Could not find the table/i.test(message);
}

async function mergeUserSettings(
  supabase: ReturnType<typeof createAdminClient>,
  sourceUserId: string,
  targetUserId: string,
  summary: Record<string, number | string>
) {
  const [{ data: source }, { data: target }] = await Promise.all([
    supabase.from("user_settings").select("*").eq("user_id", sourceUserId).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", targetUserId).maybeSingle(),
  ]);

  if (!source) return;

  const merged = {
    ...source,
    ...target,
    user_id: targetUserId,
    api_keys: { ...(source.api_keys || {}), ...(target?.api_keys || {}) },
    github_username: target?.github_username || source.github_username,
    github_token: target?.github_token || source.github_token,
    default_llm_provider: target?.default_llm_provider || source.default_llm_provider,
    default_llm_model: target?.default_llm_model || source.default_llm_model,
  };

  delete (merged as any).id;
  await supabase.from("user_settings").upsert(merged, { onConflict: "user_id" });
  await supabase.from("user_settings").delete().eq("user_id", sourceUserId);
  summary.user_settings = "merged";
}

async function mergeProfiles(
  supabase: ReturnType<typeof createAdminClient>,
  sourceUserId: string,
  targetUserId: string,
  summary: Record<string, number | string>
) {
  const [{ data: source }, { data: target }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", sourceUserId).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
  ]);

  if (!source) return;

  if (target) {
    await supabase
      .from("profiles")
      .update({
        display_name: target.display_name || source.display_name,
        bio: target.bio || source.bio,
        avatar_url: target.avatar_url || source.avatar_url,
        avatar_seed: target.avatar_seed || source.avatar_seed,
      })
      .eq("id", targetUserId);
    await supabase.from("profiles").delete().eq("id", sourceUserId);
  } else {
    await supabase.from("profiles").update({ id: targetUserId }).eq("id", sourceUserId);
  }

  summary.profiles = "merged";
}
