export type ChatRouteMode = "chat" | "knowledge";

export type ChatRoutingMetadata = {
  mode: ChatRouteMode;
  useKnowledge: boolean;
  reason: string;
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

export function classifyChatRoute(
  query: string,
  mode: ChatKnowledgeMode = "auto"
): ChatRoutingMetadata {
  const normalized = query.trim().toLowerCase();

  if (mode === "always") {
    return {
      mode: "knowledge",
      useKnowledge: true,
      reason: "user_forced_knowledge",
    };
  }

  if (mode === "never") {
    return {
      mode: "chat",
      useKnowledge: false,
      reason: "user_disabled_knowledge",
    };
  }

  if (!normalized) {
    return {
      mode: "chat",
      useKnowledge: false,
      reason: "empty_query",
    };
  }

  if (
    query.trim().length <= 12 &&
    DIRECT_CHAT_SHORT_PHRASES.some((phrase) => normalized.includes(phrase))
  ) {
    return {
      mode: "chat",
      useKnowledge: false,
      reason: "ordinary chat short greeting",
    };
  }

  if (KNOWLEDGE_TRIGGERS.some((trigger) => normalized.includes(trigger.toLowerCase()))) {
    return {
      mode: "knowledge",
      useKnowledge: true,
      reason: "knowledge_search_trigger",
    };
  }

  return {
    mode: "chat",
    useKnowledge: false,
    reason: "ordinary chat",
  };
}
