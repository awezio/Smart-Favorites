"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import {
  Archive,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Database,
  ExternalLink,
  FileText,
  GitBranch,
  Loader2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { SourcesMobileSheet, SourcesPanel } from "@/components/chat/sources-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useGroupRef,
} from "@/components/layout/resizable";
import { aggregateSessionSources } from "@/lib/chat/session-sources";
import { shouldRegenerateSessionTitle } from "@/lib/chat/session-title-utils";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
  CHAT_PANEL_DEFAULTS,
  CHAT_PANELS_AUTO_SAVE_ID,
  DEFAULT_CHAT_PANEL_LAYOUT,
  normalizeChatPanelLayout,
} from "@/lib/layout/chat-panel-layout";
import { cn } from "@/lib/utils";
import { type DashboardLanguage, pickLanguage, useDashboardLanguage } from "@/lib/dashboard-language";
import type {
  ChatMessage,
  ChatRoutingMetadata,
  ChatSession,
  ChatTitleStatus,
  LLMProvider,
  SearchResult,
} from "@/types";
import { CHAT_PROVIDER_OPTIONS, type ChatModelOption } from "@/lib/chat-models";

type KnowledgeMode = "auto" | "always" | "never";

const PINNED_STORAGE_KEY = "smart-favorites:chat:pinned";
const ARCHIVED_STORAGE_KEY = "smart-favorites:chat:archived";

const knowledgeModeLabels: Record<DashboardLanguage, Record<KnowledgeMode, string>> = {
  zh: {
    auto: "自动搜索",
    always: "知识库",
    never: "跳过知识库",
  },
  en: {
    auto: "Auto search",
    always: "Knowledge",
    never: "Bypass",
  },
};

const chatCopy = {
  zh: {
    openFailed: "打开会话失败",
    createFailed: "创建会话失败",
    sessionTitle: "对话",
    renamePrompt: "重命名会话",
    renameFailed: "重命名失败",
    attachmentPrefix: "附件",
    fetchAnswerFailed: "获取回答失败",
    networkError: "网络错误",
    branchToast: "已创建分支会话",
    multimodalRequired: "当前模型未标记为多模态，不能上传附件",
    generating: "正在生成回答...",
    emptyTitle: "新会话",
    emptyDescription: "开始一次新的知识库会话。Smart Favorites 会搜索、整理并连接你保存的资源。",
    newSession: "新会话",
    searchSessions: "搜索会话...",
    archived: "已归档",
    today: "今天",
    yesterday: "昨天",
    earlier: "更早",
    active: "当前",
    archive: "归档",
    noSessions: "暂无会话",
    untitled: "未命名会话",
    sessionActions: "会话操作",
    rename: "重命名",
    pin: "置顶",
    unpin: "取消置顶",
    unarchive: "取消归档",
    delete: "删除",
    collapseSidebar: "折叠会话栏",
    expandSidebar: "展开会话栏",
    removeAttachment: "移除附件",
    uploadAttachment: "上传多模态附件",
    modelNotMultimodal: "当前模型未标记为多模态",
    defaultModel: "默认模型",
    noModels: "暂无已配置且可用的模型，请先在设置中保存 API Key 并获取模型。",
    unconfiguredModel: "未配置 AI 模型",
    placeholder: "让 Smart Favorites 搜索、整理、调试或解释...",
    run: "发送",
    smartFavorites: "Smart Favorites",
    knowledgeSearched: "已搜索知识库",
    knowledgeSkipped: "未搜索知识库",
    copy: "复制",
    copied: "已复制",
    regenerate: "重新生成",
    branch: "分支",
    sources: "引用来源",
    source: "来源",
    knowledgeBase: "语料库",
    titleGenerating: "正在生成标题...",
    titleFailed: "标题生成失败，已使用备用标题",
  },
  en: {
    openFailed: "Failed to open chat session",
    createFailed: "Failed to create chat session",
    sessionTitle: "Conversation",
    renamePrompt: "Rename session",
    renameFailed: "Rename failed",
    attachmentPrefix: "Attachments",
    fetchAnswerFailed: "Failed to get an answer",
    networkError: "Network error",
    branchToast: "Branch session created",
    multimodalRequired: "The current model is not marked as multimodal, so attachments are disabled",
    generating: "Generating answer...",
    emptyTitle: "New session",
    emptyDescription:
      "Start a fresh knowledge session. Smart Favorites is ready to search, organize, debug, and connect your saved resources.",
    newSession: "New session",
    searchSessions: "Search sessions...",
    archived: "Archived",
    today: "Today",
    yesterday: "Yesterday",
    earlier: "Earlier",
    active: "Active",
    archive: "Archive",
    noSessions: "No sessions",
    untitled: "Untitled session",
    sessionActions: "Session actions",
    rename: "Rename",
    pin: "Pin",
    unpin: "Unpin",
    unarchive: "Unarchive",
    delete: "Delete",
    collapseSidebar: "Collapse sessions",
    expandSidebar: "Expand sessions",
    removeAttachment: "Remove attachment",
    uploadAttachment: "Upload multimodal attachment",
    modelNotMultimodal: "Current model is not marked as multimodal",
    defaultModel: "Default model",
    noModels: "No configured models are available. Save an API key in Settings and refresh models first.",
    unconfiguredModel: "AI model not configured",
    placeholder: "Ask Smart Favorites to search, organize, debug, or explain...",
    run: "Send",
    smartFavorites: "Smart Favorites",
    knowledgeSearched: "Knowledge searched",
    knowledgeSkipped: "Knowledge skipped",
    copy: "Copy",
    copied: "Copied",
    regenerate: "Regenerate",
    branch: "Branch",
    sources: "Sources",
    source: "Source",
    knowledgeBase: "Knowledge Base",
    titleGenerating: "Generating title...",
    titleFailed: "Title generation failed, using a fallback label",
  },
};

