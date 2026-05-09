import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.split(".")[1] ||
    "your-secret-key"
);

export async function getAuthUser(request?: NextRequest) {
  try {
    // Try to get from Supabase auth if request is provided
    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const { payload } = await jwtVerify(token, secret);
          return {
            userId: payload.sub as string,
            user: payload,
          };
        } catch (e) {
          // Token verification failed, continue to try other methods
        }
      }
    }

    // Fallback: import Supabase and try to get session
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
