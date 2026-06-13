# Testing acceptance criteria (must-not-break)

> Product architecture and APIs: **[`README.md`](../README.md)**. This file lists **what tests must guard**.
> **План розширення (TEST-COV-001):** [`TEST_COVERAGE_EXPANSION_PROMPTS.md`](./TEST_COVERAGE_EXPANSION_PROMPTS.md).

This document defines **critical user flows** and **non-negotiable invariants** that our automated tests must cover.
The goal is to reduce real production risk (not to “game” coverage metrics).

## Baseline (2026-06-13, TEST-COV-001 ✅)

| Пакет | Тести | Coverage | CI |
|-------|-------|----------|-----|
| `@movli/server` | **402** | **75.63%** stmts (floor 67%) | `test:coverage` |
| `@movli/client` | **480** | 45.38%+ stmts (no floor) | `vitest run` |
| `@movli/shared` | **36** | pure utils + contracts | `vitest run` |
| `@movli/e2e` | 36 pass / 4 skip | — | `@smoke`, `@core`; `@extended` optional |

## Optional follow-ups (post epic)

| Flow / module | Status | Notes |
|---------------|--------|-------|
| Client vitest coverage floor | відкладено | окремий epic |
| QuizModeHandler / client utils | backlog | мікро A–B у `TEST_COVERAGE_EXPANSION_PROMPTS.md` |

## Core user flows

### Online game (happy path)
- **Menu → Create room**: user creates a room and becomes host.
- **Join room**: second player joins by code (via Join screen or URL param).
- **Lobby**:
  - Players list updates for join/leave.
  - Host can open settings and team setup.
- **Teams & settings**:
  - Host updates settings and all clients receive state sync.
  - Host starts game (teams exist, players distributed).
- **Round lifecycle**:
  - PRE_ROUND → COUNTDOWN → PLAYING → ROUND_SUMMARY → SCOREBOARD.
  - Correct/skip actions affect round stats and scoring.
  - Skip penalty (when enabled) affects points but never allows negative score.
- **Game over**:
  - Winner detection follows “last team finishes round” rule.
  - Rematch resets score but preserves teams.

### Multiplayer reliability
- **Reconnect grace**: a disconnected player can rejoin within grace and continues the session.
- **Host migration**: if host disconnects, a new host is assigned and host-only actions remain enforced.
- **Relay (multi-node)**:
  - Non-writer node forwards `room:join`, `room:leave`, `room:rejoin`, `game:action` to writer and handles timeouts/unavailable relay.
- **`room:exists`**: join screen can probe room code via Socket.IO ack without joining.

### Lobby & teams
- **Team builder** (`TEAM_JOIN`, `TEAM_LEAVE`, `TEAM_LOCK`, shuffle/rename): host and self-assign rules match server (`teamsLocked`, host assign with `playerId`).
- **Solo (`general.teamMode === 'SOLO'`)**: `START_GAME` produces one team per player (server **and** offline client); lobby UI hides team pool where applicable.
- **Lobby settings UX**: host opens in-lobby settings via **`lobby-settings-chips`** rules card (ONLINE + OFFLINE); header gear removed from `LobbyScreen` (2026-06-11).

### Offline game
- User can start offline game from Menu and play a complete match.
- Offline state transitions mirror server authoritative logic where applicable.
- **SOLO offline start:** `offlineGameActions` `START_GAME` must materialize teams before `PRE_ROUND` (regression: empty teams → «no players in team» on PreRound).

### IMPOSTER mode
- **Public state**: `imposterPhase`, `imposterPlayerId`, `revealedPlayerIds` sync via `game:state-sync`; **secret word is never** in that payload.
- **Per-player secret**: each client receives `imposter:secret` with `{ isImposter, word }` when appropriate; word persisted in Redis (`RedisRoomStore`) separately from room JSON.
- **Actions**: `IMPOSTER_READY` / `IMPOSTER_END_GAME` allowed per `authorizeGameAction`; game can progress through REVEAL → DISCUSSION → RESULTS.

