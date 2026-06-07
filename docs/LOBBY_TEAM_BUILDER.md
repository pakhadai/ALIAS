# Lobby Team Builder

> Канонічний опис стеку та сокетів — **[`README.md`](../README.md)**. Цей файл — **UX лобі та команд** (team builder, Solo).  
> **Оновлено:** 2026-06-07 (Phase 3 + play format bar animation).

## UI: два екрани, одна логіка

| Режим / стан | Екран | Коли |
|--------------|-------|------|
| **ONLINE** (типовий шлях) | `LobbyScreen` — inline team builder | `GameState.LOBBY`: unassigned pool, team cards, lock/shuffle, start validation |
| **OFFLINE** або `GameState.TEAMS` | `TeamSetupScreen` | Офлайн: host tap-to-assign. Онлайн: лише якщо сервер синхронізував `gameState: TEAMS` (напр. після `GENERATE_TEAMS`) |

**Не плутати:** онлайн-гра **не вимагає** окремого екрану команд — гравці збирають команди прямо в лобі. `TeamSetupScreen` — головним чином **офлайн** (один пристрій, host перетягує гравців між командами).

---

## UX goals

- **Unassigned pool**: гравці спочатку в пулі, потім обирають команду (ONLINE self-join).
- **Self-select teams** (ONLINE): **Join/Leave** на картці команди (якщо не `teamsLocked`).
- **Host controls**: shuffle, lock/unlock, rename teams.
- **OFFLINE host assignment**: tap player chip → bottom sheet → assign/unassign (`TeamSetupScreen` або sheet у лобі).
- **Start validation**: host стартує лише коли всі розподілені і кожна команда має ≥1 гравця.
- **Play format (Teams/Solo):** `LobbyPlayModeBar` — host керує форматом; **online guest** бачить блок до вибору команди, потім `LobbyPlayModeBarSlot` ховає його з анімацією (host завжди бачить).

### Team mode: **Solo** (`general.teamMode === 'SOLO'`)

- **Lobby UI**: team builder **прихований** у Solo (`LobbyScreen`).
- **Settings**: перемикач Teams / Solo; слайдер `teamCount` вимкнено в Solo.
- **Server `START_GAME`**: одна «команда» на гравця (semantically FFA).
- **Model**: `teamMode?: 'TEAMS' | 'SOLO'` у `GeneralSettings` (`packages/shared/src/models.ts`), default `TEAMS`.

---

## High-level flow

### ONLINE (`GameState.LOBBY`)

- Inline builder у `packages/client/src/screens/lobby/LobbyScreen.tsx` + `screens/lobby/components/*`.
- **ONLINE player list:** компактний `LobbyAvatarStrip` (аватар + online dot); повний `PlayersSection` лише в **OFFLINE**.
- Server тримає `teams` з team shells (порожні команди збережені в лобі).
- `TEAM_JOIN` / `TEAM_LEAVE` для self-join, якщо `teamsLocked !== true`.
- Host: `TEAM_RENAME`, `TEAM_LOCK`, `TEAM_SHUFFLE_UNASSIGNED`, `TEAM_SHUFFLE_ALL`.

### OFFLINE / `GameState.TEAMS`

- Логіка в `GameContext` → `offlineGameActions.ts`.
- `TeamSetupScreen`: host-only edit (`canEdit = isHost && gameMode === 'OFFLINE'`).
- Host assign через `playerId` у actions:
  - `TEAM_JOIN` `{ teamId, playerId }`
  - `TEAM_LEAVE` `{ playerId }`
- `GENERATE_TEAMS` (shuffle) → локально або на сервері → `GameState.TEAMS`.

---

## Network / Shared actions

### `TEAM_JOIN`
```ts
{ action: 'TEAM_JOIN', data: { teamId: string; playerId?: string } }
```
- Без `playerId` → actor joins (ONLINE self-join).
- З `playerId` → **host-only** (OFFLINE assign).

### `TEAM_LEAVE`
```ts
{ action: 'TEAM_LEAVE', data?: { playerId?: string } }
```

### `TEAM_RENAME`, `TEAM_LOCK`, shuffle actions

Див. `packages/shared/src/actions.ts` та `authorizeGameAction.ts`.

---

## Server-side validation & auth

- **Validation:** `packages/server/src/validation/schemas.ts`
- **Authorization:** `packages/server/src/game/authorizeGameAction.ts` — host-only shuffle/lock/rename; `teamsLocked` блокує self-switch.
- **Engine:** `packages/server/src/services/GameEngine.ts` — `ensureTeamShells`, Solo layout на `START_GAME`, обробка team actions.

---

## Client components

| Компонент | Роль |
|-----------|------|
| `LobbyScreen.tsx` | ONLINE inline builder + start |
| `TeamSetupScreen.tsx` | OFFLINE / `TEAMS` state — assign + shuffle + start |
| `components/OnlineLobbyIntro.tsx` | Room code, invite trigger, settings chips |
| `components/LobbyInviteSheet.tsx` | Telegram-native invite options (copy code/link, TG share, nested QR) |
| `components/LobbyPlayModeBar.tsx`, `LobbyPlayModeBarSlot.tsx` | Solo/Teams + team count; animated collapse for guests after team pick |
| `components/UnassignedPool.tsx`, `TeamCard.tsx`, `AssignPlayerSheet.tsx` | Subcomponents |
| `components/LobbyReadinessBar.tsx`, `deriveLobbyReadiness.ts` | Host start checklist above CTA (Phase 2) |
| `components/LobbyGuestWaitingCard.tsx` | Online guest next-step card (Phase 2) |

---

## Quick test checklist

- **ONLINE:** join/leave, lock, shuffle, start validation, Solo без team UI; guest play-format bar hide after team join.
- **OFFLINE:** chip → assign sheet, rename, `GENERATE_TEAMS` → `TEAMS`, start when valid.

Детальні критерії — [`TESTING_ACCEPTANCE.md`](./TESTING_ACCEPTANCE.md).
