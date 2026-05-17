# Smart Favorites Docs

## Quick Start

Smart Favorites is a personal knowledge base built from browser bookmarks, GitHub Stars, uploaded documents, community Square posts, and HTTP tools for AI apps.

1. Enter the web app folder: `cd smart-favorites-web`.
2. Install dependencies: `npm install`.
3. Copy `smart-favorites-web/.env.local.example` to `.env.local`.
4. Create a Supabase project, enable the migrations in `smart-favorites-web/supabase/migrations`, and configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
5. Configure at least one AI provider key.
6. Run locally with `npm run dev` or deploy to Vercel after setting the same environment variables.

## Release Gate

Before publishing, run:

```bash
npm run test:phase4
npm run test:phase5
npm run lint
npx tsc --noEmit
npm run build
```

Use `docs/RELEASE_CHECKLIST.md` for the final Vercel, Supabase, extension, and external release checks.
