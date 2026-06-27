export const CHAT_PANELS_AUTO_SAVE_ID = "chat-panels";

export const CHAT_PANEL_IDS = ["chat-session", "chat-main", "chat-sources"] as const;

export const CHAT_PANEL_DEFAULTS = {
  session: { defaultSize: 20, minSize: 12, maxSize: 35 },
  chat: { defaultSize: 55, minSize: 30 },
  sources: { defaultSize: 25, minSize: 15, maxSize: 40 },
} as const;

export const DEFAULT_CHAT_PANEL_LAYOUT: Record<(typeof CHAT_PANEL_IDS)[number], number> = {
  "chat-session": CHAT_PANEL_DEFAULTS.session.defaultSize,
  "chat-main": CHAT_PANEL_DEFAULTS.chat.defaultSize,
  "chat-sources": CHAT_PANEL_DEFAULTS.sources.defaultSize,
};
