# Troubleshooting

## Supabase

- Confirm all migrations in `smart-favorites-web/supabase/migrations` have run.
- Verify pgvector is enabled before semantic search functions are used.
- Check Row Level Security policies if authenticated users see empty results.

## Vercel

- Ensure all `.env.local.example` variables are configured in the Vercel project.
- Rebuild after changing environment variables.
- Check function logs for route-handler errors.

## Browser Extension

- Generate a fresh extension token in the web dashboard.
- Paste the token into the extension settings.
- Confirm the extension backend URL points at the deployed web app.

## API Keys

- Use `Authorization: Bearer sfk_xxxx_secret`.
- Create narrow permissions for each integration.
- Rotate disabled or leaked keys from the settings page.
