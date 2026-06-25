import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/admin";
import { PROVIDER_DEFINITIONS } from "@/lib/ai/provider-registry";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadChatQualityMetrics } from "@/lib/admin/chat-quality-metrics";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/dashboard/page-header";
import { SectionPanel } from "@/components/layout/section-panel";

export const dynamic = "force-dynamic";

async function loadMetrics() {
  try {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [aiResult, chatQuality] = await Promise.all([
      supabase
        .from("ai_call_logs")
        .select("id, provider, model, status, error_message, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200),
      loadChatQualityMetrics(),
    ]);
    const { data, error } = aiResult;
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
      chatQuality,
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
  const chatQuality = metrics?.chatQuality;

  return (
    <main className="page-shell page-stack">
      <PageHeader
        title="AI Admin"
        description="Hidden global provider controls and runtime health for Smart Favorites."
        eyebrow="Admin"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Providers" value={PROVIDER_DEFINITIONS.length} />
        <StatCard label="Recent Calls" value={metrics?.summary?.total || 0} />
        <StatCard label="Error Rate" value={metrics?.summary?.errorRate || "0%"} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="AI Title Success (7d)" value={chatQuality?.titleSuccessRate || "0%"} />
        <StatCard label="Citation Coverage (7d)" value={chatQuality?.citationCoverageRate || "0%"} />
        <StatCard label="Session Sources (7d)" value={chatQuality?.sourceRows || 0} />
        <StatCard label="Sessions Analyzed (7d)" value={chatQuality?.sessionsAnalyzed || 0} />
      </div>

      <SectionPanel title="Provider Registry">
        <div className="grid gap-3 md:grid-cols-2">
          {PROVIDER_DEFINITIONS.map((provider) => (
            <div key={provider.id} className="border border-border p-3">
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
        </div>
      </SectionPanel>

      <SectionPanel title="Recent Failures">
        <div className="space-y-2">
          {recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent errors.</p>
          ) : (
            recentErrors.map((item: { id: string; provider: string; model: string | null; error_message: string | null }) => (
              <div key={item.id} className="border border-border p-3 text-sm">
                <div className="font-medium">
                  {item.provider} / {item.model || "default"}
                </div>
                <div className="text-muted-foreground">{item.error_message}</div>
              </div>
            ))
          )}
        </div>
      </SectionPanel>
    </main>
  );
}
