---
name: alias-master
description: Alias Master monorepo — GameMode, Socket.IO contracts, Prisma, shared-first changes, and verification checklists. Use when editing packages/shared, server game logic, client GameContext, or project docs.
---

# Alias Master — skill

Monorepo: `@alias/shared`, `@alias/server`, `@alias/client`, `@alias/e2e`.

**Docs:** [`AGENTS.md`](../../../AGENTS.md), [`docs/INDEX.md`](../../../docs/INDEX.md). **Steward:** `@alias-steward`.

## Shared-first checklist

When changing behavior visible to clients:

1. `packages/shared/src/events.ts` — event names & payloads
2. `packages/shared/src/actions.ts` — `GameActionType` / payloads
3. `packages/shared/src/models.ts` — `GameSettings`, `GameSyncState` fields
4. `packages/shared/src/enums.ts` — `GameState`, `GameMode`
5. `pnpm build:shared` then server + client typecheck

## GameMode map (server)

| Mode | Handler / notes |
|------|-----------------|
| CLASSIC, SYNONYMS | `ClassicModeHandler`; SYNONYMS → Classic factory |
| TRANSLATION | `TranslationModeHandler` |
| QUIZ | `QuizModeHandler` |
| HARDCORE | `HardcoreModeHandler` |
| IMPOSTER | `GameEngine` + `imposter:secret`; Redis `saveImposterWord` |

Explainer CORRECT/SKIP: `modes/explainerModeActions.ts` (`reduceExplainerAction`).

## Socket.IO (canonical names)

Room: `room:create`, `room:exists`, `room:join`, `room:leave`, `room:rejoin`, `game:action`, `game:state-sync`, `imposter:secret`, `room:error`.

Definitions: `packages/shared/src/events.ts`. Handlers: `packages/server/src/handlers/socketHandlers.ts`.

## Server pipeline

`game:action` → Zod (`validation/schemas.ts`) → `authorizeGameAction` → `gameActionPipeline` / `GameEngine` → broadcast `game:state-sync`.

Reconnect grace: `RECONNECT_GRACE_MS = 60_000` in `packages/server/src/index.ts`.

## Client

- State machine: `GameState` in `App.tsx` / screens
- Socket: `hooks/useSocketConnection.ts`
- Reducer: `context/GameContext.tsx` — full sync, no merge

## Prisma

- Schema: `packages/server/prisma/schema.prisma`
- Local migrate: `pnpm --filter @alias/server db:migrate` (**migrate dev**)
- Prod: `migrate deploy` in Docker/CI only
- Seed/data formats: `docs/PRISMA_WORD_DATA.md`

## Tests

- Server Vitest: `packages/server/src/**/__tests__/**`
- Client Vitest: `packages/client/src/**/*.test.ts(x)`
- E2E: `packages/e2e` — tags `@smoke`, `@core`
- Invariants: `docs/TESTING_ACCEPTANCE.md`

## Verify

```bash
pnpm verify
pnpm build:shared   # after shared edits
```

## Doc touch matrix

| Change | Update |
|--------|--------|
| New event / sync field | README (protocol) + maybe TESTING_ACCEPTANCE |
| Lobby/teams | `docs/LOBBY_TEAM_BUILDER.md` |
| Word/seed | `docs/PRISMA_WORD_DATA.md` |
| package.json / CI | `PROJECT_STATE.md` + date |
| Session done | `docs/daily/YYYY-MM-DD.md` |

Do not duplicate ECC content — see `.cursor/AGENTS.md`.
