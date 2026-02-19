"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  Paperclip,
  ChevronDown,
  Bot,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { EmptyState } from "@/components/empty-state";
import type { ChatSession, ChatMessage, SearchResult, LLMProvider } from "@/types";
import {
  CHAT_PROVIDER_OPTIONS,
  supportsWebSearch,
  supportsVision,
} from "@/lib/chat-models";

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Model selection: provider + optional model id (same provider can have multiple models)
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | "">("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Feature toggles; 联网/附件 only effective when model supports (buttons disabled otherwise)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const canWebSearch = supportsWebSearch(selectedProvider, selectedModelId || undefined);
  const canVision = supportsVision(selectedProvider, selectedModelId || undefined);

  /* ── Load sessions + auto-init ── */
  const loadSessions = useCallback(async (): Promise<ChatSession[]> => {
    try {
      const response = await fetch("/api/chat/sessions");
      if (response.ok) {
        const data = await response.json();
        const list = data.sessions || [];
        setSessions(list);
        return list;
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
    return [];
  }, []);

  const createNewSession = useCallback(async (): Promise<ChatSession | null> => {
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `对话 ${new Date().toLocaleString("zh-CN")}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const session = data.session;
        setCurrentSession(session);
        setMessages([]);
        await loadSessions();
        return session;
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error("创建会话失败");
    }
    return null;
  }, [loadSessions]);

  useEffect(() => {
    async function init() {
      setInitializing(true);
      const list = await loadSessions();

      if (list.length === 0) {
        // New user: auto-create first session
        await createNewSession();
      } else {
        // Returning user: resume latest session
        const latest = list[0]; // already sorted by updated_at DESC
        setCurrentSession(latest);
        setMessages(latest.messages || []);
      }
      setInitializing(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Actions ── */
  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
      const list = await loadSessions();
      if (currentSession?.id === sessionId) {
        if (list.length > 0) {
          setCurrentSession(list[0]);
          setMessages(list[0].messages || []);
        } else {
          await createNewSession();
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSession) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const body: any = {
        query: input,
        sessionId: currentSession.id,
        chatHistory: messages,
      };
      if (selectedProvider) {
        body.provider = selectedProvider;
        if (selectedModelId) body.model = selectedModelId;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          timestamp: new Date().toISOString(),
        };

        const newMessages = [...updatedMessages, assistantMessage];
        setMessages(newMessages);

        // Persist
        await fetch(`/api/chat/sessions/${currentSession.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
        });
      } else {
        const err = await response.json().catch(() => null);
        toast.error(err?.error || "获取回答失败，请检查AI配置");
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    await createNewSession();
  };

  /* ── Loading state ── */
  if (initializing) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">加载对话...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Sessions Sidebar */}
      <aside className="w-56 shrink-0 space-y-2 hidden md:flex md:flex-col">
        <Button onClick={handleNewChat} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          新对话
        </Button>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                currentSession?.id === session.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent"
              }`}
              onClick={() => {
                setCurrentSession(session);
                setMessages(session.messages || []);
              }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="text-sm truncate">{session.title}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!currentSession ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="选择或创建一个对话"
              description="从左侧选择已有的对话，或创建一个新对话开始"
              action={
                <Button onClick={handleNewChat}>
                  <Plus className="h-4 w-4 mr-2" />
                  新对话
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <EmptyState
                    icon={Bot}
                    title="智能收藏助手"
                    description="问我关于你的书签和 GitHub Stars 的任何问题，我会通过 AI 语义搜索帮你找到答案。"
                  />
                </div>
              )}
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <Card className="max-w-[80%]">
                    <CardContent className="pt-4">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area with toolbar */}
            <div className="space-y-2">
              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Model selector: provider + model */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 min-w-[120px]"
                    onClick={() => setShowModelMenu(!showModelMenu)}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {selectedProvider ? (
                      (() => {
                        const po = CHAT_PROVIDER_OPTIONS.find((p) => p.id === selectedProvider);
                        const mo = selectedModelId
                          ? po?.models.find((m) => m.id === selectedModelId)
                          : po?.models[0];
                        return mo ? `${po?.name} · ${mo.label}` : po?.name ?? selectedProvider;
                      })()
                    ) : (
                      "默认模型"
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  {showModelMenu && (
                    <div className="absolute bottom-full left-0 mb-1 w-56 max-h-80 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md z-50">
                      <button
                        className={`w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-accent ${
                          !selectedProvider ? "bg-accent font-medium" : ""
                        }`}
                        onClick={() => {
                          setSelectedProvider("");
                          setSelectedModelId("");
                          setShowModelMenu(false);
                        }}
                      >
                        默认 (自动选择)
                      </button>
                      {CHAT_PROVIDER_OPTIONS.map((po) => (
                        <div key={po.id} className="mt-1">
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                            {po.name}
                          </div>
                          {po.models.map((m) => {
                            const isActive =
                              selectedProvider === po.id &&
                              (selectedModelId ? selectedModelId === m.id : m.id === po.models[0]?.id);
                            return (
                              <button
                                key={m.id}
                                className={`w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-accent ${
                                  isActive ? "bg-accent font-medium" : ""
                                }`}
                                onClick={() => {
                                  setSelectedProvider(po.id);
                                  setSelectedModelId(m.id);
                                  setShowModelMenu(false);
                                }}
                              >
                                {m.label}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Web search: enabled only when model supports, no toast when toggling */}
                <Button
                  variant={webSearchEnabled ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  disabled={!supportsWebSearch(selectedProvider, selectedModelId || undefined)}
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  title={
                    supportsWebSearch(selectedProvider, selectedModelId || undefined)
                      ? "联网搜索"
                      : "当前模型不支持联网"
                  }
                >
                  <Globe className="h-3.5 w-3.5" />
                  联网
                </Button>

                {/* Attachment: disabled when model does not support vision, no toast when disabled */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  disabled={!supportsVision(selectedProvider, selectedModelId || undefined)}
                  onClick={() => {
                    if (supportsVision(selectedProvider, selectedModelId || undefined)) {
                      toast.info("附件上传即将推出");
                    }
                  }}
                  title={
                    supportsVision(selectedProvider, selectedModelId || undefined)
                      ? "上传附件 (多模态)"
                      : "当前模型不支持附件"
                  }
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  附件
                </Button>
              </div>

              {/* Input row */}
              <div className="flex gap-2">
                <Input
                  placeholder="输入问题... 例如：帮我找跟 AI 相关的书签"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSend()
                  }
                  disabled={loading}
                  className="text-base"
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
          </>
        )}
      </div>
    </div>
  );
}

/* ── Message bubble with markdown ── */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "" : "w-full max-w-[85%]"}`}>
        <Card
          className={`${isUser ? "bg-primary text-primary-foreground" : ""}`}
        >
          <CardContent className="pt-4">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}

            {message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/30 space-y-1.5">
                <p className="text-xs font-semibold opacity-60">引用来源：</p>
                <div className="flex flex-wrap gap-1.5">
                  {message.sources.map(
                    (source: SearchResult, idx: number) => (
                      <a
                        key={idx}
                        href={source.bookmark?.url || source.star?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {source.bookmark?.title ||
                            `${source.star?.owner}/${source.star?.repo}`}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {Math.round((source.similarity || 0) * 100)}%
                        </Badge>
                      </a>
                    )
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
