import { createAdminClient } from "@/lib/supabase/admin";
import { createBookmark } from "@/lib/db/bookmarks";
import { getDocumentById, getDocuments, updateDocument } from "@/lib/db/documents";
import { generateEmbedding } from "@/lib/rag/embedding";
import { searchAll } from "@/lib/rag/search";
import { fetchStarReadme, runStarsSearchPipeline } from "@/lib/agent/pipelines/stars-search";
import {
  addMemoryEntry,
  removeMemoryEntry,
  replaceMemoryEntry,
} from "@/lib/agent/memory/memory-tool";
import {
  getUserAgentMemory,
  saveUserAgentMemory,
} from "@/lib/agent/memory/memory-store";
import { searchUserSessions } from "@/lib/agent/memory/session-search";
import { webSearch } from "@/lib/search/web-search";
import type {
  ApiKeyRecord,
  DocumentRecord,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
} from "@/types";
import type { ToolRegistration } from "./types";

function getSupabaseAdmin() {
  return createAdminClient();
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeDocumentMetadata(metadata: unknown) {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function matchesQuery(document: DocumentRecord, query: string) {
  const haystack = [
    document.title,
    document.file_name,
    document.file_type,
    JSON.stringify(document.metadata || {}),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

async function listDocumentRows(
  userId: string,
  options: { limit: number; offset: number; status?: string; fileType?: string }
) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (options.status) {
    query = query.eq("status", options.status);
  }

  if (options.fileType) {
    query = query.eq("file_type", options.fileType);
  }

  const { data, error } = await query.range(
    options.offset,
    options.offset + options.limit - 1
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as DocumentRecord[];
}

async function searchDocuments(userId: string, query: string, limit: number) {
  const documents = await getDocuments(Math.max(limit * 3, 30), 0, userId);
  return documents.filter((document) => matchesQuery(document, query)).slice(0, limit);
}

const registry: ToolRegistration[] = [
  {
    name: "search_knowledge",
    description: "搜索个人知识库中的书签、星标和文档标题",
    category: "search",
    permissions: ["knowledge:read"],
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
        top_k: { type: "integer", minimum: 1, maximum: 20, default: 10 },
        threshold: { type: "number", minimum: 0, maximum: 1, default: 0.3 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    output_schema: {
      type: "object",
      properties: {
        results: { type: "array" },
        count: { type: "integer" },
      },
    },
    execute: async (input, context) => {
      const query = toString((input as Record<string, unknown>)?.query).trim();
      if (!query) {
        throw new Error("query is required");
      }

      const topK = Math.min(20, Math.max(1, toNumber((input as Record<string, unknown>)?.top_k, 10)));
      const threshold = Math.min(1, Math.max(0, toNumber((input as Record<string, unknown>)?.threshold, 0.3)));

      const [semanticResults, documentMatches] = await Promise.all([
        searchAll(query, topK, threshold, context.userId),
        searchDocuments(context.userId, query, topK),
      ]);

      return {
        output: {
          results: [
            ...semanticResults,
            ...documentMatches.map((document) => ({
              type: "document",
              id: document.id,
              similarity: 0.5,
              document: {
                id: document.id,
                user_id: document.user_id,
                title: document.title,
                file_name: document.file_name,
                file_type: document.file_type,
                file_size: document.file_size,
                status: document.status,
                metadata: document.metadata,
                storage_path: document.storage_path,
                processing_error: document.processing_error,
                created_at: document.created_at,
                updated_at: document.updated_at,
              },
            })),
          ].slice(0, topK),
          query,
          count: Math.min(topK, semanticResults.length + documentMatches.length),
        },
        metadata: { query, top_k: topK, threshold },
      };
    },
  },
  {
    name: "get_document",
    description: "获取文档元数据与处理状态",
    category: "documents",
    permissions: ["documents:read"],
    input_schema: {
      type: "object",
      properties: {
        document_id: { type: "string" },
      },
      required: ["document_id"],
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (input, context) => {
      const documentId = toString((input as Record<string, unknown>)?.document_id).trim();
      if (!documentId) {
        throw new Error("document_id is required");
      }

      const document = await getDocumentById(documentId, context.userId);
      if (!document) {
        throw new Error("Document not found");
      }

      return {
        output: {
          document: {
            ...document,
            content: document.metadata?.content_preview || null,
          },
        },
        metadata: { document_id: documentId },
      };
    },
  },
  {
    name: "create_bookmark",
    description: "创建一个新的书签记录",
    category: "bookmarks",
    permissions: ["bookmarks:write"],
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["url", "title"],
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (input, context) => {
      const payload = input as Record<string, unknown>;
      const url = toString(payload?.url).trim();
      const title = toString(payload?.title).trim();
      if (!url || !title) {
        throw new Error("url and title are required");
      }

      const tags = toStringArray(payload?.tags);
      const description = toString(payload?.description).trim() || undefined;
      const embedding = await generateEmbedding(`${title} ${description || ""} ${url}`, {
        userId: context.userId,
      });

      const bookmark = await createBookmark({
        user_id: context.userId,
        title,
        url,
        description,
        tags,
        folder_path: tags.length ? tags.join("/") : undefined,
        embedding,
        updated_at: new Date().toISOString(),
      });

      return {
        output: { bookmark },
        metadata: { tags, embedding_dimensions: embedding.length },
      };
    },
  },
  {
    name: "list_documents",
    description: "列出当前用户的文档",
    category: "documents",
    permissions: ["documents:read"],
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string" },
        file_type: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        offset: { type: "integer", minimum: 0, default: 0 },
      },
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (input, context) => {
      const payload = input as Record<string, unknown>;
      const documents = await listDocumentRows(context.userId, {
        status: toString(payload?.status).trim() || undefined,
        fileType: toString(payload?.file_type).trim() || undefined,
        limit: Math.min(100, Math.max(1, toNumber(payload?.limit, 20))),
        offset: Math.max(0, toNumber(payload?.offset, 0)),
      });

      return {
        output: {
          documents,
          count: documents.length,
        },
        metadata: { count: documents.length },
      };
    },
  },
  {
    name: "query_semantic",
    description: "对书签、星标和文档标题执行统一语义查询",
    category: "search",
    permissions: ["knowledge:read"],
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        scope: {
          type: "string",
          enum: ["all", "bookmarks", "stars", "documents"],
          default: "all",
        },
        top_k: { type: "integer", minimum: 1, maximum: 20, default: 10 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (input, context) => {
      const payload = input as Record<string, unknown>;
      const query = toString(payload?.query).trim();
      if (!query) {
        throw new Error("query is required");
      }

      const scope = toString(payload?.scope, "all") as "all" | "bookmarks" | "stars" | "documents";
      const topK = Math.min(20, Math.max(1, toNumber(payload?.top_k, 10)));

      const results: unknown[] = [];

      if (scope === "all" || scope === "bookmarks" || scope === "stars") {
        const knowledgeResults = await searchAll(query, topK, 0.3, context.userId);
        results.push(...knowledgeResults);
      }

      if (scope === "all" || scope === "documents") {
        const documents = await searchDocuments(context.userId, query, topK);
        results.push(
          ...documents.map((document) => ({
            type: "document",
            id: document.id,
            similarity: 0.5,
            document,
          }))
        );
      }

      return {
        output: {
          results: results.slice(0, topK),
          query,
          scope,
          count: Math.min(results.length, topK),
        },
        metadata: { query, scope, top_k: topK },
      };
    },
  },
  {
    name: "get_statistics",
    description: "获取知识库和工具使用统计信息",
    category: "analytics",
    permissions: ["stats:read"],
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (_input, context) => {
      const supabase = getSupabaseAdmin();
      const [bookmarkCount, starCount, documentCount, pendingDocumentCount, keyCount] = await Promise.all([
        supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
        supabase.from("github_stars").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", context.userId).eq("status", "pending"),
        supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      ]);

      if (bookmarkCount.error) {
        throw new Error(bookmarkCount.error.message);
      }
      if (starCount.error) {
        throw new Error(starCount.error.message);
      }
      if (documentCount.error) {
        throw new Error(documentCount.error.message);
      }
      if (pendingDocumentCount.error) {
        throw new Error(pendingDocumentCount.error.message);
      }
      if (keyCount.error) {
        throw new Error(keyCount.error.message);
      }

      return {
        output: {
          counts: {
            bookmarks: bookmarkCount.count || 0,
            stars: starCount.count || 0,
            documents: documentCount.count || 0,
            pending_documents: pendingDocumentCount.count || 0,
            api_keys: keyCount.count || 0,
          },
        },
        metadata: { generated_at: new Date().toISOString() },
      };
    },
  },
  {
    name: "add_annotation",
    description: "向文档元数据追加注释记录",
    category: "annotations",
    permissions: ["documents:write"],
    input_schema: {
      type: "object",
      properties: {
        doc_id: { type: "string" },
        text: { type: "string" },
        note: { type: "string" },
      },
      required: ["doc_id", "text"],
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (input, context) => {
      const payload = input as Record<string, unknown>;
      const documentId = toString(payload?.doc_id).trim();
      const text = toString(payload?.text).trim();
      const note = toString(payload?.note).trim();

      if (!documentId || !text) {
        throw new Error("doc_id and text are required");
      }

      const document = await getDocumentById(documentId, context.userId);
      if (!document) {
        throw new Error("Document not found");
      }

      const metadata = normalizeDocumentMetadata(document.metadata);
      const annotations = Array.isArray(metadata.annotations) ? [...metadata.annotations] : [];
      annotations.push({
        text,
        note: note || null,
        created_at: new Date().toISOString(),
      });

      const updated = await updateDocument(documentId, context.userId, {
        metadata: {
          ...metadata,
          annotations,
          last_annotation_at: new Date().toISOString(),
        },
      });

      return {
        output: { document: updated },
        metadata: { document_id: documentId, annotation_count: annotations.length },
      };
    },
  },
  {
    name: "search_stars",
    description: "在用户的 GitHub Stars 中执行 Agent 多策略检索",
    category: "search",
    permissions: ["knowledge:read"],
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词或自然语言问题" },
        top_k: { type: "integer", minimum: 1, maximum: 30, default: 12 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    output_schema: {
      type: "object",
      properties: {
        results: { type: "array" },
        pipeline: { type: "string" },
        count: { type: "integer" },
      },
    },
    execute: async (input, context) => {
      const query = toString((input as Record<string, unknown>)?.query).trim();
      if (!query) {
        throw new Error("query is required");
      }

      const pipeline = await runStarsSearchPipeline(query, context.userId);
      const topK = Math.min(30, Math.max(1, toNumber((input as Record<string, unknown>)?.top_k, 12)));

      return {
        output: {
          results: pipeline.sources.slice(0, topK),
          web_results: pipeline.webResults,
          pipeline: pipeline.pipeline,
          count: Math.min(pipeline.sources.length, topK),
        },
        metadata: { query, pipeline: pipeline.pipeline },
      };
    },
  },
  {
    name: "fetch_readme",
    description: "获取 GitHub 仓库 README 原文摘要",
    category: "search",
    permissions: ["knowledge:read"],
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
      },
      required: ["owner", "repo"],
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (input, context) => {
      const payload = input as Record<string, unknown>;
      const owner = toString(payload?.owner).trim();
      const repo = toString(payload?.repo).trim();
      if (!owner || !repo) {
        throw new Error("owner and repo are required");
      }

      const readme = await fetchStarReadme(owner, repo);
      return {
        output: {
          owner,
          repo,
          reachable: readme.reachable,
          source_url: readme.sourceUrl,
          text: readme.text.slice(0, 4000),
          error: readme.error,
        },
        metadata: { owner, repo, user_id: context.userId },
      };
    },
  },
  {
    name: "web_search",
    description: "当个人知识库不足时执行公开网页搜索兜底",
    category: "search",
    permissions: ["knowledge:read"],
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        max_results: { type: "integer", minimum: 1, maximum: 10, default: 5 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (input, context) => {
      const payload = input as Record<string, unknown>;
      const query = toString(payload?.query).trim();
      if (!query) {
        throw new Error("query is required");
      }

      const maxResults = Math.min(10, Math.max(1, toNumber(payload?.max_results, 5)));
      const response = await webSearch(query, { maxResults });

      return {
        output: {
          results: response.results,
          provider: response.provider,
          skipped_reason: response.skippedReason,
        },
        metadata: { query, user_id: context.userId },
      };
    },
  },
  {
    name: "session_search",
    description: "搜索历史聊天会话全文，不占 Agent 记忆配额",
    category: "search",
    permissions: ["knowledge:read"],
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 5 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (input, context) => {
      const query = toString((input as Record<string, unknown>)?.query).trim();
      if (!query) {
        throw new Error("query is required");
      }

      const limit = Math.min(20, Math.max(1, toNumber((input as Record<string, unknown>)?.limit, 5)));
      const hits = await searchUserSessions(context.userId, query, limit);

      return {
        output: { sessions: hits, count: hits.length },
        metadata: { query, limit },
      };
    },
  },
  {
    name: "update_agent_memory",
    description: "更新 Agent 长期记忆或用户偏好记忆",
    category: "memory",
    permissions: ["knowledge:write"],
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["add", "replace", "remove"] },
        target: { type: "string", enum: ["memory", "profile"], default: "memory" },
        text: { type: "string" },
        substring: { type: "string" },
        replacement: { type: "string" },
      },
      required: ["action"],
      additionalProperties: false,
    },
    output_schema: { type: "object" },
    execute: async (input, context) => {
      const payload = input as Record<string, unknown>;
      const action = toString(payload?.action).trim();
      const target = toString(payload?.target, "memory") === "profile" ? "profile" : "memory";
      const current = await getUserAgentMemory(context.userId);
      const entries =
        target === "profile" ? current.user_profile_entries : current.memory_entries;
      const charLimit =
        target === "profile" ? current.profile_char_limit : current.memory_char_limit;

      let result;
      switch (action) {
        case "add":
          result = addMemoryEntry(entries, toString(payload?.text), charLimit);
          break;
        case "replace":
          result = replaceMemoryEntry(
            entries,
            toString(payload?.substring),
            toString(payload?.replacement),
            charLimit
          );
          break;
        case "remove":
          result = removeMemoryEntry(entries, toString(payload?.substring));
          break;
        default:
          throw new Error("Unsupported memory action");
      }

      if (!result.changed) {
        return {
          output: { changed: false, reason: result.reason, entries },
          metadata: { action, target },
        };
      }

      const saved = await saveUserAgentMemory(context.userId, {
        ...(target === "profile"
          ? { user_profile_entries: result.entries }
          : { memory_entries: result.entries }),
      });

      return {
        output: {
          changed: true,
          entries: target === "profile" ? saved.user_profile_entries : saved.memory_entries,
        },
        metadata: { action, target },
      };
    },
  },
];

function hasRequiredPermissions(available: string[], required: string[]) {
  if (available.includes("*")) {
    return true;
  }

  return required.every((permission) => available.includes(permission));
}

export function listToolDefinitions(permissions?: string[]) {
  if (!permissions || permissions.includes("*")) {
    return registry.map(({ execute, ...tool }) => tool);
  }

  return registry
    .filter((tool) => hasRequiredPermissions(permissions, tool.permissions))
    .map(({ execute, ...tool }) => tool);
}

export function getToolDefinition(name: string) {
  const tool = registry.find((item) => item.name === name);
  if (!tool) {
    return null;
  }

  const { execute, ...definition } = tool;
  return definition;
}

export async function executeTool(
  name: string,
  input: unknown,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const tool = registry.find((item) => item.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  if (!hasRequiredPermissions(context.permissions, tool.permissions)) {
    throw new Error("Insufficient permissions for this tool");
  }

  return tool.execute(input, context);
}
