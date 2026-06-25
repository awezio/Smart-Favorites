import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { countCitationCoverage } from "@/lib/chat/session-sources-db";
import type { ChatMessage } from "@/types";

export async function loadChatQualityMetrics() {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: sessions }, sourceCountResult] = await Promise.all([
    supabase
      .from("chat_sessions")
      .select("id, title_status, messages, title_generated_at, updated_at")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("chat_session_sources")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
  ]);

  const sourceRows = sourceCountResult.error ? 0 : sourceCountResult.count || 0;

  const rows = sessions || [];
  const titleStatus = {
    pending: 0,
    generating: 0,
    ready: 0,
    failed: 0,
  };

  let aiTitles = 0;
  let citationTotals = { assistantWithSources: 0, assistantWithCitations: 0 };

  for (const session of rows) {
    const status = session.title_status || "ready";
    if (status in titleStatus) {
      titleStatus[status as keyof typeof titleStatus] += 1;
    }
    if (session.title_generated_at) {
      aiTitles += 1;
    }

    const messages = normalizeMessages(session.messages);
    const coverage = countCitationCoverage(messages);
    citationTotals.assistantWithSources += coverage.assistantWithSources;
    citationTotals.assistantWithCitations += coverage.assistantWithCitations;
  }

  const titleSuccessRate =
    rows.length > 0 ? `${Math.round((aiTitles / rows.length) * 100)}%` : "0%";
  const citationCoverageRate =
    citationTotals.assistantWithSources > 0
      ? `${Math.round(
          (citationTotals.assistantWithCitations / citationTotals.assistantWithSources) * 100
        )}%`
      : "0%";

  return {
    windowDays: 7,
    sessionsAnalyzed: rows.length,
    titleStatus,
    titleSuccessRate,
    sourceRows,
    citationCoverageRate,
    citationTotals,
  };
}

function normalizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message === "object")
    .map((message) => {
      const item = message as Partial<ChatMessage>;
      return {
        role: item.role === "assistant" ? "assistant" : "user",
        content: typeof item.content === "string" ? item.content : "",
        sources: Array.isArray(item.sources) ? item.sources : undefined,
        citations: Array.isArray(item.citations) ? item.citations : undefined,
        routing: item.routing,
        timestamp: typeof item.timestamp === "string" ? item.timestamp : "",
      };
    });
}
