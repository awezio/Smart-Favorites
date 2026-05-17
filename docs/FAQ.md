# FAQ

## Which API key should external tools use?

Use a Smart Favorites API key created in the dashboard, not a provider API key. Provider keys are used by the server to call OpenAI, DeepSeek, Claude, Gemini, and other LLMs.

## How does the browser extension connect?

The browser extension uses the web app URL plus an extension token. Generate the token from settings, paste it into the extension, and then sync bookmarks.

## What is in the knowledge base?

The knowledge base can include bookmarks, GitHub Stars, uploaded documents, parsed document chunks, and metadata from Square or tool workflows.

## Can I deploy without Vercel?

Yes, but Vercel is the documented production path for the Next.js app. Any compatible Node.js host must provide the same environment variables and access to Supabase.
