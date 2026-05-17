# Release Checklist

## Local Gate

- [ ] `npm run test:phase4`
- [ ] `npm run test:phase5`
- [ ] `npm run benchmark:phase5`
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`

## Deployment Gate

- [ ] Supabase migrations applied.
- [ ] Supabase Storage buckets verified.
- [ ] Vercel environment variables configured.
- [ ] Browser extension token flow verified.
- [ ] Production `/api/health` returns healthy status.

## External Release

This is the external release gate.

These require account access and should be completed by the maintainer:

- [ ] Create or verify GitHub organization.
- [ ] Publish NPM packages.
- [ ] Publish release notes.
- [ ] Record and publish demo video.
- [ ] Submit community announcements.
- [ ] Monitor support channels after launch.
