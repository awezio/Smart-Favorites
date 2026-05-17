# Architecture

Smart Favorites has four runtime surfaces:

- `smart-favorites-web`: Next.js 15 App Router application for dashboard UI and API routes.
- Supabase: PostgreSQL, pgvector, authentication, Row Level Security, and private Storage buckets.
- Browser extension: Manifest V3 side panel that syncs bookmarks through the web API using an extension token.
- Optional local backend: FastAPI service kept for self-hosted and legacy workflows.

## Data Flow

Bookmarks, GitHub Stars, and documents are owned by a Supabase user. Documents are uploaded to Supabase Storage, recorded in `documents`, parsed into chunks, and searched with the rest of the knowledge base. pgvector powers semantic retrieval, while keyword filtering provides exact fallback behavior.

## API Boundary

Next.js route handlers expose authenticated user APIs and API-key based tool APIs. The tool registry validates input schema, checks permissions, executes the operation, and records audit metadata.

## Deployment

Vercel hosts the Next.js app. Supabase remains the source of truth for data, auth, Storage, and pgvector functions. Static assets are served through Vercel's CDN.
