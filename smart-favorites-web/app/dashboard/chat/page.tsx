"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Database,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type {
  ChatMessage,
  ChatRoutingMetadata,
  ChatSession,
  LLMProvider,
  SearchResult,
} from "@/types";
import { CHAT_PROVIDER_OPTIONS, type ChatModelOption } from "@/lib/chat-models";

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | "">("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [configuredProviders, setConfiguredProviders] = useState<LLMProvider[]>([]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [providerModels, setProviderModels] = useState<
    Partial<Record<LLMProvider, ChatModelOption[]>>
  >({});
  const [modelLoadStates, setModelLoadStates] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestedModelsRef = useRef<Set<string>>(new Set());

  const loadSessions = useCallback(async (): Promise<ChatSession[]> => {
    const response = await fetch("/api/chat/sessions");
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const list = (data.sessions || []) as ChatSession[];
    setSessions(list);
    return list;
  }, []);

  const openSession = useCallback(async (session: ChatSession) => {
    const fallbackMessages = normalizeChatMessages(session.messages);
    setCurrentSession({ ...session, messages: fallbackMessages });
    setMessages(fallbackMessages);

    try {
      const response = await fetch(`/api/chat/sessions/${session.id}`);
      if (!response.ok) {
        throw new Error("Failed to load chat session");
      }

      const data = await response.json();
      const fullSession = (data.session || session) as ChatSession;
      const hydratedSession = {
        ...fullSession,
        messages: normalizeChatMessages(fullSession.messages),
      };

      setCurrentSession(hydratedSession);
      setMessages(hydratedSession.messages);
      setSessions((current) =>
        current.map((item) => (item.id === hydratedSession.id ? hydratedSession : item))
      );
    } catch {
      toast.error("打开会话失败");
    }
  }, []);

  const createNewSession = useCallback(async (): Promise<ChatSession | null> => {
    const response = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `对话 ${new Date().toLocaleString("zh-CN")}`,
      }),
    });

    if (!response.ok) {
      toast.error("创建会话失败");
      return null;
    }

    const data = await response.json();
    const session = data.session as ChatSession;
    setCurrentSession(session);
    setMessages([]);
    await loadSessions();
    return session;
  }, [loadSessions]);

  const loadProviderModels = useCallback(async (provider: LLMProvider) => {
    if (requestedModelsRef.current.has(provider)) {
      return;
    }

    requestedModelsRef.current.add(provider);
    setModelLoadStates((current) => ({ ...current, [provider]: true }));

    try {
      const response = await fetch(`/api/settings/models?provider=${provider}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.models) && data.models.length > 0) {
        setProviderModels((current) => ({
          ...current,
          [provider]: data.models,
        }));
      } else {
        requestedModelsRef.current.delete(provider);
      }
    } catch {
      requestedModelsRef.current.delete(provider);
    } finally {
      setModelLoadStates((current) => ({ ...current, [provider]: false }));
    }
  }, []);

  const loadAiSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const savedProviderModels = data.providerModels || {};
      setProviderModels(data.providerModels || {});
      const configured = Object.entries(
        (data.providers || {}) as Record<string, { configured?: boolean }>
      )
        .filter(([, status]) => Boolean(status?.configured))
        .map(([provider]) => provider as LLMProvider);

      setConfiguredProviders(configured);

      const defaultProvider =
        typeof data.defaultProvider === "string" && configured.includes(data.defaultProvider)
          ? data.defaultProvider
          : configured[0] || "";
      setSelectedProvider(defaultProvider);
      setSelectedModelId(typeof data.defaultModel === "string" ? data.defaultModel : "");

      const missingModelProviders = configured.filter(
        (provider) => !savedProviderModels[provider]?.length
      );
      await Promise.all(missingModelProviders.map((provider) => loadProviderModels(provider)));
    } catch (error) {
      console.error("Failed to load AI settings:", error);
    }
  }, [loadProviderModels]);

  useEffect(() => {
    async function init() {
      setInitializing(true);
      await loadAiSettings();
      const list = await loadSessions();
      if (list.length > 0) {
        await openSession(list[0]);
      } else {
        await createNewSession();
      }
      setInitializing(false);
    }

    init();
  }, [createNewSession, loadAiSettings, loadSessions, openSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showModelMenu) {
      return;
    }

    configuredProviders.forEach((provider) => {
      loadProviderModels(provider);
    });
  }, [configuredProviders, loadProviderModels, showModelMenu]);

  const deleteSession = async (sessionId: string) => {
    await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
    const list = await loadSessions();
    if (currentSession?.id !== sessionId) {
      return;
    }

    if (list.length > 0) {
      await openSession(list[0]);
    } else {
      await createNewSession();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSession || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        query: userMessage.content,
        sessionId: currentSession.id,
        chatHistory: messages,
      };

      if (selectedProvider) {
        body.provider = selectedProvider;
      }
      if (selectedModelId) {
        body.model = selectedModelId;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "获取回答失败");
      }

      const sources = normalizeChatSources(data.sources);
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: normalizeAssistantAnswer(data.answer, sources),
        sources,
        routing: normalizeChatRouting(data.routing),
        timestamp: new Date().toISOString(),
      };
      const savedMessages = [...nextMessages, assistantMessage];
      setMessages(savedMessages);

      await fetch(`/api/chat/sessions/${currentSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: savedMessages }),
      });
      await loadSessions();
    } catch (error: any) {
      toast.error(error.message || "网络错误");
    } finally {
      setLoading(false);
    }
  };

  const currentModelLabel = (() => {
    if (configuredProviders.length === 0) {
      return "未配置 AI 模型";
    }

    if (!selectedProvider) {
      return "默认模型";
    }

    const providerOptions = getConfiguredProviderOptions(
      configuredProviders,
      providerModels,
      modelLoadStates
    );
    const provider = providerOptions.find((item) => item.id === selectedProvider);
    const model = selectedModelId
      ? provider?.models.find((item) => item.id === selectedModelId)
      : provider?.models[0];
    return model ? `${provider?.name} · ${model.label}` : provider?.name || selectedProvider;
  })();

  const providerOptions = getConfiguredProviderOptions(
    configuredProviders,
    providerModels,
    modelLoadStates
  );

  if (initializing) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      <aside className="hidden w-56 shrink-0 flex-col space-y-2 md:flex">
        <Button onClick={createNewSession} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          新对话
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors ${
                currentSession?.id === session.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent"
              }`}
              onClick={() => {
                openSession(session);
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="truncate text-sm">{session.title}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteSession(session.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={Bot}
                title="智能收藏助手"
                description="询问你的书签、GitHub Stars 和文档内容，系统会基于个人知识库回答。"
              />
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble key={`${message.timestamp}-${index}`} message={message} />
            ))
          )}
          {loading && (
            <Card className="max-w-[80%]">
              <CardContent className="pt-4 text-sm text-muted-foreground">
                正在生成回答...
              </CardContent>
            </Card>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowModelMenu((value) => !value)}
            >
              <Bot className="h-3.5 w-3.5" />
              {currentModelLabel}
              <ChevronDown className="h-3 w-3" />
            </Button>
            {showModelMenu && (
              <div className="absolute bottom-full left-0 z-50 mb-1 max-h-80 w-60 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
                <button
                  className={`w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent ${
                    !selectedProvider ? "bg-accent font-medium" : ""
                  }`}
                  onClick={() => {
                    setSelectedProvider("");
                    setSelectedModelId("");
                    setShowModelMenu(false);
                  }}
                >
                  默认模型
                </button>
                {providerOptions.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    暂无已配置且可用的模型，请先到设置中保存 API Key 并获取模型。
                  </div>
                )}
                {providerOptions.map((provider) => (
                  <div key={provider.id} className="mt-1">
                    <div className="flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground">
                      {provider.name}
                      {modelLoadStates[provider.id] && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                    {provider.models.map((model) => (
                      <button
                        key={model.id}
                        className="w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setSelectedProvider(provider.id);
                          setSelectedModelId(model.id);
                          setShowModelMenu(false);
                        }}
                      >
                        {model.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="输入问题，例如：帮我找 AI 相关的收藏"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getConfiguredProviderOptions(
  configuredProviders: LLMProvider[],
  providerModels: Partial<Record<LLMProvider, ChatModelOption[]>>,
  modelLoadStates: Record<string, boolean>
) {
  return CHAT_PROVIDER_OPTIONS
    .filter((provider) => configuredProviders.includes(provider.id))
    .map((provider) => ({
      ...provider,
      models: providerModels[provider.id] || [],
    }))
    .filter((provider) => provider.models.length > 0 || modelLoadStates[provider.id]);
}

function normalizeChatMessages(messages: unknown): ChatMessage[] {
  const rawMessages: unknown[] = (() => {
    if (Array.isArray(messages)) {
      return messages;
    }

    if (typeof messages === "string") {
      try {
        const parsed = JSON.parse(messages);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    if (messages && typeof messages === "object") {
      const maybeWrappedMessages = (messages as { messages?: unknown }).messages;
      return Array.isArray(maybeWrappedMessages) ? maybeWrappedMessages : [];
    }

    return [];
  })();

  return rawMessages
    .filter((message): message is Record<string, unknown> => {
      return (
        Boolean(message) &&
        typeof message === "object" &&
        (message as Record<string, unknown>).content !== undefined
      );
    })
    .map((message) => {
      const role = message.role === "assistant" ? "assistant" : "user";
      const sources = normalizeChatSources(message.sources);
      const rawContent = String(message.content ?? "");
      return {
        role,
        content: role === "assistant" ? normalizeAssistantAnswer(rawContent, sources) : rawContent,
        sources,
        routing: normalizeChatRouting(message.routing),
        timestamp: typeof message.timestamp === "string" ? message.timestamp : "",
      };
    });
}

function normalizeChatSources(sources: unknown): SearchResult[] | undefined {
  return Array.isArray(sources) ? (sources as SearchResult[]) : undefined;
}

function normalizeChatRouting(routing: unknown): ChatRoutingMetadata | undefined {
  if (!routing || typeof routing !== "object") {
    return undefined;
  }

  const item = routing as Partial<ChatRoutingMetadata>;
  const mode = item.mode === "knowledge" ? "knowledge" : "chat";
  return {
    mode,
    useKnowledge: Boolean(item.useKnowledge),
    reason: typeof item.reason === "string" ? item.reason : "",
  };
}

function normalizeAssistantAnswer(answer: unknown, sources?: SearchResult[]): string {
  const text = typeof answer === "string" ? answer.trim() : "";
  if (text.length > 0) {
    return text;
  }

  if (sources && sources.length > 0) {
    return "我找到了相关引用来源，但这次模型没有返回可显示的回答。你可以换一个模型重试，或基于下方来源继续追问。";
  }

  return "这次没有生成可显示的回答。请稍后重试，或切换到另一个已配置的模型。";
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const sources = message.sources || [];
  const routing = message.routing;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={isUser ? "max-w-[85%] md:max-w-[68%]" : "w-full max-w-4xl"}>
        <Card
          className={
            isUser
              ? "rounded-2xl border-primary bg-primary text-primary-foreground shadow-sm"
              : "rounded-2xl border-border/70 bg-card shadow-sm"
          }
        >
          <CardContent className={isUser ? "pt-4" : "space-y-4 pt-4"}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span>Smart Favorites</span>
                  {routing && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px]">
                      <Database className="h-3 w-3" />
                      {routing.useKnowledge ? "已搜索知识库" : "未搜索知识库"}
                    </span>
                  )}
                </div>
                <div className="prose prose-sm max-w-none rounded-xl bg-muted/20 px-4 py-3 dark:prose-invert">
                  <MarkdownRenderer content={normalizeAssistantAnswer(message.content, sources)} />
                </div>
              </>
            )}

            {!isUser && sources.length > 0 && (
              <details className="group rounded-xl border border-border/70 bg-muted/20 px-3 py-2" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    引用来源 · {sources.length}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="flex flex-wrap gap-1.5">
                  {sources.map((source: SearchResult, index: number) => {
                    const href = source.bookmark?.url || source.star?.url || "";
                    const title =
                      source.bookmark?.title ||
                      (source.star ? `${source.star.owner}/${source.star.repo}` : "") ||
                      source.document?.title ||
                      "Document";
                    const content = (
                      <>
                        {href && <ExternalLink className="h-3 w-3 shrink-0" />}
                        <span className="max-w-[200px] truncate">{title}</span>
                        <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                          {Math.round((source.similarity || 0) * 100)}%
                        </Badge>
                      </>
                    );

                    return href ? (
                      <a
                        key={`${source.id}-${index}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md bg-background px-2 py-1 text-xs transition-colors hover:bg-muted"
                      >
                        {content}
                      </a>
                    ) : (
                      <span
                        key={`${source.id}-${index}`}
                        className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md bg-background px-2 py-1 text-xs"
                      >
                        {content}
                      </span>
                    );
                  })}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
