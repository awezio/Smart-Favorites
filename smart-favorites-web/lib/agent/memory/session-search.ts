import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type SessionSearchHit = {
  sessionId: string;
  title: string;
  snippet: string;
  rank: number;
  updatedAt: string;
};

type SessionSearchClient = {
  rpc: ReturnType<typeof createAdminClient>["rpc"];
};

const SESSION_SEARCH_TRIGGERS = [
  "之前说过",
  "上次聊天",
  "历史对话",
  "以前的对话",
  "我们聊过",
  "past conversation",
  "we discussed",
  "previous chat",
  "earlier chat",
  "conversation history",
];

export function shouldSearchSessions(query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return SESSION_SEARCH_TRIGGERS.some((trigger) => normalized.includes(trigger.toLowerCase()));
}

export function extractSessionSearchQuery(query: string): string {
  const normalized = query.trim();
  const stripped = normalized
    .replace(/^(?:帮我)?(?:查(?:找|询)|搜索|找一下)\s*(?:之前|上次|历史)?(?:对话|聊天|会话)?[：:，,\s]*/i, "")
    .replace(/(?:之前说过|上次聊天|历史对话|以前的对话|我们聊过)[的是]?[：:，,\s]*/i, "")
    .trim();

  return stripped || normalized;
}

export async function searchUserSessions(
  userId: string,
  query: string,
  limit = 5,
  client?: SessionSearchClient
): Promise<SessionSearchHit[]> {
  const supabase = client || createAdminClient();
  const searchQuery = extractSessionSearchQuery(query);

  const { data, error } = await supabase.rpc("session_search", {
    query_text: searchQuery,
    filter_user_id: userId,
    match_count: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    sessionId: String(row.session_id),
    title: typeof row.title === "string" ? row.title : "Untitled session",
    snippet: typeof row.snippet === "string" ? row.snippet : "",
    rank: Number(row.rank) || 0,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  }));
}

export function formatSessionSearchBlock(hits: SessionSearchHit[]): string {
  if (hits.length === 0) {
    return "No matching past sessions.";
  }

  return hits
    .map(
      (hit, index) =>
        `${index + 1}. ${hit.title}\nSession ID: ${hit.sessionId}\nUpdated: ${hit.updatedAt}\nSnippet: ${hit.snippet}`
    )
    .join("\n\n");
}