### Auth & profile
- Anonymous token can be created (deviceId validation).
- Profile endpoints require JWT (`GET /me`, `PATCH /profile`, lobby settings).
- `PATCH /profile` strips HTML tags from `displayName`.
- Lobby settings persist only schema-validated JSON (`PUT /lobby-settings`).
- Telegram avatar sync (`POST /profile/sync-telegram-avatar`) requires JWT + valid initData HMAC for matching Telegram account.

### Store & purchases
- Store loads catalog.
- Checkout/payment endpoints require auth.
- Stripe webhook rejects invalid signatures (and does not crash the server).
- Stripe webhook `checkout.session.completed` / `payment_intent.succeeded` complete pending purchases; unknown event types are no-ops; duplicate webhook delivery is idempotent (`updateMany` count 0).
- Stripe webhook `checkout.session.expired` / `payment_intent.canceled` abandon pending purchases.
- Checkout returns 409 when item already purchased; free claim is idempotent.

### Admin
- Admin routes require IP whitelist (when configured) + JWT or `x-admin-key`.
- Word pack CRUD (create, read, update, delete, bulk add words).

### Custom decks
- Upload / create custom deck.
- Access deck by access code (only approved/public).

### Push
- Subscribe/unsubscribe flows.

## Invariants (logic contracts)
- **No process crash** from unhandled async route errors.
- **Authorization**:
  - Host-only actions are enforced.
  - Explainer-only actions are enforced when relevant.
  - Quiz `GUESS_OPTION` is allowed for any player, but only first correct answer scores.
  - IMPOSTER / team actions follow `authorizeGameAction` + `GameEngine` (not only `modes/` handlers).

