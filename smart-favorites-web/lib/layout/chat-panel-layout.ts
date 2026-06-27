export const CHAT_PANELS_AUTO_SAVE_ID = "chat-panels";

export const CHAT_PANEL_DEFAULTS = {
  session: { defaultSize: 20, minSize: 12, maxSize: 35 },
  chat: { defaultSize: 55, minSize: 30 },
  sources: { defaultSize: 25, minSize: 15, maxSize: 40 },
} as const;
