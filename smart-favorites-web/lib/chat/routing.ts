export type ChatRouteMode = "chat" | "knowledge";

export type ChatSearchScope = "all" | "stars" | "bookmarks" | "documents";

export type ChatRoutingMetadata = {
  mode: ChatRouteMode;
  useKnowledge: boolean;
  reason: string;
  scope: ChatSearchScope;
  agentMode?: boolean;
  pipeline?: string;
  evidenceLevel?: "verified" | "suggested" | "inferred";
};

export type ChatKnowledgeMode = "auto" | "always" | "never";

const KNOWLEDGE_TRIGGERS = [
  "帮我找",
  "帮我寻找",
  "寻找",
  "搜索",
  "查找",
  "查询",
  "检索",
  "知识库",
  "书签",
  "收藏夹",
  "收藏",
  "github stars",
  "github star",
  "stars",
  "文档",
  "资料",
  "在我的",
  "从我的",
  "related bookmarks",
  "search my",
  "find my",
  "knowledge base",
  "bookmarks",
  "documents",
];

const DIRECT_CHAT_SHORT_PHRASES = [
  "你好",
  "您好",
  "hello",
  "hi",
  "hey",
  "在吗",
  "你是谁",
  "你能做什么",
  "你可以做什么",
  "介绍一下",
];

const STARS_SCOPE_TRIGGERS = [
  "github stars",
  "github star",
  "stars",
  "starred",
  "星标",
  "在 stars",
  "我的 stars",
  "stars 里",
  "stars里",
  "stars 里面",
  "stars里面",
];

const BOOKMARK_SCOPE_TRIGGERS = [
  "书签",
  "bookmark",
  "bookmarks",
  "收藏夹",
  "收藏",
];

const DOCUMENT_SCOPE_TRIGGERS = [
  "文档",
  "document",
  "documents",
  "资料",
];

function detectSearchScope(normalized: string): ChatSearchScope {
  if (STARS_SCOPE_TRIGGERS.some((trigger) => normalized.includes(trigger.toLowerCase()))) {
    return "stars";
  }

  if (BOOKMARK_SCOPE_TRIGGERS.some((trigger) => normalized.includes(trigger.toLowerCase()))) {
    return "bookmarks";
  }

  if (DOCUMENT_SCOPE_TRIGGERS.some((trigger) => normalized.includes(trigger.toLowerCase()))) {
    return "documents";
  }

  return "all";
}

function withScope(metadata: Omit<ChatRoutingMetadata, "scope">, query: string): ChatRoutingMetadata {
  return {
    ...metadata,
    scope: detectSearchScope(query.trim().toLowerCase()),
  };
}

export function classifyChatRoute(
  query: string,
  mode: ChatKnowledgeMode = "auto"
): ChatRoutingMetadata {
  const normalized = query.trim().toLowerCase();

  if (mode === "always") {
    return withScope(
      {
        mode: "knowledge",
        useKnowledge: true,
        reason: "user_forced_knowledge",
      },
      query
    );
  }

  if (mode === "never") {
    return withScope(
      {
        mode: "chat",
        useKnowledge: false,
        reason: "user_disabled_knowledge",
      },
      query
    );
  }

  if (!normalized) {
    return withScope(
      {
        mode: "chat",
        useKnowledge: false,
        reason: "empty_query",
      },
      query
    );
  }

  if (
    query.trim().length <= 12 &&
    DIRECT_CHAT_SHORT_PHRASES.some((phrase) => normalized.includes(phrase))
  ) {
    return withScope(
      {
        mode: "chat",
        useKnowledge: false,
        reason: "ordinary chat short greeting",
      },
      query
    );
  }

  if (KNOWLEDGE_TRIGGERS.some((trigger) => normalized.includes(trigger.toLowerCase()))) {
    return withScope(
      {
        mode: "knowledge",
        useKnowledge: true,
        reason: "knowledge_search_trigger",
      },
      query
    );
  }

  return withScope(
    {
      mode: "chat",
      useKnowledge: false,
      reason: "ordinary chat",
    },
    query
  );
}
