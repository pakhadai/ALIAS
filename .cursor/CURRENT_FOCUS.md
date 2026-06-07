# Current Focus — Alias Master

**Last updated:** 2026-06-07  
**Active branch:** (local — not verified)

## What's in progress

**Session 4+ complete** — audit closed, bundle lazy split (main 306 KB), D-4 TMA hooks extracted.

## What was just completed

- **Commit:** sessions 2–4 steward + strict TS + effects audit + bundle split (local, no push)
- **Bundle (C-1):** lazy routes — `main` 306.5 KB / 93.94 KB gzip (was 500 KB)
- **D-4 partial:** `useTelegramLobbyDeepLink`, `useTelegramBackButton` extracted from App.tsx
- **Tests:** typecheck 0; server 208/208; client 20/20

## Next steps (in order)

1. [ ] Push when ready (`git push`)
2. [ ] E2E `@smoke` — requires Docker Desktop + `docker compose up -d postgres redis`
3. [ ] Deferred D-4 (socket io lifecycle, GameContext URL bootstrap, useAuth) — separate PR if needed

## Known issues / blockers

- E2E blocked locally: Docker Desktop not running
- `RulesScreen` stays in main chunk (shared with `RulesModal` in MenuScreen)

## Context for next session

Read this file + `AUDIT_RESULTS.md`. **Open audit issues: 0.**
