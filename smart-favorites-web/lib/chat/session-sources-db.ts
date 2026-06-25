import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSourceKey } from "@/lib/chat/session-sources";
import type { CitationRef, ChatMessage, SearchResult } from "@/types";

type SessionSourcesClient = SupabaseClient;

export async function syncSessionSourcesFromMessages(
  supabase: SessionSourcesClient,
  sessionId: string,
  userId: string,
  messages: ChatMessage[]
) {
  const assistantMessages = messages.filter(
    (message) => message.role === "assistant" && message.sources?.length
  );

  await supabase
    .from("chat_session_sources")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (assistantMessages.length === 0) {
    return;
  }

  const citationIndexes = new Set<number>();
  const rows: Record<string, unknown>[] = [];

  for (const message of assistantMessages) {
    const sources = message.sources || [];
    const usedIndexes = new Set(
      (message.citations || [])
        .filter((citation) => citation.usedInAnswer)
        .map((citation) => citation.index)
    );

    sources.forEach((source, index) => {
      const sourceIndex = index + 1;
      if (usedIndexes.has(sourceIndex)) {
        citationIndexes.add(sourceIndex);
      }

      rows.push({
        session_id: sessionId,
        user_id: userId,
        message_timestamp: message.timestamp,
        source_key: getSourceKey(source),
        source_index: sourceIndex,
        source_type: source.type,
        payload: source,
        similarity: source.similarity || 0,
        citation_used: usedIndexes.has(sourceIndex),
      });
    });
  }

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("chat_session_sources").insert(rows);

  if (error) {
    console.error("Failed to sync chat session sources:", error.message);
  }
}

export async function loadSessionSourcesFromDb(
  supabase: SessionSourcesClient,
  sessionId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("chat_session_sources")
    .select("source_key, source_index, source_type, payload, similarity, message_timestamp, citation_used")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("source_index", { ascending: true });

  if (error || !data?.length) {
    return null;
  }

  const merged = new Map<
    string,
    SearchResult & {
      sourceKey: string;
      sourceIndex: number;
      messageTimestamps: string[];
      citationUsed: boolean;
    }
  >();

  for (const row of data) {
    const payload = row.payload as SearchResult;
    const sourceKey = String(row.source_key);
    const existing = merged.get(sourceKey);
    const timestamp = String(row.message_timestamp || "");

    if (existing) {
      if (timestamp && !existing.messageTimestamps.includes(timestamp)) {
        existing.messageTimestamps.push(timestamp);
      }
      if (Number(row.similarity) > existing.similarity) {
        existing.similarity = Number(row.similarity);
      }
      existing.citationUsed = existing.citationUsed || Boolean(row.citation_used);
      continue;
    }

    merged.set(sourceKey, {
      ...payload,
      sourceKey,
      sourceIndex: Number(row.source_index),
      similarity: Number(row.similarity) || payload.similarity || 0,
      messageTimestamps: timestamp ? [timestamp] : [],
      citationUsed: Boolean(row.citation_used),
    });
  }

  return Array.from(merged.values()).sort((a, b) => b.similarity - a.similarity);
}

export function countCitationCoverage(messages: ChatMessage[]) {
  let assistantWithSources = 0;
  let assistantWithCitations = 0;

  for (const message of messages) {
    if (message.role !== "assistant" || !message.sources?.length) {
      continue;
    }
    assistantWithSources += 1;
    const hasInlineCitations =
      (message.citations || []).some((citation: CitationRef) => citation.usedInAnswer) ||
      /\[\d{1,2}\]/.test(message.content);
    if (hasInlineCitations) {
      assistantWithCitations += 1;
    }
  }

  return { assistantWithSources, assistantWithCitations };
}
