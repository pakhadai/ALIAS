# Lobby Team Builder

> Канонічний опис стеку та сокетів — **[`README.md`](../README.md)**. Цей файл — **UX лобі та команд** (team builder, Solo).  
> **Оновлено:** 2026-06-11 (offline lobby parity: rules card + START_GAME SOLO teams).

## UI: два екрани, одна логіка

| Режим / стан | Екран | Коли |
|--------------|-------|------|
| **ONLINE** (типовий шлях) | `LobbyScreen` — inline team builder | `GameState.LOBBY`: unassigned pool, team cards, lock/shuffle, start validation |
| **OFFLINE** | `LobbyScreen` — inline builder + `PlayersSection` | Один пристрій: host додає гравців, assign через team cards / sheet |
| **OFFLINE** або `GameState.TEAMS` | `TeamSetupScreen` | Legacy/alternate path після `GENERATE_TEAMS` → `GameState.TEAMS` (онлайн — лише якщо сервер синхронізував `TEAMS`) |

**Не плутати:** онлайн-гра **не вимагає** окремого екрану команд — гравці збирають команди прямо в лобі. `TeamSetupScreen` — переважно **legacy TEAMS state**; основний офлайн UX — **`LobbyScreen`**.

### Settings quick access (ONLINE + OFFLINE)

- **`LobbyRulesSummaryCard`** — картка «Правила гри» (режим, час, очки, категорії); host tap → `GameState.SETTINGS`.
- **ONLINE:** всередині `OnlineLobbyIntro` (під кодом кімнати).
- **OFFLINE:** окремий блок у `LobbyScreen` (без room code / invite).
- **Header gear прибрано** з lobby (2026-06-11) — єдиний вхід у налаштування з лобі через rules card (TMA і browser однаково).

---

## UX goals

- **Unassigned pool**: гравці спочатку в пулі, потім обирають команду (ONLINE self-join).
- **Self-select teams** (ONLINE): **Join/Leave** на картці команди (якщо не `teamsLocked`).
- **Host controls**: shuffle, lock/unlock, rename teams.
- **OFFLINE host assignment**: tap player chip → bottom sheet → assign/unassign (`TeamSetupScreen` або sheet у лобі).
- **Start validation:** host стартує лише коли `deriveLobbyReadiness.ok`. Кнопка **не** `disabled` — `aria-disabled` + tap → toast (`firstBlockingReason`); іконка lock на CTA. Текст валідації **над** кнопкою прибрано (2026-06-08); зелений «Готово до старту» лишається лише коли `ok`.
- **Overfill policy (warn-only):** `hasOverfilledTeams` у `deriveLobbyReadiness` — лише попередження в UI; **не блокує** `ok` і не дублюється в `deriveLobbyReadinessServer` (Phase 2). Хост може стартувати навіть при переповнених командах.
- **Play format (Teams/Solo):** `LobbyPlayModeBar` — host керує форматом; **online guest** бачить блок до вибору команди, потім `LobbyPlayModeBarSlot` ховає його з анімацією (host завжди бачить).

### Team mode: **Solo** (`general.teamMode === 'SOLO'`)

