import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LLMProvider } from "@/types";

const PROVIDER_ENDPOINTS: Record<string, { baseURL: string; defaultModel: string; style: string }> = {
  openai: { baseURL: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", style: "openai" },
  deepseek: { baseURL: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat", style: "openai" },
  kimi: { baseURL: "https://api.moonshot.cn/v1", defaultModel: "moonshot-v1-8k", style: "openai" },
  qwen: { baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", defaultModel: "qwen-turbo", style: "openai" },
  claude: { baseURL: "https://api.anthropic.com/v1", defaultModel: "claude-3-5-sonnet-20241022", style: "anthropic" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta", defaultModel: "gemini-1.5-flash", style: "gemini" },
  glm: { baseURL: "https://open.bigmodel.cn/api/paas/v4", defaultModel: "glm-4-flash", style: "openai" },
};

const ENV_KEY_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  kimi: "KIMI_API_KEY",
  qwen: "QWEN_API_KEY",
  claude: "CLAUDE_API_KEY",
  gemini: "GEMINI_API_KEY",
  glm: "GLM_API_KEY",
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !PROVIDER_ENDPOINTS[provider]) {
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
      resolvedKey = data?.api_keys?.[provider];
    }
    if (!resolvedKey) {
      resolvedKey = process.env[ENV_KEY_MAP[provider] || ""] || "";
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
