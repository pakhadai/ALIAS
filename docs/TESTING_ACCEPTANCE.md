# Testing acceptance criteria (must-not-break)

> Product architecture and APIs: **[`README.md`](../README.md)**. This file lists **what tests must guard**.

This document defines **critical user flows** and **non-negotiable invariants** that our automated tests must cover.
The goal is to reduce real production risk (not to “game” coverage metrics).

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
- Profile endpoints require JWT.
- Lobby settings persist only validated fields (schema-validated JSON).

### Store & purchases
- Store loads catalog.
- Checkout/payment endpoints require auth.
- Stripe webhook rejects invalid signatures (and does not crash the server).

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
| Stripe checkout auth + webhook signature | `packages/server/src/routes/__tests__/purchases.routes.test.ts` |
| Custom decks create/upload/access code | `packages/server/src/routes/__tests__/custom-decks.routes.test.ts` |
| Push vapid-key / subscribe / unsubscribe | `packages/server/src/routes/__tests__/push.routes.test.ts` |
| Admin IP whitelist + double auth gate | `packages/server/src/routes/__tests__/admin.routes.test.ts` |
| JWT expiry + Telegram initData HMAC | `packages/server/src/services/__tests__/AuthService.test.ts` |
| `room:exists` ack without join; grace `room:rejoin`; socket NOT_HOST / NOT_EXPLAINER | `packages/server/src/handlers/__tests__/socketHandlers.int.test.ts` |
| `game:action` pipeline broadcast + KICK + IMPOSTER per-player secret | `packages/server/src/game/__tests__/gameActionPipeline.test.ts` |
| Cross-node relay timeout, publish unavailable, join/leave/rejoin reply dispatch | `packages/server/src/services/__tests__/RoomActionRelay.test.ts` |
| Offline START_GAME/CORRECT/SKIP/teams/MAX_PLAYERS/SOLO team materialize | `packages/client/src/context/offlineGameActions.test.ts` |
| Lobby rules card + offline/online settings entry | `packages/client/src/screens/lobby/components/LobbyRulesSummaryCard.test.tsx`, `LobbyScreen.test.tsx`, `OnlineLobbyIntro.test.tsx` |
| GameContext state-sync apply + client nav guard + offline routing | `packages/client/src/context/GameContext.test.tsx` |
| Session restore edge cases (COUNTDOWN, ROUND_SUMMARY, corrupt JSON) | `packages/client/src/context/gameReducer.test.ts` |
| TMA Stars `openInvoice` paid/cancelled callbacks | `packages/client/src/components/Store/QuickBuyModal.test.tsx` |
| `shuffleArray`, `getTeamColor`, shared limits/constants | `packages/shared/src/__tests__/utils.test.ts` |
| E2E smoke: create → join → CORRECT → ROUND_SUMMARY | `packages/e2e/tests/smoke-round.spec.ts` |
| E2E core: host migration, team lock, IMPOSTER secret, offline SCOREBOARD, rematch | `packages/e2e/tests/core-acceptance.spec.ts` |
- **State sync**: server is authoritative; clients apply full sync without merging corrupt state.
- **Input sanitization**: player names are sanitized (no HTML), trimmed, length-limited.

## Where tests live (by type)
- **Server unit/contract/integration (Vitest)**: `packages/server/src/**/__tests__/*`
- **Client unit/integration (Vitest + Testing Library)**: `packages/client/src/**/*.test.ts(x)`
- **E2E (Playwright)**: `packages/e2e/tests/*.spec.ts`

