import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveBearerUser(token: string) {
  const supabase = createAdminClient();
  const { data: authData } = await supabase.auth.getUser(token);
  if (authData.user) {
    return {
      userId: authData.user.id,
      user: authData.user,
    };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("extension_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.user_id) {
    return {
      userId: data.user_id as string,
      user: { id: data.user_id, auth_type: "extension_token" },
    };
  }

  return null;
}

export async function getAuthUser(request?: NextRequest) {
  try {
    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const bearerUser = await resolveBearerUser(token);
        if (bearerUser) {
          return bearerUser;
        }
      }
    }

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No authenticated user");
    }

    return {
      userId: user.id,
      user: user,
    };
  } catch (error) {
    console.error("getAuthUser error:", error);
    throw error;
  }
}
