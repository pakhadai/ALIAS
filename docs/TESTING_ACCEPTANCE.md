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
- **Solo (`general.teamMode === 'SOLO'`)**: `START_GAME` produces one team per player; lobby UI hides team pool where applicable.

### IMPOSTER mode
- **Public state**: `imposterPhase`, `imposterPlayerId`, `revealedPlayerIds` sync via `game:state-sync`; **secret word is never** in that payload.
- **Per-player secret**: each client receives `imposter:secret` with `{ isImposter, word }` when appropriate; word persisted in Redis (`RedisRoomStore`) separately from room JSON.
- **Actions**: `IMPOSTER_READY` / `IMPOSTER_END_GAME` allowed per `authorizeGameAction`; game can progress through REVEAL → DISCUSSION → RESULTS.

### Offline game
- User can start offline game from Menu and play a complete match.
- Offline state transitions mirror server authoritative logic where applicable.

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
- **State sync**: server is authoritative; clients apply full sync without merging corrupt state.
- **Input sanitization**: player names are sanitized (no HTML), trimmed, length-limited.

## Where tests live (by type)
- **Server unit/contract/integration (Vitest)**: `packages/server/src/**/__tests__/*`
- **Client unit/integration (Vitest + Testing Library)**: `packages/client/src/**/*.test.ts(x)`
- **E2E (Playwright)**: `packages/e2e/tests/*.spec.ts`

