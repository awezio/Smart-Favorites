import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getAuthUser(
  request?: NextRequest
): Promise<{ userId: string | null; user: any | null }> {
  // 1. Check CRON_SECRET
  if (request && process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      return { userId: "cron", user: null };
    }
  }

  // 2. Extension token — check Authorization or X-Extension-Token header
  if (request) {
    let token: string | null = null;

    const xExtToken = request.headers.get("x-extension-token");
    if (xExtToken) {
      token = xExtToken;
    } else {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (token) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("user_settings")
        .select("user_id")
        .eq("extension_token", token)
        .single();

      if (!error && data) {
        const { data: userData } = await admin.auth.admin.getUserById(
          data.user_id
        );
        return {
          userId: data.user_id,
          user: userData?.user ?? null,
        };
      }
    }
  }

  // 3. Cookie-based session auth
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return { userId: user.id, user };
  }

  return { userId: null, user: null };
}
