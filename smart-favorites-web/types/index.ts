// Core data types
export interface Bookmark {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description?: string;
  description_zh?: string;
  description_en?: string;
  description_metadata?: Record<string, any> | null;
  tags?: string[];
  folder_path?: string;
  snapshot_url?: string | null;
  snapshot_storage_path?: string | null;
  snapshot_taken_at?: string | null;
  snapshot_status?: "pending" | "capturing" | "ready" | "failed" | "unavailable";
  snapshot_error?: string | null;
  snapshot_metadata?: Record<string, any> | null;
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
  description_zh?: string;
  description_en?: string;
  description_metadata?: Record<string, any> | null;
  language?: string;
  stars: number;
  forks: number;
  updated: string;
  embedding?: number[];
  source_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: "pending" | "processing" | "completed" | "failed";
  storage_path: string;
  metadata?: Record<string, any> | null;
  processing_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  permissions: string[];
  enabled: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiAuditLogRecord {
  id: string;
  user_id: string;
  api_key_id: string | null;
  tool_name: string;
  action: string;
  request_meta: Record<string, any>;
  response_meta: Record<string, any>;
  status_code: number | null;
  created_at: string;
}

export interface DocumentChunkRecord {
  id?: string;
  document_id: string;
  user_id: string;
  content: string;
  content_hash: string;
  chunk_index: number;
  page_number?: number | null;
  section_title?: string | null;
  char_start_pos?: number | null;
  char_end_pos?: number | null;
  embedding: number[];
  char_count?: number | null;
  estimated_token_count?: number | null;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatRoutingMetadata {
  mode: "chat" | "knowledge";
  useKnowledge: boolean;
  reason: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SearchResult[];
  routing?: ChatRoutingMetadata;
  timestamp: string;
}

// Search and RAG types
export interface SearchResult {
  type: "bookmark" | "star" | "document";
  id: string;
  similarity: number;
  bookmark?: Bookmark;
  star?: GitHubStar;
  document?: {
    id: string;
    document_id: string;
    user_id: string;
    title: string;
    file_name?: string | null;
    content: string;
    page_number?: number | null;
    section_title?: string | null;
  };
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
export type LLMProvider = string;

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

export type ToolCategory =
  | "search"
  | "documents"
  | "bookmarks"
  | "analytics"
  | "annotations";

export type ToolPermission =
  | "knowledge:read"
  | "knowledge:write"
  | "documents:read"
  | "documents:write"
  | "bookmarks:write"
  | "stats:read"
  | "tools:manage"
  | "*";

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  permissions: ToolPermission[];
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
}

export interface ToolExecutionContext {
  userId: string;
  authType: "session" | "api_key";
  apiKeyId?: string;
  permissions: string[];
}

export interface ToolExecutionResult {
  output: Record<string, any>;
  metadata: Record<string, any>;
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

// Square (广场) types
export type SquareTargetType = "bookmark" | "star" | "general";

export type SquarePostMedia = {
  id: string;
  post_id: string;
  url: string;
  storage_path: string;
  media_type: "image" | "video";
  sort_order: number;
  created_at: string;
};

export type SquarePostCreateInput = {
  title: string;
  content: string;
  rating?: number | null;
  target_type?: SquareTargetType | null;
  target_id?: string | null;
  target_url?: string | null;
};

export type SquarePostUpdateInput = Partial<SquarePostCreateInput>;

export type SquareFeedStats = {
  total_posts: number;
  total_media: number;
  active_authors: number;
  latest_post_at: string | null;
  helpful_votes: number;
  not_helpful_votes: number;
  posts_by_type: Record<SquareTargetType, number>;
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
  target_type: SquareTargetType | null;
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
