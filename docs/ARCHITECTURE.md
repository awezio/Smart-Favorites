# Architecture

Smart Favorites has three active runtime surfaces:

- `smart-favorites-web`: Next.js 15 App Router application for dashboard UI and API routes.
- Supabase: PostgreSQL, pgvector, authentication, Row Level Security, and private Storage buckets.
- Browser extension: Manifest V3 side panel that syncs bookmarks through the web API using an extension token.

The old Python/FastAPI backend is deprecated and should not receive new RAG or knowledge-management work. New backend behavior lives in `smart-favorites-web/app/api`, with shared server logic under `smart-favorites-web/lib`.

## Data Flow

Bookmarks, GitHub Stars, and documents are owned by a Supabase user. Documents are uploaded to Supabase Storage, recorded in `documents`, parsed into chunks, and searched with the rest of the knowledge base. pgvector powers semantic retrieval, while keyword filtering provides exact fallback behavior. Long-term memory and portable knowledge management use SFKF, an OKF-inspired Markdown/YAML/folder format exposed through the `/api/knowledge/export` API.

## API Boundary

Next.js route handlers expose authenticated user APIs and API-key based tool APIs. The tool registry validates input schema, checks permissions, executes the operation, and records audit metadata.

## Deployment

Vercel hosts the Next.js app. Supabase remains the source of truth for data, auth, Storage, and pgvector functions. Static assets are served through Vercel's CDN.
