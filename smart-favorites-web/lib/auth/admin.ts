import "server-only";

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";

function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function isAdminRequest(request?: NextRequest) {
  const { user, userId } = await getAuthUser(request);
  if (!userId || !user || !("app_metadata" in user)) {
    return false;
  }

  if (user.app_metadata?.role === "admin") {
    return true;
  }

  const email = "email" in user ? user.email?.toLowerCase() : "";
  return Boolean(email && adminEmails().has(email));
}

export async function requireAdminUser(request?: NextRequest) {
  const allowed = await isAdminRequest(request);
  if (!allowed) {
    throw new Error("Admin access required");
  }
}

export async function requireAdminPage() {
  const allowed = await isAdminRequest();
  if (!allowed) {
    redirect("/admin/access-denied");
  }
}

export function adminErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Admin access required";
  const status = message === "Admin access required" ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}
