export function getDiceBearUrl(
  style: string,
  seed: string,
  size: number = 128
): string {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

export const AVATAR_STYLES = [
  { id: "adventurer", name: "Adventurer" },
  { id: "avataaars", name: "Avataaars" },
  { id: "big-ears", name: "Big Ears" },
  { id: "bottts", name: "Bottts" },
  { id: "croodles", name: "Croodles" },
  { id: "fun-emoji", name: "Fun Emoji" },
  { id: "icons", name: "Icons" },
  { id: "identicon", name: "Identicon" },
  { id: "initials", name: "Initials" },
  { id: "lorelei", name: "Lorelei" },
  { id: "micah", name: "Micah" },
  { id: "miniavs", name: "Miniavs" },
  { id: "notionists", name: "Notionists" },
  { id: "open-peeps", name: "Open Peeps" },
  { id: "personas", name: "Personas" },
  { id: "pixel-art", name: "Pixel Art" },
  { id: "rings", name: "Rings" },
  { id: "shapes", name: "Shapes" },
  { id: "thumbs", name: "Thumbs" },
] as const;

export type AvatarStyleId = (typeof AVATAR_STYLES)[number]["id"];

export function getAllStylePreviews(seed: string, size: number = 64) {
  return AVATAR_STYLES.map((style) => ({
    ...style,
    url: getDiceBearUrl(style.id, seed, size),
  }));
}
