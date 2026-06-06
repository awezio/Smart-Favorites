import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashExtensionToken, isExtensionToken } from "@/lib/auth/extension-token";

type ExtensionTokenUser = { id: string; auth_type: "extension_token" };
type AuthUser = User | ExtensionTokenUser;

const anonymousUser = {
  userId: "",
  user: null,
};

async function resolveBearerUser(
  token: string
): Promise<{ userId: string; user: AuthUser } | null> {
  const supabase = createAdminClient();
  const { data: authData } = await supabase.auth.getUser(token);
  if (authData.user) {
    return {
      userId: authData.user.id,
      user: authData.user,
    };
  }

  if (isExtensionToken(token)) {
    const { data: session, error: sessionError } = await supabase
      .from("extension_sessions")
      .select("user_id")
      .eq("token_hash", hashExtensionToken(token))
      .is("revoked_at", null)
      .maybeSingle();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (session?.user_id) {
      await supabase
        .from("extension_sessions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("token_hash", hashExtensionToken(token));

      return {
        userId: session.user_id as string,
        user: { id: session.user_id as string, auth_type: "extension_token" },
      };
    }
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
      user: { id: data.user_id as string, auth_type: "extension_token" },
    };
  }

  return null;
}

export async function getAuthUser(
  request?: NextRequest
): Promise<{ userId: string; user: AuthUser | null }> {
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

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return anonymousUser;
    }

    return {
      userId: user.id,
      user: user,
    };
  } catch (error) {
    console.error("getAuthUser error:", error);
    return anonymousUser;
  }
}