| Invariant / flow | Guard test file |
|------------------|-----------------|
| Host-only / explainer / IMPOSTER / team lock / GUESS_OPTION authorize | `packages/server/src/game/__tests__/authorizeGameAction.test.ts` |
| IMPOSTER REVEAL→DISCUSSION→RESULTS, team builder, QUIZ scoring | `packages/server/src/services/__tests__/GameEngine.test.ts` |
| Reconnect grace, rejoin, host migration, Redis restore | `packages/server/src/services/__tests__/RoomManager.test.ts` |
| Store catalog + buy-stars auth/TMA | `packages/server/src/routes/__tests__/store.routes.test.ts` |
| Stripe checkout auth + webhook (signature, completed, idempotency, abandon, unknown events) | `packages/server/src/routes/__tests__/purchases.routes.test.ts` |
| Custom decks create/upload/access code | `packages/server/src/routes/__tests__/custom-decks.routes.test.ts` |
| Push vapid-key / subscribe / unsubscribe | `packages/server/src/routes/__tests__/push.routes.test.ts` |
| Admin IP whitelist + double auth gate + word pack CRUD | `packages/server/src/routes/__tests__/admin.routes.test.ts` |
| JWT expiry + Telegram initData HMAC | `packages/server/src/services/__tests__/AuthService.test.ts` |
| Auth REST (anonymous, /me, profile sanitize, lobby settings, sync-telegram-avatar, /telegram HMAC) | `packages/server/src/routes/__tests__/auth.routes.test.ts` |
| Lobby readiness (SOLO, min players, unassigned/empty team edge cases) | `packages/shared/src/__tests__/lobbyReadiness.test.ts` |
| `ROOM_ERROR_CODES` drift guard (incl. `RELAY_*`) | `packages/shared/src/__tests__/events.test.ts` |
| Legacy `NetworkMessage` envelope types | `packages/shared/src/__tests__/network.test.ts` |
| `room:exists` ack; grace `room:rejoin` / post-grace `PLAYER_NOT_IN_ROOM`; `ROOM_FULL`; duplicate names; host migration; `hostUserId` on auth create; relay `RELAY_*` | `packages/server/src/handlers/__tests__/socketHandlers.int.test.ts` |
| Socket NOT_HOST / NOT_EXPLAINER / INVALID_STATE / LOBBY_NOT_READY | `packages/server/src/handlers/__tests__/socketHandlers.int.test.ts` |
| `game:action` pipeline broadcast + KICK + IMPOSTER per-player secret | `packages/server/src/game/__tests__/gameActionPipeline.test.ts` |
| Cross-node relay timeout, publish unavailable, join/leave/rejoin reply dispatch | `packages/server/src/services/__tests__/RoomActionRelay.test.ts` |
| Offline START_GAME/CORRECT/SKIP/teams/MAX_PLAYERS/SOLO team materialize | `packages/client/src/context/offlineGameActions.test.ts` |
| GameFlow round lifecycle smoke (explainer/guesser, host CTA, IMPOSTER phase labels) | `packages/client/src/screens/GameFlow/screens/*.test.tsx` |
| App `GameRouter` state → screen mapping (≥8 states, lazy routes) | `packages/client/src/App.test.tsx` |
| In-game `GameFlow` router (CLASSIC vs IMPOSTER mode branches) | `packages/client/src/screens/GameFlow.test.tsx` |
| Lobby rules card + offline/online settings entry | `packages/client/src/screens/lobby/components/LobbyRulesSummaryCard.test.tsx`, `LobbyScreen.test.tsx`, `OnlineLobbyIntro.test.tsx` |
| GameContext state-sync apply + client nav guard + offline routing + `?room=` deep link | `packages/client/src/context/GameContext.test.tsx` |
| Session restore edge cases (COUNTDOWN, ROUND_SUMMARY, corrupt JSON) | `packages/client/src/context/gameReducer.test.ts` |
| TMA Stars `openInvoice` paid/cancelled callbacks | `packages/client/src/components/Store/QuickBuyModal.test.tsx` |
| Profile menu: guest login CTA, lobby-settings gate, auth stats + settings nav | `packages/client/src/screens/menu/ProfileScreen.test.tsx` |
| Store catalog render, guest buy gate, QuickBuy modal open | `packages/client/src/screens/menu/StoreScreen.test.tsx` |
| My word packs: locked gate + unlocked list/create | `packages/client/src/screens/menu/MyWordPacksScreen.test.tsx` |
| Client REST: `fetchProfile`, `saveLobbySettings`, `buyWithStars` error paths + auth header | `packages/client/src/services/api.test.ts` |
| In-lobby settings: host `UPDATE_SETTINGS` dispatch, guest read-only, save → LOBBY | `packages/client/src/screens/lobby/SettingsScreen.test.tsx` |
| `shuffleArray`, `getTeamColor`, shared limits/constants | `packages/shared/src/__tests__/utils.test.ts` |
| E2E smoke: create → join → CORRECT → ROUND_SUMMARY | `packages/e2e/tests/smoke-round.spec.ts` |
| E2E core: host migration, team lock, IMPOSTER secret, offline SCOREBOARD, rematch | `packages/e2e/tests/core-acceptance.spec.ts` |
| E2E extended: profile settings save, store QuickBuy sheet, guest buy gate | `packages/e2e/tests/extended-profile.spec.ts`, `extended-store.spec.ts` (`@extended`, optional CI) |

**Запуск `@extended` (не в CI за замовчуванням):** `pnpm --filter @movli/e2e run test:extended`  
Локально E2E використовує порти **3002/5175** (щоб не конфліктувати з Docker `alias-app` на 3001/5173); CI лишає **3001/5173**.
- **State sync**: server is authoritative; clients apply full sync without merging corrupt state.
- **Input sanitization**: player names are sanitized (no HTML), trimmed, length-limited.

## Where tests live (by type)
- **Server unit/contract/integration (Vitest)**: `packages/server/src/**/__tests__/*`
- **Client unit/integration (Vitest + Testing Library)**: `packages/client/src/**/*.test.ts(x)`
- **E2E (Playwright)**: `packages/e2e/tests/*.spec.ts`

