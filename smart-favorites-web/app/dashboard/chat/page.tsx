"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import {
  Archive,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
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
  Settings,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { cn } from "@/lib/utils";
import type {
  ChatMessage,
  ChatRoutingMetadata,
  ChatSession,
  LLMProvider,
  SearchResult,
} from "@/types";
import { CHAT_PROVIDER_OPTIONS, type ChatModelOption } from "@/lib/chat-models";

type KnowledgeMode = "auto" | "always" | "never";
type WorkspaceTab = "new" | "settings" | "scheduled";

const PINNED_STORAGE_KEY = "smart-favorites:chat:pinned";
const ARCHIVED_STORAGE_KEY = "smart-favorites:chat:archived";

const knowledgeModeLabels: Record<KnowledgeMode, string> = {
  auto: "Auto search",
  always: "Knowledge",
  never: "Bypass",
};

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("new");
  const [knowledgeMode, setKnowledgeMode] = useState<KnowledgeMode>("auto");
  const [pinnedSessionIds, setPinnedSessionIds] = useState<Set<string>>(new Set());
  const [archivedSessionIds, setArchivedSessionIds] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const createNewSession = useCallback(
    async (initialMessages: ChatMessage[] = [], title?: string): Promise<ChatSession | null> => {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || `对话 ${new Date().toLocaleString("zh-CN")}`,
        }),
      });

      if (!response.ok) {
        toast.error("创建会话失败");
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
    [loadSessions]
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
    async function init() {
      setInitializing(true);
      try {
        await loadAiSettings();
        const list = await loadSessions();
        if (list.length > 0) {
          void openSession(list[0]);
        } else {
          void createNewSession();
        }
      } catch (error) {
        console.error("Failed to initialize chat page:", error);
      } finally {
        setInitializing(false);
      }
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

  const providerOptions = getConfiguredProviderOptions(
    configuredProviders,
    providerModels,
    modelLoadStates
  );
  const currentModelLabel = getCurrentModelLabel(
    configuredProviders,
    providerOptions,
    selectedProvider,
    selectedModelId
  );
  const supportsAttachments = isMultimodalModel(selectedProvider, selectedModelId);

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

  const groupedSessions = useMemo(() => groupSessionsByDate(visibleSessions), [visibleSessions]);

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
    const title = window.prompt("重命名会话", session.title)?.trim();
    if (!title || title === session.title) {
      return;
    }

    const response = await fetch(`/api/chat/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      toast.error("重命名失败");
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
        ? `\n\n附件：${attachments.map((file) => file.name).join("，")}`
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

      await fetch(`/api/chat/sessions/${targetSession.id}`, {
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
    await createNewSession(branchMessages, `${currentSession?.title || "对话"} · branch`);
    toast.success("已创建分支会话");
  };

  const attachFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    if (!supportsAttachments) {
      toast.error("当前模型未标记为多模态，不能上传附件");
      return;
    }

    setAttachments((current) => [...current, ...Array.from(files).slice(0, 5)]);
  };

  if (initializing) {
    return (
      <div className="flex h-full min-h-[calc(100vh-4rem)] items-center justify-center bg-[#faf9f7]">
        <Loader2 className="h-8 w-8 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] overflow-hidden bg-[#fbfaf8] text-stone-950">
      <ChatSidebar
        collapsed={sidebarCollapsed}
        sessions={groupedSessions}
        currentSession={currentSession}
        pinnedSessionIds={pinnedSessionIds}
        archivedSessionIds={archivedSessionIds}
        sessionSearch={sessionSearch}
        showArchived={showArchived}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
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

      <section className="flex min-w-0 flex-1 flex-col">
        <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-8 pb-48 pt-8">
            {messages.length === 0 ? (
              <NewSessionEmptyState />
            ) : (
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                {messages.map((message, index) => (
                  <MessageBubble
                    key={`${message.timestamp}-${index}`}
                    message={message}
                    onCopy={() => copyText(message.content)}
                    onRegenerate={() => regenerateFrom(index)}
                    onBranch={() => branchFrom(index)}
                  />
                ))}
                {loading && (
                  <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/80 px-5 py-4 text-sm text-stone-500 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在生成回答...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <Composer
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
    </div>
  );
}

function ChatSidebar({
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
  collapsed: boolean;
  sessions: Array<{ label: string; sessions: ChatSession[] }>;
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
  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center border-r border-[#e4d7d0] bg-[#f4f1ed] py-4">
        <button
          className="rounded-lg p-2 text-stone-600 hover:bg-white"
          onClick={onToggleCollapse}
          aria-label="展开会话栏"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        <button
          className="mt-4 rounded-lg p-2 text-stone-600 hover:bg-white"
          onClick={onCreateSession}
          aria-label="新建会话"
        >
          <Plus className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-[#e4d7d0] bg-[#f4f1ed]">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#eadbd3] bg-white text-[#c56b4f] shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Smart Favorites</div>
            <div className="text-xs text-[#c56b4f]">Code</div>
          </div>
        </div>
        <button
          className="rounded-lg p-2 text-stone-500 hover:bg-white"
          onClick={onToggleCollapse}
          aria-label="折叠会话栏"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-5">
        <button
          onClick={onCreateSession}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-stone-700 hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          New session
        </button>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-stone-700 hover:bg-white">
          <Clock className="h-4 w-4" />
          Scheduled
        </button>

        <div className="pt-3">
          <button className="flex items-center gap-2 text-sm text-stone-600">
            All projects
            <ChevronDown className="h-4 w-4" />
          </button>
          <div className="mt-3 flex items-center rounded-lg border border-[#dfcdc4] bg-[#fffdfb] px-3 py-2 focus-within:ring-1 focus-within:ring-[#c56b4f]">
            <Search className="h-4 w-4 text-stone-400" />
            <input
              value={sessionSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search sessions..."
              className="ml-2 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-4 pb-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {showArchived ? "Archived" : "Today"}
          </span>
          <button
            onClick={onToggleShowArchived}
            className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-white"
          >
            {showArchived ? "Active" : "Archive"}
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl px-3 py-4 text-sm text-stone-500">没有会话</div>
        ) : (
          sessions.map((group) => (
            <div key={group.label} className="mb-5">
              {group.label !== "Today" && (
                <div className="mb-2 px-2 text-xs font-semibold text-stone-500">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {group.sessions.map((session) => (
                  <SessionRow
                    key={session.id}
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

      <div className="border-t border-[#e4d7d0] px-5 py-4">
        <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-stone-700 hover:bg-white">
          <Settings className="h-5 w-5" />
          Settings
        </button>
      </div>
    </aside>
  );
}

function SessionRow({
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

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active ? "bg-[#ebe7e1] text-stone-950" : "text-stone-600 hover:bg-white"
      )}
      onClick={onOpen}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", pinned ? "bg-[#b26148]" : "bg-stone-300")} />
      <span className="min-w-0 flex-1 truncate">{session.title || "Untitled Session"}</span>
      {archived && <Archive className="h-3.5 w-3.5 text-stone-400" />}
      <button
        className="rounded-md p-1 text-stone-400 opacity-0 hover:bg-[#f4f1ed] hover:text-stone-700 group-hover:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((value) => !value);
        }}
        aria-label="会话操作"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div
          className="absolute right-2 top-9 z-20 w-36 rounded-xl border border-[#dfcdc4] bg-white p-1 text-sm shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <MenuButton icon={Pencil} label="Rename" onClick={onRename} />
          <MenuButton icon={Pin} label={pinned ? "Unpin" : "Pin"} onClick={onTogglePinned} />
          <MenuButton icon={Archive} label={archived ? "Unarchive" : "Archive"} onClick={onArchive} />
          <MenuButton icon={Trash2} label="Delete" danger onClick={onDelete} />
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
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f4f1ed]",
        danger && "text-red-600"
      )}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function WorkspaceTabs({
  activeTab,
  onChange,
}: {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-[#e4d7d0] bg-[#fbfaf8]">
      <TabButton active={activeTab === "new"} onClick={() => onChange("new")}>
        New session
      </TabButton>
      <TabButton active={activeTab === "settings"} onClick={() => onChange("settings")}>
        <Settings className="h-5 w-5" />
        Settings
      </TabButton>
      <TabButton active={activeTab === "scheduled"} onClick={() => onChange("scheduled")}>
        <Clock className="h-5 w-5" />
        Scheduled
      </TabButton>
    </header>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-full min-w-44 items-center gap-3 border-r border-[#eadbd3] px-5 text-left text-sm font-medium text-stone-600",
        active && "bg-white text-stone-950"
      )}
    >
      {children}
    </button>
  );
}

function NewSessionEmptyState() {
  return (
    <div className="flex min-h-full items-center justify-center pb-20">
      <div className="text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl border border-[#eadbd3] bg-white text-[#d47659] shadow-[0_18px_50px_rgba(126,88,61,0.18)]">
          <Sparkles className="h-12 w-12" />
        </div>
        <h1 className="mt-10 text-5xl font-bold tracking-normal text-stone-950">New session</h1>
        <p className="mx-auto mt-5 max-w-lg text-xl leading-8 text-stone-600">
          Start a fresh knowledge session. Smart Favorites is ready to search,
          organize, debug, and connect your saved resources.
        </p>
      </div>
    </div>
  );
}

function Composer({
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
  const cycleKnowledgeMode = () => {
    onKnowledgeModeChange(
      knowledgeMode === "auto" ? "always" : knowledgeMode === "always" ? "never" : "auto"
    );
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-8 pb-8">
      <div className="pointer-events-auto mx-auto max-w-5xl">
        <div className="rounded-3xl border border-[#eadbd3] bg-white shadow-[0_20px_60px_rgba(99,75,58,0.14)]">
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
            placeholder="Ask Smart Favorites to search, edit, debug or explain..."
            className="min-h-[76px] resize-none border-0 bg-transparent px-6 py-5 text-base shadow-none focus-visible:ring-0"
          />

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-stone-100 px-5 py-3">
              {attachments.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f4f1ed] px-3 py-1 text-xs text-stone-600"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {file.name}
                  <button onClick={() => onRemoveAttachment(index)} aria-label="移除附件">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-stone-100 px-5 py-4">
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
              title={supportsAttachments ? "上传多模态附件" : "当前模型未标记为多模态"}
              className="rounded-xl p-2 text-stone-600 hover:bg-[#f4f1ed] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              onClick={cycleKnowledgeMode}
              className="inline-flex items-center gap-2 rounded-full bg-[#f4f1ed] px-4 py-2 text-sm font-medium text-stone-700 hover:bg-[#ebe4dc]"
            >
              <Zap className="h-4 w-4" />
              {knowledgeModeLabels[knowledgeMode]}
              <ChevronDown className="h-4 w-4" />
            </button>

            <div className="ml-auto flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={onToggleModelMenu}
                  className="inline-flex max-w-xs items-center gap-2 rounded-full bg-[#f4f1ed] px-4 py-2 text-sm font-medium text-stone-700 hover:bg-[#ebe4dc]"
                >
                  <Sparkles className="h-4 w-4 text-[#b26148]" />
                  <span className="truncate">{currentModelLabel}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showModelMenu && (
                  <div className="absolute bottom-full right-0 z-50 mb-2 max-h-80 w-72 overflow-y-auto rounded-2xl border border-[#dfcdc4] bg-white p-2 shadow-2xl">
                    <button
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#f4f1ed]",
                        !selectedProvider && "bg-[#f4f1ed] font-semibold"
                      )}
                      onClick={onSelectDefaultModel}
                    >
                      默认模型
                    </button>
                    {providerOptions.length === 0 && (
                      <div className="px-3 py-3 text-xs text-stone-500">
                        暂无已配置且可用的模型，请先在设置中保存 API Key 并获取模型。
                      </div>
                    )}
                    {providerOptions.map((provider) => (
                      <div key={provider.id} className="mt-2">
                        <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                          {provider.name}
                        </div>
                        {provider.models.map((model) => (
                          <button
                            key={model.id}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-[#f4f1ed]",
                              selectedProvider === provider.id &&
                                selectedModelId === model.id &&
                                "bg-[#f4f1ed] font-semibold"
                            )}
                            onClick={() => onSelectModel(provider.id, model.id)}
                          >
                            <span className="truncate">{model.label}</span>
                            {selectedProvider === provider.id && selectedModelId === model.id && (
                              <Check className="h-4 w-4 text-[#b26148]" />
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
                className="inline-flex items-center gap-2 rounded-2xl bg-[#d9c6ba] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c7aa9b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                Run
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onCopy,
  onRegenerate,
  onBranch,
}: {
  message: ChatMessage;
  onCopy: () => void;
  onRegenerate: () => void;
  onBranch: () => void;
}) {
  const isUser = message.role === "user";
  const sources = message.sources || [];
  const routing = message.routing;

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
    <div className="group rounded-3xl border border-[#ebe2dc] bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-500">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-600">
            <Sparkles className="h-4 w-4" />
          </span>
          Smart Favorites
          {routing && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#e4d7d0] bg-[#fbfaf8] px-2 py-0.5 text-xs font-medium">
              <Database className="h-3.5 w-3.5" />
              {routing.useKnowledge ? "已搜索知识库" : "未搜索知识库"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <IconAction label="复制" icon={Copy} onClick={onCopy} />
          <IconAction label="重新生成" icon={RefreshCw} onClick={onRegenerate} />
          <IconAction label="分支" icon={GitBranch} onClick={onBranch} />
        </div>
      </div>

      <div className="prose prose-stone max-w-none rounded-2xl bg-[#fdfcfb] px-5 py-4 text-base leading-7">
        <MarkdownRenderer content={normalizeAssistantAnswer(message.content, sources)} />
      </div>

      {sources.length > 0 && (
        <details className="group/source mt-4 rounded-2xl border border-[#ebe2dc] bg-[#fbfaf8] px-4 py-3" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-stone-500">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              引用来源 · {sources.length}
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open/source:rotate-180" />
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <SourceChip key={`${source.id}-${index}`} source={source} index={index} />
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
      className="rounded-lg p-2 text-stone-400 hover:bg-[#f4f1ed] hover:text-stone-700"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function SourceChip({ source, index }: { source: SearchResult; index: number }) {
  const href = source.bookmark?.url || source.star?.url || "";
  const title =
    source.bookmark?.title ||
    (source.star ? `${source.star.owner}/${source.star.repo}` : "") ||
    source.document?.title ||
    `Source ${index + 1}`;
  const content = (
    <>
      {href ? <ExternalLink className="h-3.5 w-3.5 shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
      <span className="max-w-[260px] truncate">{title}</span>
      <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px]">
        {Math.round((source.similarity || 0) * 100)}%
      </Badge>
    </>
  );

  const className =
    "inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs text-stone-700 shadow-sm transition hover:bg-[#f4f1ed]";

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
  configuredProviders: LLMProvider[],
  providerOptions: ReturnType<typeof getConfiguredProviderOptions>,
  selectedProvider: LLMProvider | "",
  selectedModelId: string
) {
  if (configuredProviders.length === 0) {
    return "未配置 AI 模型";
  }

  if (!selectedProvider) {
    return "默认模型";
  }

  const provider = providerOptions.find((item) => item.id === selectedProvider);
  const model = selectedModelId
    ? provider?.models.find((item) => item.id === selectedModelId)
    : provider?.models[0];
  return model ? `${provider?.name} · ${model.label}` : provider?.name || selectedProvider;
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

function groupSessionsByDate(sessions: ChatSession[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups = new Map<string, ChatSession[]>();
  for (const session of sessions) {
    const date = new Date(session.updated_at || session.created_at);
    const label = isSameDate(date, today)
      ? "Today"
      : isSameDate(date, yesterday)
        ? "Yesterday"
        : "Earlier";
    groups.set(label, [...(groups.get(label) || []), session]);
  }

  return ["Today", "Yesterday", "Earlier"]
    .map((label) => ({ label, sessions: groups.get(label) || [] }))
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

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success("已复制");
}

function isMultimodalModel(provider: string, modelId: string) {
  const value = `${provider} ${modelId}`.toLowerCase();
  return /vision|vl|4o|omni|gemini|claude|multimodal|glm-4v|qwen-vl/.test(value);
}
