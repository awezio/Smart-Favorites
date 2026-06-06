import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser, adminErrorResponse } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request);
    const supabase = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("ai_call_logs")
      .select("id, provider, model, status, latency_ms, error_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const rows = data || [];
    const total = rows.length;
    const errors = rows.filter((row) => row.status === "error");
    const errorRate = total > 0 ? `${Math.round((errors.length / total) * 100)}%` : "0%";

    return NextResponse.json({
      summary: {
        total,
        errors: errors.length,
        errorRate,
      },
      recentErrors: errors.slice(0, 20),
      rows,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
