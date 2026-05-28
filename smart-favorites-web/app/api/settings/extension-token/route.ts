import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { randomUUID } from "crypto";

/**
 * GET /api/settings/extension-token
 * Returns the current extension token (masked) or null if not set.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("user_settings")
      .select("extension_token")
      .eq("user_id", userId)
      .single();

    const token = data?.extension_token;
    return NextResponse.json({
      hasToken: !!token,
      tokenPreview: token ? `••••${token.slice(-8)}` : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/settings/extension-token
 * Generate a new extension token. Returns the full token (show once).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const newToken = randomUUID();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, extension_token: newToken },
        { onConflict: "user_id" }
      );

    if (error) throw error;

    return NextResponse.json({
      token: newToken,
      message: "请复制此 Token 到扩展设置页，关闭后无法再次查看完整 Token",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
