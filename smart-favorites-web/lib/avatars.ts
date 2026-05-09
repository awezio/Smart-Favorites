/**
 * DiceBear Avatar library
 * Provides avatar generation via DiceBear API with multiple styles
 */

export const AVATAR_STYLES = [
  { id: "adventurer", name: "冒险家" },
  { id: "avataaars", name: "卡通头像" },
  { id: "big-ears", name: "大耳朵" },
  { id: "big-smile", name: "微笑" },
  { id: "bottts", name: "机器人" },
  { id: "croodles", name: "涂鸦" },
  { id: "fun-emoji", name: "趣味表情" },
  { id: "micah", name: "现代风格" },
  { id: "miniavs", name: "迷你头像" },
  { id: "notionists", name: "艺术风格" },
  { id: "personas", name: "人物角色" },
  { id: "pixel-art", name: "像素艺术" },
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number]["id"];

/**
 * Generate DiceBear avatar URL
 * @param style - Avatar style ID from AVATAR_STYLES
 * @param seed - Deterministic seed (e.g., username or user ID)
 * @param size - Avatar size in pixels (default: 128)
 * @returns Public URL to DiceBear avatar image
 */
export function getDiceBearUrl(
  style: string = "adventurer",
  seed: string = "default",
  size: number = 128
): string {
  const baseUrl = "https://api.dicebear.com/7.x";
  // Validate style exists
  const validStyle = AVATAR_STYLES.some((s) => s.id === style) ? style : "adventurer";
  // URL encode seed
  const encodedSeed = encodeURIComponent(seed);
  // Build query params for consistent randomization
  const params = new URLSearchParams({
    seed: encodedSeed,
    size: size.toString(),
    scale: "80",
    radius: "50",
  });
  return `${baseUrl}/${validStyle}/svg?${params.toString()}`;
}

/**
 * Get preview URLs for all avatar styles
 * @param seed - Avatar seed for consistency across styles
 * @param size - Avatar size in pixels
 * @returns Array of style previews with URL and metadata
 */
export function getAllStylePreviews(
  seed: string = "default",
  size: number = 80
) {
  return AVATAR_STYLES.map((style) => ({
    id: style.id,
    name: style.name,
    url: getDiceBearUrl(style.id, seed, size),
  }));
}

/**
 * Validate if a style ID is valid
 */
export function isValidAvatarStyle(styleId: string): styleId is AvatarStyle {
  return AVATAR_STYLES.some((s) => s.id === styleId);
}

/**
 * Parse avatar seed format: "style:seed"
 * Returns [style, seed] or [defaultStyle, seed] if format is invalid
 */
export function parseAvatarSeed(
  avatarSeed: string
): [AvatarStyle, string] {
  if (!avatarSeed || !avatarSeed.includes(":")) {
    return ["adventurer", avatarSeed || "default"];
  }

  const [style, seed] = avatarSeed.split(":", 2);
  if (isValidAvatarStyle(style)) {
    return [style, seed];
  }
  return ["adventurer", avatarSeed];
}

/**
 * Format avatar seed as "style:seed"
 */
export function formatAvatarSeed(style: string, seed: string): string {
  return `${style}:${seed}`;
}
