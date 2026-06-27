import "server-only";

import { totalEntryChars } from "@/lib/agent/memory/memory-store";

export type MemoryKind = "memory" | "profile";

export type MemoryMutationResult = {
  entries: string[];
  changed: boolean;
  reason?: string;
};

export function addMemoryEntry(
  entries: string[],
  text: string,
  charLimit: number
): MemoryMutationResult {
  const normalized = text.trim();
  if (!normalized) {
    return { entries, changed: false, reason: "empty_entry" };
  }

  const duplicate = entries.some(
    (entry) => entry.toLowerCase() === normalized.toLowerCase()
  );
  if (duplicate) {
    return { entries, changed: false, reason: "duplicate_entry" };
  }

  const next = [...entries, normalized];
  if (totalEntryChars(next) > charLimit) {
    return { entries, changed: false, reason: "char_limit_exceeded" };
  }

  return { entries: next, changed: true };
}

export function replaceMemoryEntry(
  entries: string[],
  substring: string,
  replacement: string,
  charLimit: number
): MemoryMutationResult {
  const needle = substring.trim();
  const nextText = replacement.trim();
  if (!needle || !nextText) {
    return { entries, changed: false, reason: "empty_match_or_replacement" };
  }

  let changed = false;
  const next = entries.map((entry) => {
    if (entry.includes(needle)) {
      changed = true;
      return entry.replace(needle, nextText);
    }
    return entry;
  });

  if (!changed) {
    return { entries, changed: false, reason: "substring_not_found" };
  }

  if (totalEntryChars(next) > charLimit) {
    return { entries, changed: false, reason: "char_limit_exceeded" };
  }

  return { entries: next, changed: true };
}

export function removeMemoryEntry(entries: string[], substring: string): MemoryMutationResult {
  const needle = substring.trim().toLowerCase();
  if (!needle) {
    return { entries, changed: false, reason: "empty_match" };
  }

  const next = entries.filter((entry) => !entry.toLowerCase().includes(needle));
  if (next.length === entries.length) {
    return { entries, changed: false, reason: "substring_not_found" };
  }

  return { entries: next, changed: true };
}

export function approvePendingEntries(
  pendingEntries: string[],
  memoryEntries: string[],
  approvals: string[],
  charLimit: number
): {
  pending_entries: string[];
  memory_entries: string[];
  approved: string[];
} {
  const approvedSet = new Set(approvals.map((item) => item.trim()).filter(Boolean));
  const approved: string[] = [];
  let nextMemory = [...memoryEntries];
  const nextPending: string[] = [];

  for (const entry of pendingEntries) {
    if (approvedSet.has(entry)) {
      const result = addMemoryEntry(nextMemory, entry, charLimit);
      if (result.changed) {
        nextMemory = result.entries;
        approved.push(entry);
      }
      continue;
    }
    nextPending.push(entry);
  }

  return {
    pending_entries: nextPending,
    memory_entries: nextMemory,
    approved,
  };
}

export function rejectPendingEntries(
  pendingEntries: string[],
  rejections: string[]
): { pending_entries: string[]; rejected: string[] } {
  const rejectSet = new Set(rejections.map((item) => item.trim()).filter(Boolean));
  const rejected = pendingEntries.filter((entry) => rejectSet.has(entry));
  return {
    pending_entries: pendingEntries.filter((entry) => !rejectSet.has(entry)),
    rejected,
  };
}
