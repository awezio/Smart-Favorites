import { NextResponse } from "next/server";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const OAUTH_PROVIDERS = new Set(["github", "google"]);

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return url.origin;
}

function loginRedirect(request: Request, message: string) {
  const loginUrl = new URL("/login", getRequestOrigin(request));
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!OAUTH_PROVIDERS.has(provider)) {
    return loginRedirect(request, "不支持的登录提供商");
  }

  const requestUrl = new URL(request.url);
  const redirect = getSafeRedirect(requestUrl.searchParams.get("redirect"));
  const origin = getRequestOrigin(request);
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("redirect", redirect);

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return loginRedirect(request, "Supabase 登录环境变量未配置");
  }

  let data: { url: string | null } | null = null;
  let error: { message?: string } | null = null;

  try {
    const supabase = await createClient();
    const result = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: provider === "github" ? "read:user user:email" : undefined,
      },
    });
    data = result.data;
    error = result.error;
  } catch (err: any) {
    return loginRedirect(request, err.message || `${provider} 登录初始化失败`);
  }

  if (error) {
    const message = error.message || `${provider} 登录失败`;
    return loginRedirect(request, message);
  }

  if (!data?.url) {
    return loginRedirect(request, `${provider} 登录未返回跳转地址`);
  }

  return NextResponse.redirect(data.url);
}
