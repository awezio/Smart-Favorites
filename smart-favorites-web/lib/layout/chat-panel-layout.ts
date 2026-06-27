export const CHAT_PANELS_AUTO_SAVE_ID = "chat-panels-v3";

export const CHAT_PANEL_IDS = ["chat-session", "chat-main", "chat-sources"] as const;

export type ChatPanelId = (typeof CHAT_PANEL_IDS)[number];
export type ChatPanelLayout = Record<ChatPanelId, number>;

export const CHAT_PANEL_DEFAULTS = {
  session: {
    defaultSize: 20,
    minSize: 5,
    maxSize: 45,
    collapsedSize: 5,
  },
  chat: { defaultSize: 55 },
  sources: {
    defaultSize: 25,
    minSize: 5,
    maxSize: 45,
    collapsedSize: 5,
  },
} as const;

export const DEFAULT_CHAT_PANEL_LAYOUT: ChatPanelLayout = {
  "chat-session": CHAT_PANEL_DEFAULTS.session.defaultSize,
  "chat-main": CHAT_PANEL_DEFAULTS.chat.defaultSize,
  "chat-sources": CHAT_PANEL_DEFAULTS.sources.defaultSize,
};

function isChatPanelLayout(value: unknown): value is ChatPanelLayout {
  if (!value || typeof value !== "object") {
    return false;
  }

  const layout = value as Record<string, unknown>;
  return CHAT_PANEL_IDS.every((id) => typeof layout[id] === "number");
}

/** Reject persisted layouts that sum incorrectly or pin side panels at unusable extremes. */
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
    session < CHAT_PANEL_DEFAULTS.session.minSize ||
    session > CHAT_PANEL_DEFAULTS.session.maxSize ||
    sources < CHAT_PANEL_DEFAULTS.sources.minSize ||
    sources > CHAT_PANEL_DEFAULTS.sources.maxSize ||
    chat <= 0 ||
    chat > 90
  ) {
    return fallback;
  }

  return layout;
}
