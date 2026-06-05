import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getRedirectOrigin(request: Request, origin: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return origin;
}

/**
 * Auth callback handler for OAuth providers and email confirmation.
 * Exchanges the auth code for a session and redirects.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error_description") || searchParams.get("error");
  const redirect = getSafeRedirect(
    searchParams.get("redirect") || searchParams.get("next")
  );
  const redirectOrigin = getRedirectOrigin(request, origin);

  if (error) {
    const loginUrl = new URL("/login", redirectOrigin);
    loginUrl.searchParams.set("error", error);
    loginUrl.searchParams.set("redirect", redirect);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Cookie setting may fail in edge cases
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${redirectOrigin}${redirect}`);
    }
  }

  // If there's an error or no code, redirect to login
  const loginUrl = new URL("/login", redirectOrigin);
  loginUrl.searchParams.set("error", "登录回调失败，请重试");
  loginUrl.searchParams.set("redirect", redirect);
  return NextResponse.redirect(loginUrl);
}
