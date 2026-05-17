# Tool Integration Guide

Smart Favorites exposes knowledge-base actions as HTTP tools for external AI apps. Use an API key created in the dashboard and send it as:

```http
Authorization: Bearer sfk_xxxx_secret
```

## OpenAI

Use `GET /api/tools` to build function definitions. Each tool maps to a function with `name`, `description`, and `parameters`.

```ts
const tools = await fetch(`${baseUrl}/api/tools`, {
  headers: { Authorization: `Bearer ${apiKey}` },
}).then((res) => res.json());

const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages,
  tools: tools.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  })),
});
```

When OpenAI requests a tool call, execute it:

```ts
await fetch(`${baseUrl}/api/tools/search_knowledge`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ input: { query: "RAG", top_k: 5 } }),
});
```

## Claude

Claude tool use expects `input_schema`, which matches the Smart Favorites tool schema directly.

```ts
const claudeTools = tools.tools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.input_schema,
}));
```

## DeepSeek

DeepSeek follows the OpenAI-compatible function format. Use the same schema conversion as OpenAI and call `/api/tools/{tool}` with the selected input.

## LangChain

Wrap each Smart Favorites tool in a LangChain `DynamicStructuredTool` and forward calls to the HTTP execution endpoint.

```ts
const searchKnowledge = new DynamicStructuredTool({
  name: "search_knowledge",
  description: "Search the user's Smart Favorites knowledge base",
  schema,
  func: async (input) => {
    const response = await fetch(`${baseUrl}/api/tools/search_knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input }),
    });
    return JSON.stringify(await response.json());
  },
});
```

## Permissions

Create narrow API keys for each integration. Common permissions:

- `knowledge:read`: search and semantic query tools.
- `documents:read`: document listing and retrieval.
- `documents:write`: annotation tools.
- `bookmarks:write`: bookmark creation.
- `stats:read`: statistics tools.
