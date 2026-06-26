import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isProtectedRoute = isDashboardRoute || isAdminRoute;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set(
        "redirect",
        `${pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: Record<string, unknown>;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set(
      "redirect",
      `${pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/login" && user) {
    const redirect = getSafeRedirect(request.nextUrl.searchParams.get("redirect"));
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return response;
}
