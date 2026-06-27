import "server-only";

import {
  addMemoryEntry,
  removeMemoryEntry,
  replaceMemoryEntry,
  type MemoryKind,
} from "@/lib/agent/memory/memory-tool";
import {
  getUserAgentMemory,
  saveUserAgentMemory,
  type UserAgentMemory,
} from "@/lib/agent/memory/memory-store";
import { updateStar } from "@/lib/db/github-stars";
import { extractLexicalSearchTerms, searchStars, type SupabaseQueryClient } from "@/lib/rag/search";

export type MemoryIntent =
  | {
      action: "add";
      target: MemoryKind;
      content: string;
    }
  | {
      action: "replace";
      target: MemoryKind;
      oldText: string;
      newText: string;
    }
  | {
      action: "remove";
      target: MemoryKind;
      substring: string;
    };

const REMEMBER_PATTERNS = [
  /(?:记住|帮我记(?:住|一下)?|记得|请记住)\s*[：:，,]?\s*(.+)$/i,
  /(?:remember(?:\s+that)?|save\s+to\s+memory)\s*[：:，,]?\s*(.+)$/i,
];

const FORGET_PATTERNS = [
  /(?:忘记|删掉记忆|移除记忆|不要再记|forget)\s*[：:，,]?\s*(.+)$/i,
];

const REPLACE_PATTERNS = [
  /(?:把|将)\s*(.+?)\s*(?:改成|改为|替换为)\s*(.+)$/i,
  /(?:replace)\s*(.+?)\s*(?:with)\s*(.+)$/i,
];

const PROFILE_HINTS = [
  "我",
  "我的",
  "偏好",
  "首选",
  "默认",
  "profile",
  "preference",
  "preferred",
];

export function detectMemoryIntent(query: string): MemoryIntent | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  for (const pattern of REPLACE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1] && match[2]) {
      return {
        action: "replace",
        target: inferMemoryTarget(trimmed),
        oldText: match[1].trim(),
        newText: match[2].trim(),
      };
    }
  }

  for (const pattern of FORGET_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return {
        action: "remove",
        target: inferMemoryTarget(trimmed),
        substring: match[1].trim(),
      };
    }
  }

  for (const pattern of REMEMBER_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return {
        action: "add",
        target: inferMemoryTarget(trimmed),
        content: match[1].trim(),
      };
    }
  }

  return null;
}

export async function processMemoryIntent(
  userId: string,
  intent: MemoryIntent,
  client?: SupabaseQueryClient
): Promise<{ applied: boolean; message: string; memory?: UserAgentMemory }> {
  const memory = await getUserAgentMemory(userId, client);
  const targetEntries =
    intent.target === "profile" ? memory.user_profile_entries : memory.memory_entries;
  const charLimit =
    intent.target === "profile" ? memory.profile_char_limit : memory.memory_char_limit;

  let nextEntries = targetEntries;
  let changed = false;
  let reason = "";

  switch (intent.action) {
    case "add": {
      if (memory.write_approval_required && intent.target === "memory") {
        const pending = addMemoryEntry(memory.pending_entries, intent.content, charLimit * 2);
        if (!pending.changed) {
          return {
            applied: false,
            message: pending.reason === "duplicate_entry"
              ? "该记忆已在待审批列表中。"
              : "无法添加待审批记忆。",
            memory,
          };
        }

        const saved = await saveUserAgentMemory(
          userId,
          { pending_entries: pending.entries },
          client
        );
        return {
          applied: true,
          message: "已提交记忆待审批，可在设置页批准写入。",
          memory: saved,
        };
      }

      const result = addMemoryEntry(targetEntries, intent.content, charLimit);
      nextEntries = result.entries;
      changed = result.changed;
      reason = result.reason || "";
      break;
    }
    case "replace": {
      const result = replaceMemoryEntry(
        targetEntries,
        intent.oldText,
        intent.newText,
        charLimit
      );
      nextEntries = result.entries;
      changed = result.changed;
      reason = result.reason || "";
      break;
    }
    case "remove": {
      const result = removeMemoryEntry(targetEntries, intent.substring);
      nextEntries = result.entries;
      changed = result.changed;
      reason = result.reason || "";
      break;
    }
    default: {
      const exhaustiveIntent: never = intent;
      throw new Error(`Unsupported memory intent: ${exhaustiveIntent}`);
    }
  }

  if (!changed) {
    return {
      applied: false,
      message:
        reason === "duplicate_entry"
          ? "这条记忆已经存在。"
          : reason === "char_limit_exceeded"
            ? "记忆容量已满，请先在设置页清理旧条目。"
            : "没有找到需要更新的记忆条目。",
      memory,
    };
  }

  const updates =
    intent.target === "profile"
      ? { user_profile_entries: nextEntries }
      : { memory_entries: nextEntries };

  const saved = await saveUserAgentMemory(userId, updates, client);

  if (intent.action === "add" && intent.target === "profile") {
    await maybeApplyPreferredStarTags(userId, intent.content, client);
  }

  return {
    applied: true,
    message:
      intent.target === "profile"
        ? "已更新用户偏好记忆。"
        : "已更新 Agent 记忆。",
    memory: saved,
  };
}

function inferMemoryTarget(query: string): MemoryKind {
  const normalized = query.toLowerCase();
  return PROFILE_HINTS.some((hint) => normalized.includes(hint.toLowerCase()))
    ? "profile"
    : "memory";
}

async function maybeApplyPreferredStarTags(
  userId: string,
  content: string,
  client?: SupabaseQueryClient
): Promise<void> {
  if (!/(首选|偏好|默认|preferred|favorite)/i.test(content)) {
    return;
  }

  const matches = await searchStars(content, 3, 0.2, userId, client);
  const top = matches.find((item) => item.type === "star" && item.star);
  if (!top?.star) {
    return;
  }

  const extraTags = extractLexicalSearchTerms(content).slice(0, 4);
  const tags = Array.from(
    new Set([...(top.star.tags || []), "preferred", ...extraTags].map((tag) => tag.toLowerCase()))
  ).slice(0, 12);

  await updateStar(top.star.id, { tags }, userId, client);
}
