// Core data types
export interface Bookmark {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description?: string;
  folder_path?: string;
  add_date?: string;
  icon?: string;
  embedding?: number[];
  source_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubStar {
  id: string;
  user_id: string;
  owner: string;
  repo: string;
  url: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  updated: string;
  embedding?: number[];
  source_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SearchResult[];
  timestamp: string;
}

// Search and RAG types
export interface SearchResult {
  type: "bookmark" | "star" | "note";
  id: string;
  similarity: number;
  bookmark?: Bookmark;
  star?: GitHubStar;
  note?: Note;
}

export interface DiffResult<T> {
  added: T[];
  removed: T[];
  modified: Array<{
    old: T;
    new: T;
    change_type: "title" | "url" | "both" | "data";
  }>;
  unchanged_count: number;
}

// LLM Provider types
export type LLMProvider =
  | "openai"
  | "deepseek"
  | "kimi"
  | "qwen"
  | "claude"
  | "gemini"
  | "glm"
  | "ollama";

export interface AIConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Profile
export type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_seed: string | null;
  created_at: string;
  updated_at: string;
};

// Note type
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  source_url?: string | null;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

// Square (广场) types
export type SquarePostMedia = {
  id: string;
  post_id: string;
  url: string;
  media_type: "image" | "video";
  sort_order: number;
  created_at: string;
};

export type SquarePostVotes = {
  helpful_count: number;
  not_helpful_count: number;
  user_vote: boolean | null; // null = not voted, true = helpful, false = not helpful
};

export type SquarePost = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  rating: number | null;
  target_type: "bookmark" | "star" | "general" | null;
  target_id: string | null;
  target_url: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
    avatar_seed: string | null;
  };
  media?: SquarePostMedia[];
  votes?: SquarePostVotes;
};

export type SquarePostVote = {
  id: string;
  post_id: string;
  user_id: string;
  helpful: boolean;
  created_at: string;
};
