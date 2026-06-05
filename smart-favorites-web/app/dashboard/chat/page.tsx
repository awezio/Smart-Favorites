"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  ExternalLink,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { ChatMessage, ChatSession, LLMProvider, SearchResult } from "@/types";
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

  useEffect(() => {
    async function init() {
      setInitializing(true);
      const list = await loadSessions();
      if (list.length > 0) {
        setCurrentSession(list[0]);
        setMessages(list[0].messages || []);
      } else {
        await createNewSession();
      }
      setInitializing(false);
    }

    init();
  }, [createNewSession, loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  useEffect(() => {
    if (!showModelMenu) {
      return;
    }

    CHAT_PROVIDER_OPTIONS.forEach((provider) => {
      loadProviderModels(provider.id);
    });
  }, [loadProviderModels, showModelMenu]);

  const deleteSession = async (sessionId: string) => {
    await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
    const list = await loadSessions();
    if (currentSession?.id !== sessionId) {
      return;
    }

    if (list.length > 0) {
      setCurrentSession(list[0]);
      setMessages(list[0].messages || []);
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

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
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
    if (!selectedProvider) {
      return "默认模型";
    }

    const providerOptions = CHAT_PROVIDER_OPTIONS.map((provider) => ({
      ...provider,
      models: providerModels[provider.id] || provider.models,
    }));
    const provider = providerOptions.find((item) => item.id === selectedProvider);
    const model = selectedModelId
      ? provider?.models.find((item) => item.id === selectedModelId)
      : provider?.models[0];
    return model ? `${provider?.name} · ${model.label}` : provider?.name || selectedProvider;
  })();

  const providerOptions = CHAT_PROVIDER_OPTIONS.map((provider) => ({
    ...provider,
    models: providerModels[provider.id] || provider.models,
  }));

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
                setCurrentSession(session);
                setMessages(session.messages || []);
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
                正在检索知识库...
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "" : "w-full"}`}>
        <Card className={isUser ? "bg-primary text-primary-foreground" : ""}>
          <CardContent className="pt-4">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}

            {message.sources && message.sources.length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-border/30 pt-3">
                <p className="text-xs font-semibold opacity-70">引用来源</p>
                <div className="flex flex-wrap gap-1.5">
                  {message.sources.map((source: SearchResult, index: number) => (
                    <a
                      key={`${source.id}-${index}`}
                      href={source.bookmark?.url || source.star?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-xs transition-colors hover:bg-muted"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="max-w-[200px] truncate">
                        {source.bookmark?.title ||
                          `${source.star?.owner}/${source.star?.repo}`}
                      </span>
                      <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                        {Math.round((source.similarity || 0) * 100)}%
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
