import type { SquareTargetType } from "@/types";

export const SQUARE_MEDIA_BUCKET = "square_media";

export const SQUARE_TARGET_OPTIONS: Array<{
  value: SquareTargetType;
  label: string;
  description: string;
}> = [
  { value: "general", label: "通用", description: "分享灵感、笔记或短评" },
  { value: "bookmark", label: "书签", description: "围绕你收藏的链接展开" },
  { value: "star", label: "Stars", description: "面向 GitHub 项目和工具" },
];

export const SQUARE_TARGET_LABELS: Record<SquareTargetType, string> = {
  bookmark: "书签",
  star: "Stars",
  general: "通用",
};

export const SQUARE_MEDIA_LABELS = {
  image: "图片",
  video: "视频",
} as const;

export function isSquareTargetType(value: unknown): value is SquareTargetType {
  return value === "bookmark" || value === "star" || value === "general";
}
