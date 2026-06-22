import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getEnvProviderKey,
  isSupportedProvider,
  testProviderConnection,
} from "@/lib/ai/provider-config";
import { decryptSecret } from "@/lib/server/secrets";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey, model } = body;

    if (!provider || !isSupportedProvider(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    let resolvedKey = apiKey;
    if (!resolvedKey) {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("user_settings")
        .select("api_keys")
        .eq("user_id", userId)
        .single();
      const savedKey = data?.api_keys?.[provider];
      resolvedKey = savedKey ? decryptSecret(savedKey) : "";
    }
    if (!resolvedKey) {
      resolvedKey = getEnvProviderKey(provider);
    }

    try {
      const result = await testProviderConnection(provider, resolvedKey, model);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: err.name === "TimeoutError" ? "连接超时 (30s)" : err.message,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
