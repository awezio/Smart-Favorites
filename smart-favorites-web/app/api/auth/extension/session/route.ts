import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth/get-user";
import { createExtensionToken, hashExtensionToken } from "@/lib/auth/extension-token";

export async function POST(request: NextRequest) {
  const { userId } = await getAuthUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const extensionId = typeof body.extensionId === "string" ? body.extensionId : "";
  if (!extensionId) {
    return NextResponse.json({ error: "extensionId is required" }, { status: 400 });
  }

  const token = createExtensionToken();
  const supabase = createAdminClient();
  const { error } = await supabase.from("extension_sessions").insert({
    user_id: userId,
    extension_id: extensionId,
    token_hash: hashExtensionToken(token),
    last_used_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token });
}