export default function ChatPage() {
  const [language] = useDashboardLanguage();
  const t = chatCopy[language];
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sourcesPanelCollapsed, setSourcesPanelCollapsed] = useState(false);
  const [highlightedSourceIndex, setHighlightedSourceIndex] = useState<number | null>(null);
  const [sourcesMobileOpen, setSourcesMobileOpen] = useState(false);
  const [knowledgeMode, setKnowledgeMode] = useState<KnowledgeMode>("auto");
  const [pinnedSessionIds, setPinnedSessionIds] = useState<Set<string>>(new Set());
  const [archivedSessionIds, setArchivedSessionIds] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestedModelsRef = useRef<Set<string>>(new Set());
  const sessionsRef = useRef(sessions);
  const currentSessionRef = useRef(currentSession);
  const hasInitializedRef = useRef(false);
  const sessionSidebarInitializedRef = useRef(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const chatPanelGroupRef = useGroupRef();
  const chatPanelFallbackLayout = useMemo(
    () => normalizeChatPanelLayout(DEFAULT_CHAT_PANEL_LAYOUT),
    []
  );

  const toggleSessionSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => !collapsed);
  }, []);

  const toggleSourcesPanel = useCallback(() => {
    setSourcesPanelCollapsed((collapsed) => !collapsed);
  }, []);

  const sanitizeChatPanelLayout = useCallback(
    (layout: Record<string, number>) =>
      normalizeChatPanelLayout(layout, chatPanelFallbackLayout),
    [chatPanelFallbackLayout]
  );

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

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

  const applySessionTitleUpdate = useCallback(
    (sessionId: string, title: string, titleStatus?: ChatTitleStatus) => {
      setSessions((current) =>
        current.map((item) =>
          item.id === sessionId
            ? {
                ...item,
                title,
                title_status: titleStatus || item.title_status,
              }
            : item
        )
      );
      setCurrentSession((current) =>
        current?.id === sessionId
          ? {
              ...current,
              title,
              title_status: titleStatus || current.title_status,
            }
          : current
      );
    },
    []
  );

  const maybeGenerateSessionTitle = useCallback(
    async (
      sessionId: string,
      sessionMessages: ChatMessage[],
      options?: { force?: boolean }
    ) => {
      const userCount = sessionMessages.filter((message) => message.role === "user").length;
      const assistantCount = sessionMessages.filter(
        (message) => message.role === "assistant"
      ).length;
      if (userCount < 1 || assistantCount < 1) {
        return;
      }

      const session =
        sessionsRef.current.find((item) => item.id === sessionId) ??
        (currentSessionRef.current?.id === sessionId ? currentSessionRef.current : null);
      const firstUserContent = sessionMessages.find((message) => message.role === "user")?.content;

      if (
        session &&
        !options?.force &&
        !shouldRegenerateSessionTitle(
          session.title,
          session.title_status,
          session.metadata,
          firstUserContent
        )
      ) {
        return;
      }

      applySessionTitleUpdate(sessionId, session?.title || t.emptyTitle, "generating");

      try {
        const response = await fetch(`/api/chat/sessions/${sessionId}/generate-title`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: sessionMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            locale: language,
            force: Boolean(options?.force),
            provider: selectedProvider || undefined,
            model: selectedModelId || undefined,
          }),
        });

        if (!response.ok) {
          toast.error(t.titleFailed);
          return;
        }

        const data = await response.json();
        if (data.skipped) {
          return;
        }

        const nextTitle = typeof data.title === "string" ? data.title : "";
        if (!nextTitle) {
          toast.error(t.titleFailed);
          return;
        }

        applySessionTitleUpdate(sessionId, nextTitle, (data.title_status as ChatTitleStatus) || "ready");
      } catch {
        toast.error(t.titleFailed);
      }
    },
    [applySessionTitleUpdate, language, selectedModelId, selectedProvider, t.emptyTitle, t.titleFailed]
  );

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

      if (
        shouldRegenerateSessionTitle(
          hydratedSession.title,
          hydratedSession.title_status,
          hydratedSession.metadata,
          hydratedSession.messages.find((message) => message.role === "user")?.content
        )
      ) {
        void maybeGenerateSessionTitle(hydratedSession.id, hydratedSession.messages);
      }
    } catch {
      toast.error(t.openFailed);
    }
  }, [maybeGenerateSessionTitle, t.openFailed]);

  const createNewSession = useCallback(
    async (initialMessages: ChatMessage[] = [], title?: string): Promise<ChatSession | null> => {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || t.emptyTitle,
        }),
      });

      if (!response.ok) {
        toast.error(t.createFailed);
        return null;
      }

      const data = await response.json();
      const session = data.session as ChatSession;
      const hydratedSession = { ...session, messages: initialMessages };
      setCurrentSession(hydratedSession);
      setMessages(initialMessages);

      if (initialMessages.length > 0) {
        await fetch(`/api/chat/sessions/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: initialMessages }),
        });
      }

      await loadSessions();
      return hydratedSession;
    },
    [loadSessions, t.createFailed, t.emptyTitle]
  );

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
      setProviderModels(data.providerModels || {});
      const savedProviderModels = data.providerModels || {};
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
      void Promise.allSettled(
        missingModelProviders.map((provider) => loadProviderModels(provider))
      );
    } catch (error) {
      console.error("Failed to load AI settings:", error);
    }
  }, [loadProviderModels]);

  useEffect(() => {
    setPinnedSessionIds(readStoredSessionSet(PINNED_STORAGE_KEY));
    setArchivedSessionIds(readStoredSessionSet(ARCHIVED_STORAGE_KEY));
  }, []);

  useEffect(() => {
    if (!isLargeScreen && !sessionSidebarInitializedRef.current) {
      setSidebarCollapsed(true);
      sessionSidebarInitializedRef.current = true;
    }
  }, [isLargeScreen]);

  useEffect(() => {
    if (!isLargeScreen) {
      return;
    }

    const repairLayout = () => {
      const current = chatPanelGroupRef.current?.getLayout();
      if (!current) {
        return false;
      }

      const normalized = normalizeChatPanelLayout(current, chatPanelFallbackLayout);
      if (JSON.stringify(normalized) !== JSON.stringify(current)) {
        chatPanelGroupRef.current?.setLayout(normalized);
      }
      return true;
    };

    let frame = 0;
    let timeout = 0;

    if (!repairLayout()) {
      frame = requestAnimationFrame(repairLayout);
      timeout = window.setTimeout(repairLayout, 150);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [chatPanelFallbackLayout, chatPanelGroupRef, isLargeScreen]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    async function init() {
      setInitializing(true);
      try {
        await loadAiSettings();
        const list = await loadSessions();
        if (list.length > 0) {
          await openSession(list[0]);
        } else {
          await createNewSession();
        }
      } catch (error) {
        console.error("Failed to initialize chat page:", error);
      } finally {
        setInitializing(false);
      }
    }

    void init();
    // Intentionally run once on mount; callbacks are stable enough for initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const providerOptions = getConfiguredProviderOptions(
    configuredProviders,
    providerModels,
    modelLoadStates
  );
  const currentModelLabel = getCurrentModelLabel(
    language,
    configuredProviders,
    providerOptions,
    selectedProvider,
    selectedModelId
  );
  const supportsAttachments = isMultimodalModel(selectedProvider, selectedModelId);

  const sessionSources = useMemo(() => aggregateSessionSources(messages), [messages]);

  const visibleSessions = useMemo(() => {
    const normalizedSearch = sessionSearch.trim().toLowerCase();
    return sessions
      .filter((session) =>
        showArchived ? archivedSessionIds.has(session.id) : !archivedSessionIds.has(session.id)
      )
      .filter((session) =>
        normalizedSearch ? session.title.toLowerCase().includes(normalizedSearch) : true
      )
      .sort((a, b) => {
        const pinnedDelta =
          Number(pinnedSessionIds.has(b.id)) - Number(pinnedSessionIds.has(a.id));
        if (pinnedDelta !== 0) return pinnedDelta;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [archivedSessionIds, pinnedSessionIds, sessionSearch, sessions, showArchived]);

  const groupedSessions = useMemo(
    () => groupSessionsByDate(visibleSessions, language),
    [language, visibleSessions]
  );

  const deleteSession = async (sessionId: string) => {
    await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
    const list = await loadSessions();
    if (currentSession?.id !== sessionId) {
      return;
    }

    const next = list.find((session) => !archivedSessionIds.has(session.id));
    if (next) {
      await openSession(next);
    } else {
      await createNewSession();
    }
  };

  const renameSession = async (session: ChatSession) => {
    const title = window.prompt(t.renamePrompt, session.title)?.trim();
    if (!title || title === session.title) {
      return;
    }

    const response = await fetch(`/api/chat/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      toast.error(t.renameFailed);
      return;
    }

    await loadSessions();
    setCurrentSession((current) => (current?.id === session.id ? { ...current, title } : current));
  };

  const toggleSessionSet = (
    storageKey: string,
    sessionId: string,
    setter: (value: Set<string>) => void
  ) => {
    const current =
      storageKey === PINNED_STORAGE_KEY ? pinnedSessionIds : archivedSessionIds;
    const next = new Set(current);
    if (next.has(sessionId)) {
      next.delete(sessionId);
    } else {
      next.add(sessionId);
    }
    setter(next);
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
  };

  const archiveSession = async (session: ChatSession) => {
    toggleSessionSet(ARCHIVED_STORAGE_KEY, session.id, setArchivedSessionIds);
    if (currentSession?.id === session.id && !archivedSessionIds.has(session.id)) {
      const next = sessions.find((item) => item.id !== session.id && !archivedSessionIds.has(item.id));
      if (next) {
        await openSession(next);
      } else {
        await createNewSession();
      }
    }
  };

  const sendQuery = async (
    rawQuery: string,
    baseMessages: ChatMessage[] = messages,
    targetSession: ChatSession | null = currentSession
  ) => {
    const trimmed = rawQuery.trim();
    if (!trimmed || !targetSession || loading) {
      return;
    }

    const attachmentNote =
      attachments.length > 0
        ? `\n\n${t.attachmentPrefix}: ${attachments.map((file) => file.name).join(", ")}`
        : "";
    const userMessage: ChatMessage = {
      role: "user",
      content: `${trimmed}${attachmentNote}`,
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...baseMessages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setAttachments([]);
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        query: userMessage.content,
        sessionId: targetSession.id,
        chatHistory: baseMessages,
        knowledgeMode,
        locale: language,
      };

      if (knowledgeMode !== "never") {
        body.mode = "agent";
      }

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
        throw new Error(data.error || t.fetchAnswerFailed);
      }

      const sources = normalizeChatSources(data.sources);
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: normalizeAssistantAnswer(data.answer, sources, language),
        sources,
        routing: normalizeChatRouting(data.routing),
        timestamp: new Date().toISOString(),
      };
      const savedMessages = [...nextMessages, assistantMessage];
      setMessages(savedMessages);

      await fetch(`/api/chat/sessions/${targetSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: savedMessages }),
      });

      if (typeof data.generatedTitle === "string" && data.generatedTitle.trim()) {
        applySessionTitleUpdate(
          targetSession.id,
          data.generatedTitle.trim(),
          (typeof data.titleStatus === "string"
            ? (data.titleStatus as ChatTitleStatus)
            : "ready")
        );
      }

      await loadSessions();

      if (!data.generatedTitle && data.titleSource !== "ai") {
        void maybeGenerateSessionTitle(targetSession.id, savedMessages);
      }
    } catch (error: any) {
      toast.error(error.message || t.networkError);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendQuery(input);

  const regenerateFrom = async (messageIndex: number) => {
    const previousUserIndex = messages
      .slice(0, messageIndex)
      .map((message, index) => ({ message, index }))
      .reverse()
      .find((item) => item.message.role === "user")?.index;

    if (previousUserIndex === undefined) {
      return;
    }

    const baseMessages = messages.slice(0, previousUserIndex);
    const query = messages[previousUserIndex].content;
    await sendQuery(query, baseMessages);
  };

  const branchFrom = async (messageIndex: number) => {
    const branchMessages = messages.slice(0, messageIndex + 1);
    await createNewSession(branchMessages, `${currentSession?.title || t.sessionTitle} branch`);
    toast.success(t.branchToast);
  };

  const attachFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    if (!supportsAttachments) {
      toast.error(t.multimodalRequired);
      return;
    }

    setAttachments((current) => [...current, ...Array.from(files).slice(0, 5)]);
  };

  if (initializing) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sessionSidebar = (
    <ChatSidebar
      language={language}
      collapsed={sidebarCollapsed}
      sessions={groupedSessions}
      currentSession={currentSession}
      pinnedSessionIds={pinnedSessionIds}
      archivedSessionIds={archivedSessionIds}
      sessionSearch={sessionSearch}
      showArchived={showArchived}
      onToggleCollapse={toggleSessionSidebar}
      onSearchChange={setSessionSearch}
      onCreateSession={() => createNewSession()}
      onOpenSession={openSession}
      onRenameSession={renameSession}
      onDeleteSession={deleteSession}
      onTogglePinned={(sessionId) =>
        toggleSessionSet(PINNED_STORAGE_KEY, sessionId, setPinnedSessionIds)
      }
      onArchiveSession={archiveSession}
      onToggleShowArchived={() => setShowArchived((value) => !value)}
    />
  );

  const chatMain = (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-end border-b border-border bg-muted/50 px-4 py-2 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSourcesMobileOpen(true)}
        >
          {t.sources}
          {sessionSources.length > 0 ? ` (${sessionSources.length})` : ""}
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 pb-40 pt-6 sm:px-6 lg:px-8">
          {messages.length === 0 ? (
            <NewSessionEmptyState language={language} />
          ) : (
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
              {messages.map((message, index) => (
                <MessageBubble
                  key={`${message.timestamp}-${index}`}
                  language={language}
                  message={message}
                  onCopy={() => copyText(message.content, t.copied)}
                  onRegenerate={() => regenerateFrom(index)}
                  onBranch={() => branchFrom(index)}
                  onCitationClick={(citationIndex) => {
                    setHighlightedSourceIndex(citationIndex);
                    setSourcesPanelCollapsed(false);
                    if (isLargeScreen) {
                      return;
                    }
                    setSourcesMobileOpen(true);
                  }}
                />
              ))}
              {loading && (
                <div className="flex items-center gap-3 border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-none">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.generating}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <Composer
          language={language}
          input={input}
          loading={loading}
          attachments={attachments}
          knowledgeMode={knowledgeMode}
          currentModelLabel={currentModelLabel}
          providerOptions={providerOptions}
          selectedProvider={selectedProvider}
          selectedModelId={selectedModelId}
          showModelMenu={showModelMenu}
          supportsAttachments={supportsAttachments}
          fileInputRef={fileInputRef}
          onInputChange={setInput}
          onSend={handleSend}
          onKnowledgeModeChange={setKnowledgeMode}
          onToggleModelMenu={() => setShowModelMenu((value) => !value)}
          onSelectModel={(provider, modelId) => {
            setSelectedProvider(provider);
            setSelectedModelId(modelId);
            setShowModelMenu(false);
          }}
          onSelectDefaultModel={() => {
            setSelectedProvider("");
            setSelectedModelId("");
            setShowModelMenu(false);
          }}
          onAttachClick={() => fileInputRef.current?.click()}
          onFilesSelected={attachFiles}
          onRemoveAttachment={(index) =>
            setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))
          }
        />
      </div>
    </section>
  );

  const sourcesPanel = (
    <SourcesPanel
      language={language}
      sessionId={currentSession?.id ?? null}
      sources={sessionSources}
      collapsed={sourcesPanelCollapsed}
      highlightedIndex={highlightedSourceIndex}
      onToggleCollapse={toggleSourcesPanel}
      onHighlight={setHighlightedSourceIndex}
      onAnalyze={(prompt) => void sendQuery(prompt)}
    />
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-muted/40 text-foreground">
      {isLargeScreen ? (
        <ResizablePanelGroup
          key={isLargeScreen ? "chat-panels-desktop" : "chat-panels-mobile"}
          direction="horizontal"
          autoSaveId={CHAT_PANELS_AUTO_SAVE_ID}
          groupRef={chatPanelGroupRef}
          defaultLayout={chatPanelFallbackLayout}
          fallbackLayout={chatPanelFallbackLayout}
          sanitizeLayout={sanitizeChatPanelLayout}
          className="min-h-0 min-w-0 flex-1"
        >
          <ResizablePanel
            id="chat-session"
            defaultSize={CHAT_PANEL_DEFAULTS.session.defaultSize}
            minSize={CHAT_PANEL_DEFAULTS.session.minSize}
            maxSize={CHAT_PANEL_DEFAULTS.session.maxSize}
            className="min-w-0"
          >
            {sessionSidebar}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="chat-main"
            defaultSize={CHAT_PANEL_DEFAULTS.chat.defaultSize}
            className="min-w-0"
          >
            {chatMain}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="chat-sources"
            defaultSize={CHAT_PANEL_DEFAULTS.sources.defaultSize}
            minSize={CHAT_PANEL_DEFAULTS.sources.minSize}
            maxSize={CHAT_PANEL_DEFAULTS.sources.maxSize}
            className="min-w-0"
          >
            {sourcesPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <>
          {sessionSidebar}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{chatMain}</div>
        </>
      )}

      <SourcesMobileSheet
        open={sourcesMobileOpen}
        language={language}
        sessionId={currentSession?.id ?? null}
        sources={sessionSources}
        onClose={() => setSourcesMobileOpen(false)}
        onAnalyze={(prompt) => {
          setSourcesMobileOpen(false);
          void sendQuery(prompt);
        }}
      />
    </div>
  );
}

function ChatSidebar({
  language,
  collapsed,
  sessions,
  currentSession,
  pinnedSessionIds,
  archivedSessionIds,
  sessionSearch,
  showArchived,
  onToggleCollapse,
  onSearchChange,
  onCreateSession,
  onOpenSession,
  onRenameSession,
  onDeleteSession,
  onTogglePinned,
  onArchiveSession,
  onToggleShowArchived,
}: {
  language: DashboardLanguage;
  collapsed: boolean;
  sessions: Array<{ key: "today" | "yesterday" | "earlier"; label: string; sessions: ChatSession[] }>;
  currentSession: ChatSession | null;
  pinnedSessionIds: Set<string>;
  archivedSessionIds: Set<string>;
  sessionSearch: string;
  showArchived: boolean;
  onToggleCollapse: () => void;
  onSearchChange: (value: string) => void;
  onCreateSession: () => void;
  onOpenSession: (session: ChatSession) => void;
  onRenameSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onTogglePinned: (sessionId: string) => void;
  onArchiveSession: (session: ChatSession) => void;
  onToggleShowArchived: () => void;
}) {
  const t = chatCopy[language];

  if (collapsed) {
    return (
      <aside className="flex h-full w-full shrink-0 flex-col items-center border-r border-border bg-muted/50 py-4">
        <button
          className="rounded-lg p-2 text-muted-foreground hover:bg-card"
          onClick={onToggleCollapse}
          aria-label={t.expandSidebar}
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        <button
          className="mt-4 rounded-lg p-2 text-muted-foreground hover:bg-card"
          onClick={onCreateSession}
          aria-label={t.newSession}
        >
          <Plus className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full min-w-0 shrink-0 flex-col border-r border-border bg-muted/50">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center border border-border bg-card text-primary shadow-none">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Smart Favorites</div>
            <div className="text-xs text-primary">{t.knowledgeBase}</div>
          </div>
        </div>
        <button
          className="rounded-lg p-2 text-muted-foreground hover:bg-card"
          onClick={onToggleCollapse}
          aria-label={t.collapseSidebar}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-5">
        <button
          onClick={onCreateSession}
          className="flex w-full items-center gap-3 border border-transparent px-3 py-2 text-left text-sm text-muted-foreground hover:border-border hover:bg-card"
        >
          <Plus className="h-4 w-4" />
          {t.newSession}
        </button>

        <div className="flex items-center border border-border bg-card px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={sessionSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t.searchSessions}
            className="ml-2 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-4 pb-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="utility-label px-1">
            {showArchived ? t.archived : t.today}
          </span>
          <button
            onClick={onToggleShowArchived}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-card"
          >
            {showArchived ? t.active : t.archive}
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            {t.noSessions}
          </div>
        ) : (
          sessions.map((group) => (
            <div key={group.key} className="mb-5">
              {group.key !== "today" && (
                <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {group.sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    language={language}
                    session={session}
                    active={currentSession?.id === session.id}
                    pinned={pinnedSessionIds.has(session.id)}
                    archived={archivedSessionIds.has(session.id)}
                    onOpen={() => onOpenSession(session)}
                    onRename={() => onRenameSession(session)}
                    onDelete={() => onDeleteSession(session.id)}
                    onTogglePinned={() => onTogglePinned(session.id)}
                    onArchive={() => onArchiveSession(session)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function SessionRow({
  language,
  session,
  active,
  pinned,
  archived,
  onOpen,
  onRename,
  onDelete,
  onTogglePinned,
  onArchive,
}: {
  language: DashboardLanguage;
  session: ChatSession;
  active: boolean;
  pinned: boolean;
  archived: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onTogglePinned: () => void;
  onArchive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = chatCopy[language];

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-2 border border-transparent px-3 py-2.5 text-sm transition-colors",
        active
          ? "border-border bg-card text-foreground"
          : "text-muted-foreground hover:border-border hover:bg-card"
      )}
      onClick={onOpen}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", pinned ? "bg-primary/50" : "bg-muted-foreground/30")} />
      {session.title_status === "generating" ? (
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          {t.titleGenerating}
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate">{session.title || t.untitled}</span>
      )}
      {archived && <Archive className="h-3.5 w-3.5 text-muted-foreground" />}
      <button
        className="rounded-md p-1 text-muted-foreground opacity-0 hover:bg-primary/5 hover:text-muted-foreground group-hover:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((value) => !value);
        }}
        aria-label={t.sessionActions}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div
          className="absolute right-2 top-9 z-20 w-36 border border-border bg-card p-1 text-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <MenuButton icon={Pencil} label={t.rename} onClick={onRename} />
          <MenuButton icon={Pin} label={pinned ? t.unpin : t.pin} onClick={onTogglePinned} />
          <MenuButton icon={Archive} label={archived ? t.unarchive : t.archive} onClick={onArchive} />
          <MenuButton icon={Trash2} label={t.delete} danger onClick={onDelete} />
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-primary/5",
        danger && "text-red-600"
      )}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function NewSessionEmptyState({ language }: { language: DashboardLanguage }) {
  const t = chatCopy[language];

  return (
    <div className="flex min-h-full items-center justify-center pb-20">
      <div className="text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center border border-border bg-card text-primary">
          <Sparkles className="h-12 w-12" />
        </div>
        <h1 className="mt-10 text-5xl font-bold tracking-normal text-foreground">{t.emptyTitle}</h1>
        <p className="mx-auto mt-5 max-w-lg text-xl leading-8 text-muted-foreground">
          {t.emptyDescription}
        </p>
      </div>
    </div>
  );
}

function Composer({
  language,
  input,
  loading,
  attachments,
  knowledgeMode,
  currentModelLabel,
  providerOptions,
  selectedProvider,
  selectedModelId,
  showModelMenu,
  supportsAttachments,
  fileInputRef,
  onInputChange,
  onSend,
  onKnowledgeModeChange,
  onToggleModelMenu,
  onSelectModel,
  onSelectDefaultModel,
  onAttachClick,
  onFilesSelected,
  onRemoveAttachment,
}: {
  language: DashboardLanguage;
  input: string;
  loading: boolean;
  attachments: File[];
  knowledgeMode: KnowledgeMode;
  currentModelLabel: string;
  providerOptions: ReturnType<typeof getConfiguredProviderOptions>;
  selectedProvider: LLMProvider | "";
  selectedModelId: string;
  showModelMenu: boolean;
  supportsAttachments: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKnowledgeModeChange: (mode: KnowledgeMode) => void;
  onToggleModelMenu: () => void;
  onSelectModel: (provider: LLMProvider, modelId: string) => void;
  onSelectDefaultModel: () => void;
  onAttachClick: () => void;
  onFilesSelected: (files: FileList | null) => void;
  onRemoveAttachment: (index: number) => void;
}) {
  const t = chatCopy[language];

  const cycleKnowledgeMode = () => {
    onKnowledgeModeChange(
      knowledgeMode === "auto" ? "always" : knowledgeMode === "always" ? "never" : "auto"
    );
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 sm:px-6 lg:px-8">
      <div className="@container/composer pointer-events-auto mx-auto max-w-5xl">
        <div className="border border-border bg-card">
          <Textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            disabled={loading}
            placeholder={t.placeholder}
            className="min-h-[76px] resize-none border-0 bg-transparent px-6 py-5 text-base shadow-none focus-visible:ring-0"
          />

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border/60 px-5 py-3">
              {attachments.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs text-muted-foreground"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {file.name}
                  <button onClick={() => onRemoveAttachment(index)} aria-label={t.removeAttachment}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-nowrap items-center gap-2 border-t border-border/60 px-5 py-3 sm:gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,.pdf,.md,.txt,.doc,.docx"
              onChange={(event) => {
                onFilesSelected(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <button
              onClick={onAttachClick}
              disabled={!supportsAttachments}
              title={supportsAttachments ? t.uploadAttachment : t.modelNotMultimodal}
              className="rounded-xl p-2 text-muted-foreground hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              onClick={cycleKnowledgeMode}
              title={knowledgeModeLabels[language][knowledgeMode]}
              aria-label={knowledgeModeLabels[language][knowledgeMode]}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 @max-[480px]/composer:px-2"
            >
              <Zap className="h-4 w-4" />
              <span className="@max-[480px]/composer:hidden">
                {knowledgeModeLabels[language][knowledgeMode]}
              </span>
              <ChevronDown className="h-4 w-4 @max-[480px]/composer:hidden" />
            </button>

            <div className="ml-auto flex min-w-0 shrink items-center gap-2 sm:gap-3">
              <div className="relative min-w-0">
                <button
                  onClick={onToggleModelMenu}
                  title={currentModelLabel}
                  aria-label={currentModelLabel}
                  className="inline-flex max-w-xs min-w-0 items-center gap-2 rounded-full bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 @max-[480px]/composer:max-w-none @max-[480px]/composer:px-2"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate @max-[480px]/composer:hidden">{currentModelLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 @max-[480px]/composer:hidden" />
                </button>

                {showModelMenu && (
                  <div className="absolute bottom-full right-0 z-50 mb-2 max-h-80 w-72 overflow-y-auto border border-border bg-card p-2">
                    <button
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-primary/5",
                        !selectedProvider && "bg-primary/5 font-semibold"
                      )}
                      onClick={onSelectDefaultModel}
                    >
                      {t.defaultModel}
                    </button>
                    {providerOptions.length === 0 && (
                      <div className="px-3 py-3 text-xs text-muted-foreground">
                        {t.noModels}
                      </div>
                    )}
                    {providerOptions.map((provider) => (
                      <div key={provider.id} className="mt-2">
                        <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {provider.name}
                        </div>
                        {provider.models.map((model) => (
                          <button
                            key={model.id}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-primary/5",
                              selectedProvider === provider.id &&
                                selectedModelId === model.id &&
                                "bg-primary/5 font-semibold"
                            )}
                            onClick={() => onSelectModel(provider.id, model.id)}
                          >
                            <span className="truncate">{model.label}</span>
                            {selectedProvider === provider.id && selectedModelId === model.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onSend}
                disabled={loading || !input.trim()}
                title={t.run}
                aria-label={t.run}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 @max-[480px]/composer:px-2.5"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                <span className="@max-[480px]/composer:hidden">{t.run}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  language,
  message,
  onCopy,
  onRegenerate,
  onBranch,
  onCitationClick,
}: {
  language: DashboardLanguage;
  message: ChatMessage;
  onCopy: () => void;
  onRegenerate: () => void;
  onBranch: () => void;
  onCitationClick?: (index: number) => void;
}) {
  const isUser = message.role === "user";
  const sources = message.sources || [];
  const routing = message.routing;
  const t = chatCopy[language];

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-[22px] bg-[#2563eb] px-6 py-4 text-base leading-7 text-white shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group border border-border bg-card/95 p-5 shadow-none">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          {t.smartFavorites}
          {routing && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-primary/5 px-2 py-0.5 text-xs font-medium">
              <Database className="h-3.5 w-3.5" />
              {routing.useKnowledge ? t.knowledgeSearched : t.knowledgeSkipped}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <IconAction label={t.copy} icon={Copy} onClick={onCopy} />
          <IconAction label={t.regenerate} icon={RefreshCw} onClick={onRegenerate} />
          <IconAction label={t.branch} icon={GitBranch} onClick={onBranch} />
        </div>
      </div>

      <div className="prose prose-slate max-w-none rounded-2xl bg-muted/40 px-5 py-4 text-base leading-7">
        <MarkdownRenderer
          content={normalizeAssistantAnswer(message.content, sources, language)}
          onCitationClick={onCitationClick}
        />
      </div>

      {sources.length > 0 && (
        <details className="group/source mt-4 rounded-2xl border border-border bg-muted/50 px-4 py-3" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t.sources} - {sources.length}
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open/source:rotate-180" />
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <SourceChip key={`${source.id}-${index}`} language={language} source={source} index={index} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function IconAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg p-2 text-muted-foreground hover:bg-primary/5 hover:text-muted-foreground"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function SourceChip({
  language,
  source,
  index,
}: {
  language: DashboardLanguage;
  source: SearchResult;
  index: number;
}) {
  const href = source.bookmark?.url || source.star?.url || "";
  const title =
    source.bookmark?.title ||
    (source.star ? `${source.star.owner}/${source.star.repo}` : "") ||
    source.document?.title ||
    `${chatCopy[language].source} ${index + 1}`;
  const description = getSourceDescription(source, language);
  const content = (
    <>
      {href ? <ExternalLink className="h-3.5 w-3.5 shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
      <span className="flex min-w-0 max-w-[280px] flex-col">
        <span className="truncate">{title}</span>
        {description && <span className="truncate text-[11px] text-muted-foreground">{description}</span>}
      </span>
      <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px]">
        {Math.round((source.similarity || 0) * 100)}%
      </Badge>
    </>
  );

  const className =
    "inline-flex max-w-full items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-xs text-muted-foreground shadow-none transition hover:bg-primary/5";

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
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
      loading: Boolean(modelLoadStates[provider.id]),
    }))
    .filter((provider) => provider.models.length > 0 || provider.loading);
}

function getCurrentModelLabel(
  language: DashboardLanguage,
  configuredProviders: LLMProvider[],
  providerOptions: ReturnType<typeof getConfiguredProviderOptions>,
  selectedProvider: LLMProvider | "",
  selectedModelId: string
) {
  if (configuredProviders.length === 0) {
    return chatCopy[language].unconfiguredModel;
  }

  if (!selectedProvider) {
    return chatCopy[language].defaultModel;
  }

  const provider = providerOptions.find((item) => item.id === selectedProvider);
  const model = selectedModelId
    ? provider?.models.find((item) => item.id === selectedModelId)
    : provider?.models[0];
  return model ? `${provider?.name} - ${model.label}` : provider?.name || selectedProvider;
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
  const scope =
    item.scope === "stars" ||
    item.scope === "bookmarks" ||
    item.scope === "documents" ||
    item.scope === "all"
      ? item.scope
      : "all";
  return {
    mode,
    useKnowledge: Boolean(item.useKnowledge),
    reason: typeof item.reason === "string" ? item.reason : "",
    scope,
  };
}

function normalizeAssistantAnswer(
  answer: unknown,
  sources?: SearchResult[],
  language: DashboardLanguage = "zh"
): string {
  const text = typeof answer === "string" ? answer.trim() : "";
  if (text.length > 0) {
    return text;
  }

  if (sources && sources.length > 0) {
    return pickLanguage(
      language,
      "我找到了相关引用来源，但这次模型没有返回可显示的回答。你可以换一个模型重试，或基于下方来源继续追问。",
      "I found relevant sources, but the model did not return a displayable answer. Try another model, or continue from the sources below."
    );
  }

  return pickLanguage(
    language,
    "这次没有生成可显示的回答。请稍后重试，或切换到另一个已配置的模型。",
    "No displayable answer was generated. Try again later, or switch to another configured model."
  );
}

function getSourceDescription(source: SearchResult, language: DashboardLanguage) {
  const bookmarkDescription = source.bookmark
    ? language === "zh"
      ? source.bookmark.description_zh || source.bookmark.description || source.bookmark.description_en
      : source.bookmark.description_en || source.bookmark.description || source.bookmark.description_zh
    : "";
  const starDescription = source.star
    ? language === "zh"
      ? source.star.description_zh || source.star.description || source.star.description_en
      : source.star.description_en || source.star.description || source.star.description_zh
    : "";
  const documentDescription =
    source.document?.section_title ||
    source.document?.file_name ||
    (source.document?.page_number
      ? `${pickLanguage(language, "第", "Page ")}${source.document.page_number}${pickLanguage(language, "页", "")}`
      : "");

  return bookmarkDescription || starDescription || documentDescription || "";
}

function groupSessionsByDate(sessions: ChatSession[], language: DashboardLanguage) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups = new Map<"today" | "yesterday" | "earlier", ChatSession[]>();
  for (const session of sessions) {
    const date = new Date(session.updated_at || session.created_at);
    const key = isSameDate(date, today)
      ? "today"
      : isSameDate(date, yesterday)
        ? "yesterday"
        : "earlier";
    groups.set(key, [...(groups.get(key) || []), session]);
  }

  return [
    { key: "today" as const, label: chatCopy[language].today },
    { key: "yesterday" as const, label: chatCopy[language].yesterday },
    { key: "earlier" as const, label: chatCopy[language].earlier },
  ]
    .map((group) => ({ ...group, sessions: groups.get(group.key) || [] }))
    .filter((group) => group.sessions.length > 0);
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function readStoredSessionSet(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

async function copyText(text: string, successLabel: string) {
  await navigator.clipboard.writeText(text);
  toast.success(successLabel);
}

function isMultimodalModel(provider: string, modelId: string) {
  const value = `${provider} ${modelId}`.toLowerCase();
  return /vision|vl|4o|omni|gemini|claude|multimodal|glm-4v|qwen-vl/.test(value);
}
