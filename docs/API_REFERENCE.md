# Smart Favorites API Reference

All user-facing routes require an authenticated Supabase session unless the section explicitly documents API-key authentication.

## Health

`GET /api/health`

Returns database connectivity, current model provider, bookmark count, star count, and timestamp. Use this as a production smoke check after Vercel deployment.

## Documents

`GET /api/documents`

Query parameters:

- `limit`: default `50`
- `offset`: default `0`

Response:

```json
{
  "documents": [],
  "count": 0
}
```

`POST /api/documents`

Accepts `multipart/form-data` with:

- `file`: PDF, DOCX, XLSX, XLS, TXT, Markdown, HTML, or HTM, up to 100 MB.
- `title`: optional document title.
- `tags`: optional repeated tag fields.

The file is stored in the private Supabase `documents` bucket and a pending document record is returned.

`GET /api/documents/{id}`

Returns one document owned by the current user.

`PATCH /api/documents/{id}`

Updates metadata fields such as title, status, and custom metadata.

`DELETE /api/documents/{id}`

Deletes the document record and associated chunks.

## Search

`POST /api/search`

```json
{
  "query": "vector database",
  "type": "all",
  "topK": 10,
  "threshold": 0.3
}
```

`type` can be `all`, `bookmarks`, or `stars`.

## Chat

`POST /api/chat`

```json
{
  "query": "What did I save about RAG?",
  "sessionId": "optional-session-id",
  "chatHistory": [],
  "provider": "deepseek",
  "model": "deepseek-chat"
}
```

Returns an answer, source list, and session id.

## Tool Discovery

`GET /api/tools`

Returns the tools available to the current session or API key. API-key callers only see tools allowed by their permissions.

```http
Authorization: Bearer sfk_xxxx_secret
```

Response:

```json
{
  "tools": [
    {
      "name": "search_knowledge",
      "description": "Search the personal knowledge base",
      "category": "search",
      "input_schema": {},
      "output_schema": {},
      "permissions": ["knowledge:read"]
    }
  ]
}
```

## Tool Execution

`POST /api/tools`

```json
{
  "tool": "search_knowledge",
  "input": {
    "query": "vector database",
    "top_k": 10
  }
}
```

`POST /api/tools/{tool_name}`

```json
{
  "input": {
    "query": "vector database",
    "top_k": 10
  }
}
```

Response:

```json
{
  "output": {
    "results": []
  },
  "metadata": {
    "execution_time_ms": 120
  }
}
```

Every tool execution writes an audit entry with the user, API key, tool name, status code, and response metadata.

## API Keys

`GET /api/keys`

Lists the current user's API keys. Full key material is only returned when the key is created.

`POST /api/keys`

```json
{
  "name": "LangChain local agent",
  "permissions": ["knowledge:read", "documents:read"],
  "expires_at": null
}
```

`PATCH /api/keys/{id}`

Updates name, permissions, enabled state, or expiry.

`DELETE /api/keys/{id}`

Deletes an API key.

## Browser Extension Token

`GET /api/settings/extension-token`

Returns whether the user has an extension token and a masked preview.

`POST /api/settings/extension-token`

Generates a new extension token. The full token is returned once and should be pasted into the browser extension.
