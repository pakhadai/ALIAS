# Lobby Team Builder (2026-04-09)

## Goal

Move team formation into `LobbyScreen` so players don’t need a separate “team setup” screen, and add a host-friendly OFFLINE assignment flow.

Key UX goals:
- **Unassigned pool**: players join first, then pick a team.
- **Self-select teams** (ONLINE): tap **Join/Leave** on a team card.
- **Host controls**: shuffle, lock/unlock team switching, rename teams.
- **OFFLINE host assignment**: tap any player chip → bottom sheet → assign/unassign.
- **Start validation**: host can start only when all players are assigned and every team has at least one player.

---

## High-level flow

### ONLINE
- Server maintains `teams` array with **team shells** (empty teams are preserved in lobby states).
- Players can `TEAM_JOIN` / `TEAM_LEAVE` themselves unless `teamsLocked === true` (host can still edit).
- Host can:
  - rename teams (`TEAM_RENAME`)
  - lock/unlock switching (`TEAM_LOCK`)
  - shuffle unassigned (`TEAM_SHUFFLE_UNASSIGNED`)
  - shuffle all (`TEAM_SHUFFLE_ALL`, with confirmation UI on client)

### OFFLINE (single device)
- Everything runs locally in `GameContext` offline branch.
- Host can assign **any player** using `playerId` in actions:
  - `TEAM_JOIN` with `{ teamId, playerId }`
  - `TEAM_LEAVE` with `{ playerId }` (unassign)

---

## Network / Shared actions

### `TEAM_JOIN`
```ts
{ action: 'TEAM_JOIN', data: { teamId: string; playerId?: string } }
```
- If `playerId` is omitted → the **actor** joins the team (normal ONLINE self-join).
- If `playerId` is present → **host-only** assignment (used for OFFLINE and can be used for host tools later).

### `TEAM_LEAVE`
```ts
{ action: 'TEAM_LEAVE', data?: { playerId?: string } }
```
- No `data` → actor leaves all teams.
- With `playerId` → **host-only** unassign.

### `TEAM_RENAME`
```ts
{ action: 'TEAM_RENAME', data: { teamId: string; name: string } }
```

### `TEAM_LOCK`
```ts
{ action: 'TEAM_LOCK', data: { locked: boolean } }
```

### Shuffle actions
```ts
{ action: 'TEAM_SHUFFLE_UNASSIGNED' }
{ action: 'TEAM_SHUFFLE_ALL' }
```

---

## Server-side validation & auth

### Validation
`packages/server/src/validation/schemas.ts`
- Validates `TEAM_JOIN.data.teamId`
- Optionally validates `TEAM_JOIN.data.playerId` as UUID
- Accepts `TEAM_LEAVE` with no data or `{ playerId?: uuid }`

### Authorization
`packages/server/src/game/authorizeGameAction.ts`
- Host-only: `TEAM_SHUFFLE_*`, `TEAM_LOCK`, `TEAM_RENAME` (and other host actions)
- If `teamsLocked` and not host → deny `TEAM_JOIN` / `TEAM_LEAVE`
- If `TEAM_JOIN` includes `playerId` → host-only
- If `TEAM_LEAVE` includes `playerId` → host-only

### Engine handling
`packages/server/src/services/GameEngine.ts`
- Ensures team shells exist for the configured `teamCount`
- `TEAM_JOIN`:
  - if `playerId` provided → assigns that player
  - else → assigns sender
- `TEAM_LEAVE`:
  - if `playerId` provided → unassigns that player
  - else → unassigns sender

---

## Client-side implementation notes

### Lobby UI (team builder)
`packages/client/src/screens/lobby/LobbyScreen.tsx`
- Shows:
  - online lobby intro (room code + share/qr + parameters card)
  - players list
  - team builder section:
    - unassigned pool
    - team cards with join/leave and overfill hint
  - shuffle all confirmation modal
  - start game validation (disabled with reason)

### OFFLINE assign bottom sheet
- Tap a player chip (OFFLINE host) → `AssignPlayerSheet`
- Actions:
  - “Assign to team” → `TEAM_JOIN` with `playerId`
  - “Make unassigned” → `TEAM_LEAVE` with `playerId`

---

## Refactor: `LobbyScreen` split into components

To keep maintenance reasonable, `LobbyScreen` was split into focused components:
- `packages/client/src/screens/lobby/components/OnlineLobbyIntro.tsx`
- `packages/client/src/screens/lobby/components/PlayersSection.tsx`
- `packages/client/src/screens/lobby/components/UnassignedPool.tsx`
- `packages/client/src/screens/lobby/components/TeamCard.tsx`
- `packages/client/src/screens/lobby/components/AssignPlayerSheet.tsx`

The goal of this refactor was **behavioral equivalence** with better readability and safer iteration.

---

## Quick test checklist
- ONLINE:
  - Join/leave teams works for non-host when unlocked
  - Lock teams blocks non-host switching
  - Shuffle unassigned affects only unassigned
  - Shuffle all reassigns everyone (confirmation shown)
  - Start game disabled until valid
- OFFLINE:
  - Tap a chip opens assign bottom sheet
  - Assign/unassign works for any player
  - Rename team works inline

