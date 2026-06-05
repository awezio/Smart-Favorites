import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getEnvProviderKey,
  isSupportedProvider,
  PROVIDER_ENDPOINTS,
} from "@/lib/ai/provider-config";
import { decryptSecret } from "@/lib/server/secrets";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !isSupportedProvider(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Resolve API key: use provided key, or user's saved key, or env key
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

    if (!resolvedKey) {
      return NextResponse.json({
        success: false,
        error: `未找到 ${provider} 的 API Key`,
      });
    }

    const config = PROVIDER_ENDPOINTS[provider];
    const startTime = Date.now();

    try {
      if (config.style === "anthropic") {
        const res = await fetch(`${config.baseURL}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": resolvedKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: config.defaultModel,
            max_tokens: 10,
            messages: [{ role: "user", content: "Hi" }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        const latency = Date.now() - startTime;
        if (!res.ok) {
          const err = await res.text();
          return NextResponse.json({ success: false, error: `API 错误 (${res.status}): ${err.slice(0, 200)}`, latency });
        }
        return NextResponse.json({ success: true, latency, model: config.defaultModel });
      } else if (config.style === "gemini") {
        const res = await fetch(
          `${config.baseURL}/models/${config.defaultModel}:generateContent?key=${resolvedKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "Hi" }] }],
              generationConfig: { maxOutputTokens: 10 },
            }),
            signal: AbortSignal.timeout(15000),
          }
        );
        const latency = Date.now() - startTime;
        if (!res.ok) {
          const err = await res.text();
          return NextResponse.json({ success: false, error: `API 错误 (${res.status}): ${err.slice(0, 200)}`, latency });
        }
        return NextResponse.json({ success: true, latency, model: config.defaultModel });
      } else {
        // OpenAI-compatible
        const res = await fetch(`${config.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resolvedKey}`,
          },
          body: JSON.stringify({
            model: config.defaultModel,
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 10,
          }),
          signal: AbortSignal.timeout(15000),
        });
        const latency = Date.now() - startTime;
        if (!res.ok) {
          const err = await res.text();
          return NextResponse.json({ success: false, error: `API 错误 (${res.status}): ${err.slice(0, 200)}`, latency });
        }
        return NextResponse.json({ success: true, latency, model: config.defaultModel });
      }
    } catch (err: any) {
      const latency = Date.now() - startTime;
      return NextResponse.json({
        success: false,
        error: err.name === "TimeoutError" ? "连接超时 (15s)" : err.message,
        latency,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
