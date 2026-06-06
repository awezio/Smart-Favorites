import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/admin";
import { PROVIDER_DEFINITIONS } from "@/lib/ai/provider-registry";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function loadMetrics() {
  try {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("ai_call_logs")
      .select("id, provider, model, status, error_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return null;
    const rows = data || [];
    const recentErrors = rows.filter((row) => row.status === "error");
    return {
      summary: {
        total: rows.length,
        errors: recentErrors.length,
        errorRate:
          rows.length > 0 ? `${Math.round((recentErrors.length / rows.length) * 100)}%` : "0%",
      },
      recentErrors,
    };
  } catch {
    return null;
  }
}

export default async function AdminAIPage() {
  try {
    await requireAdminUser();
  } catch {
    redirect("/dashboard");
  }
  const metrics = await loadMetrics();
  const recentErrors = metrics?.recentErrors || [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Admin</h1>
        <p className="mt-1 text-muted-foreground">
          Hidden global provider controls and runtime health for Smart Favorites.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Providers</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {PROVIDER_DEFINITIONS.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {metrics?.summary?.total || 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Error Rate</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {metrics?.summary?.errorRate || "0%"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Registry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {PROVIDER_DEFINITIONS.map((provider) => (
            <div key={provider.id} className="rounded border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-xs text-muted-foreground">{provider.id}</div>
                </div>
                <Badge variant="secondary">{provider.protocol}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Default: {provider.defaultModel}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Failures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent errors.</p>
          ) : (
            recentErrors.map((item: any) => (
              <div key={item.id} className="rounded border p-3 text-sm">
                <div className="font-medium">
                  {item.provider} / {item.model || "default"}
                </div>
                <div className="text-muted-foreground">{item.error_message}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