- **Lobby UI**: team builder **прихований** у Solo (`LobbyScreen`).
- **Settings**: перемикач Teams / Solo; слайдер `teamCount` вимкнено в Solo.
- **Server `START_GAME`**: одна «команда» на гравця (semantically FFA).
- **Offline `START_GAME`**: те саме — `prepareOfflineTeamsForStart()` у `offlineGameActions.ts` (mirror `GameEngine`, 2026-06-11). Без цього `PreRoundScreen` показував «В команді немає гравців!» при активній кнопці старту.
- **Model**: `teamMode?: 'TEAMS' | 'SOLO'` у `GeneralSettings` (`packages/shared/src/models.ts`); **client default** `SOLO` у `gameReducer` initial state.

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
- **`LobbyScreen` (primary):** `PlayersSection`, team cards, `LobbyRulesSummaryCard`, start panel — той самий inline builder що ONLINE (без avatar strip / room code).
- `TeamSetupScreen`: host-only edit (`canEdit = isHost && gameMode === 'OFFLINE'`) — коли `gameState === TEAMS`.
- **`START_GAME` (offline):** `deriveLobbyReadinessServer` guard + `prepareOfflineTeamsForStart()` (SOLO → 1 team/player; TEAMS → `materializeOfflineTeamsIfNeeded`).
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
- **Authorization:** `packages/server/src/game/authorizeGameAction.ts` — host-only shuffle/lock/rename; `teamsLocked` блокує self-switch; lobby actions лише в `LOBBY`/`TEAMS`; `START_GAME` лише з `LOBBY`.
- **Readiness (shared):** `packages/shared/src/lobbyReadiness.ts` — `deriveLobbyReadinessServer` (min 2 players, all assigned, each team non-empty); `GameEngine` відхиляє `START_GAME` з `LOBBY_NOT_READY`.
- **Join policy:** `room:join` дозволений лише коли `gameState === LOBBY`. Після старту гри — `GAME_ALREADY_STARTED`. **`room:rejoin`** для disconnect/grace не блокується.
- **Engine:** `packages/server/src/services/GameEngine.ts` — `ensureTeamShells`, Solo layout на `START_GAME`, обробка team actions.

---

## Client components

| Компонент | Роль |
|-----------|------|
| `LobbyScreen.tsx` | ONLINE/OFFLINE inline builder + start; OFFLINE rules card |
| `TeamSetupScreen.tsx` | OFFLINE / `TEAMS` state — assign + shuffle + start |
| `components/LobbyRulesSummaryCard.tsx` | Rules quick-access card (mode/time/score/categories); host tap → settings |
| `components/OnlineLobbyIntro.tsx` | Room code, invite trigger, rules card (ONLINE) |
| `components/LobbyInviteSheet.tsx` | Telegram-native invite options (copy code/link, TG share, nested QR) |
| `components/LobbyPlayModeBar.tsx`, `LobbyPlayModeBarSlot.tsx` | Solo/Teams + team count; animated collapse for guests after team pick |
| `components/UnassignedPool.tsx`, `TeamCard.tsx`, `AssignPlayerSheet.tsx` | Subcomponents |
| `LobbyScreen.tsx` | ONLINE inline builder + `ScreenShell` glass header/footer |
| `components/LobbyStartPanel.tsx` | Host start CTA: faded-red blocked / neon snake ready; див. [`TMA_LAYOUT.md` — Lobby start CTA](./TMA_LAYOUT.md#lobby-start-cta-lobbystartpanel) |
| `components/LobbyReadinessBar.tsx` | «Готово до старту» + overfill warn **лише коли** `readiness.ok` |
| `deriveLobbyReadiness.ts` | Client readiness + `firstBlockingReason` для toast |
| `components/LobbyGuestWaitingCard.tsx` | Online guest next-step card (Phase 2) |
| `utils/buildTeamShells.ts` | Virtual team shells (TEAMS mode) — shared by `LobbyScreen`, `TeamSetupScreen`, offline `TEAM_*` |

---

## Quick test checklist

- **ONLINE:** join/leave, lock, shuffle, start validation, Solo без team UI; guest play-format bar hide after team join; rules card → settings (no header gear).
- **OFFLINE:** rules card → settings; SOLO start з ≥2 гравцями → `PRE_ROUND` з командами (не «немає гравців»); chip → assign sheet, rename, `GENERATE_TEAMS` → `TEAMS`, start when valid.

Детальні критерії — [`TESTING_ACCEPTANCE.md`](./TESTING_ACCEPTANCE.md).

**Automated E2E (Phase 4):** `packages/e2e/tests/lobby-team-builder.spec.ts` — `@core` (assign → lock → start validation → PRE_ROUND), `@smoke` (create → join → assign → start). Helpers: `joinTeam`, `expectLobbyReadiness` in `tests/helpers/game-ui.ts`.

Завершений план виправлень лоббі (архів AI-промтів) — [`archive/LOBBY_FIX_PROMPTS.md`](./archive/LOBBY_FIX_PROMPTS.md); аудит — [`AUDIT_RESULTS.md`](../AUDIT_RESULTS.md) Block I.
