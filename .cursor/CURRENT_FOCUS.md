# Current Focus — Alias Master

**Last updated:** 2026-06-07  
**Active branch:** `main` (uncommitted E2E hardening + offline TEAM_JOIN fix)

## What's in progress

E2E hardening після offline TEAM_JOIN fix — локально закомічено; push лише на явний запит.

## What was just completed

- **Offline TEAM_JOIN:** `materializeOfflineTeamsIfNeeded()` — TEAM_JOIN/LEAVE/shuffle/rename при `teams: []`
- **E2E helpers:** `expectLobbyReadyToStart`, `settings-close` testid, multilingual locators (`joinTeamRe`, `lockTeamsRe`, anchored `startGameRe`, `imposter-reveal-cta`)
- **Client i18n:** `teamJoin`/`teamLeave`, `lockTeams`/`unlockTeams`, `imposterTapToFlip`; Settings rules tab → `rulesTitle`
- **Specs:** `core-acceptance.spec.ts`, `multiplayer.spec.ts` → shared helpers; locator regression tests (8 cases)
- **Verify:** `pnpm typecheck` green; client offlineGameActions 12/12; locator tests 8/8

## Next steps

1. [ ] Push — лише на явний запит власника
2. [ ] E2E CI: `@smoke` + `@core` on chromium + mobile-chrome (Postgres у CI)
3. [ ] E2E local (optional): `docker compose up -d postgres redis` → `pnpm test:e2e`

## Known issues / blockers

- E2E локально потребує Postgres на `:5432` (Docker Desktop не запущений на dev machine)
- Post test-gap backlog (optional): routes ~18–40%, `socketHandlers` ~48% — див. `AGENT_BRIEF.md`

## Context for next session

Оперативний знімок → `AGENT_BRIEF.md`. Audit → `AUDIT_RESULTS.md` (0 open issues). Commit message: `fix(e2e): materialize offline teams and harden lobby helpers`.
