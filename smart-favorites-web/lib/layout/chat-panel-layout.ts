export const CHAT_PANELS_AUTO_SAVE_ID = "chat-panels-v4";

export const CHAT_PANEL_IDS = ["chat-session", "chat-main", "chat-sources"] as const;

export type ChatPanelId = (typeof CHAT_PANEL_IDS)[number];
export type ChatPanelLayout = Record<ChatPanelId, number>;

/** Narrow icon-rail width when a side panel is collapsed (~48px on typical viewports). */
export const CHAT_PANEL_COLLAPSED_SIZE = 3;

export const CHAT_PANEL_DEFAULTS = {
  session: {
    defaultSize: "20%",
    minSize: "12%",
    maxSize: "45%",
    collapsedSize: `${CHAT_PANEL_COLLAPSED_SIZE}%`,
  },
  chat: { defaultSize: "55%" },
  sources: {
    defaultSize: "25%",
    minSize: "12%",
    maxSize: "45%",
    collapsedSize: `${CHAT_PANEL_COLLAPSED_SIZE}%`,
  },
} as const;

export const DEFAULT_CHAT_PANEL_LAYOUT: ChatPanelLayout = {
  "chat-session": 20,
  "chat-main": 55,
  "chat-sources": 25,
};

export function isChatPanelLayout(value: unknown): value is ChatPanelLayout {
  if (!value || typeof value !== "object") {
    return false;
  }

  const layout = value as Record<string, unknown>;
  return CHAT_PANEL_IDS.every((id) => typeof layout[id] === "number");
}

export function chatPanelLayoutsEqual(a: ChatPanelLayout, b: ChatPanelLayout): boolean {
  return CHAT_PANEL_IDS.every((id) => Math.abs(a[id] - b[id]) < 0.01);
}

/** Reject persisted layouts that sum incorrectly or pin side panels below minSize. */
export function normalizeChatPanelLayout(
  layout: unknown,
  fallback: ChatPanelLayout = DEFAULT_CHAT_PANEL_LAYOUT
): ChatPanelLayout {
  if (!isChatPanelLayout(layout)) {
    return fallback;
  }

  const values = CHAT_PANEL_IDS.map((id) => layout[id]);
  const sum = values.reduce((total, size) => total + size, 0);
  if (Math.abs(sum - 100) > 0.5) {
    return fallback;
  }

  const session = layout["chat-session"];
  const chat = layout["chat-main"];
  const sources = layout["chat-sources"];

  if (
    session < CHAT_PANEL_COLLAPSED_SIZE ||
    session > 45 ||
    sources < CHAT_PANEL_COLLAPSED_SIZE ||
    sources > 45 ||
    chat <= 0
  ) {
    return fallback;
  }

  return layout;
}

export function clearChatPanelLayoutStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("react-resizable-panels:chat-panels")) {
      localStorage.removeItem(key);
    }
  }
}
