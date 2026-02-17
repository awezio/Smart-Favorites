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
  type: "bookmark" | "star";
  id: string;
  similarity: number;
  bookmark?: Bookmark;
  star?: GitHubStar;
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
