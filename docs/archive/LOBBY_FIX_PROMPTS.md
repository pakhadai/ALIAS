# Lobby Fix — промти по фазах

> **Status: COMPLETED 2026-06-08** — не використовувати для нових сесій. Архів harness; канон лобі — [`LOBBY_TEAM_BUILDER.md`](../LOBBY_TEAM_BUILDER.md), аудит — [`AUDIT_RESULTS.md`](../../AUDIT_RESULTS.md) Block I.

> **Призначення (історично):** покрокові промти для AI-агента (Cursor) після аудиту лоббі 2026-06-08.  
> **Канон UX лобі:** [`LOBBY_TEAM_BUILDER.md`](../LOBBY_TEAM_BUILDER.md).  
> **Не дублюй** тут архітектуру — лише інструкції для виправлень.

---

## Як користуватись

### Загальні правила

1. **Одна фаза = одна сесія агента.** Не змішуй Phase 1 і Phase 2 в одному чаті — важче дебажити регресії.
2. **Порядок строгий:** 1 → 2 → 3 → 4 → **Фінальний аудит**. Phase 2 залежить від client fixes Phase 1; тести Phase 4 — від усіх попередніх.
3. **Перед кожною фазою** встав у чат блок [Pre-flight](#pre-flight-вставляти-на-початку-кожної-фази) + повний текст фази.
4. **Після кожної фази** агент має:
   - `pnpm typecheck` (0 помилок)
   - релевантні тести green
   - оновити `CHANGELOG.md` [Unreleased], `.cursor/CURRENT_FOCUS.md`, `docs/daily/YYYY-MM-DD.md`
5. **Не комітити / не пушити** без явного запиту власника.
6. Якщо фаза зайшла в глухий кут — зупинись, зафіксуй blocker у `CURRENT_FOCUS`, не розширюй scope.

### Швидкий старт (copy-paste)

```
@alias-steward Pre-flight для Lobby Fix Phase 1.

Прочитай: .cursor/CURRENT_FOCUS.md, AUDIT_RESULTS.md, docs/LOBBY_TEAM_BUILDER.md, docs/archive/LOBBY_FIX_PROMPTS.md (Phase 1).

Виконай Phase 1 з docs/archive/LOBBY_FIX_PROMPTS.md повністю. Мінімальний diff. Після — verify + онови docs.
```

Заміни `Phase 1` на `Phase 2`, `Phase 3`, `Phase 4` або `Final Audit` для наступних сесій.

### Коли запускати фінальний аудит

- Phases 1–4 завершені
- `pnpm typecheck` green
- `pnpm --filter @alias/client test` і `pnpm --filter @alias/server test` green
- У `CHANGELOG` [Unreleased] є записи по lobby fixes

### Очікуваний результат після всіх фаз

| Область | Результат |
|---------|-----------|
| TMA BackButton | SETTINGS/TEAMS → LOBBY; LOBBY → exit з кімнати |
| Offline | remove player чистить teams; TeamSetup бачить shells |
| Server | START_GAME валідує readiness; lobby actions з game-state guards |
| UX | settings rollback, leaveRoom semantics, UI polish |
| Тести | unit + integration + E2E lobby team builder |
| Доки | LOBBY_TEAM_BUILDER, AUDIT_RESULTS, CHANGELOG синхронізовані |

### Зв'язок з іншими doc

| Питання | Файл |
|---------|------|
| Як працює лобі зараз | `LOBBY_TEAM_BUILDER.md` |
| Що саме зламано (аудит) | чат 2026-06-08 або `AUDIT_RESULTS.md` після фіксів |
| Тести must-not-break | `TESTING_ACCEPTANCE.md` |
| TMA back / deep link | `TELEGRAM_SKILL.md`, `VIRAL_INVITES_PHASE7.md` |

---

## Pre-flight (вставляти на початку кожної фази)

```
@alias-steward Pre-flight для Lobby Fix Phase N.

Прочитай перед змінами:
- `.cursor/CURRENT_FOCUS.md`
- `AUDIT_RESULTS.md`
- `docs/LOBBY_TEAM_BUILDER.md`
- `docs/archive/LOBBY_FIX_PROMPTS.md` (секція Phase N)
- `AGENTS.md` + `.cursor/skills/alias-master/SKILL.md`

Інваріанти (НЕ порушувати):
- Сервер authoritative; клієнт не обчислює game state.
- Зміни контрактів — спочатку `packages/shared`, потім server + client.
- `GameSyncState` / Socket events — лише з оновленням shared + server + client.
- Мінімальний diff; без drive-by рефакторингу.
- Не комітити / не пушити без явного запиту.
- Після змін: `pnpm typecheck` (0 помилок); релевантні тести green.

Після фази онови:
- `.cursor/CURRENT_FOCUS.md`
- `CHANGELOG.md` [Unreleased]
- `docs/daily/YYYY-MM-DD.md` (Europe/Kyiv)
```

---

## Phase 1 — Критичні клієнтські фікси + Redis restore

**Орієнтовний час:** 1–2 сесії. **Shared API:** без змін (окрім якщо винесеш helper лише в client).

### Промт

```
# Lobby Fix — Phase 1: TMA back navigation, offline remove cleanup, teamsLocked restore, shared teamShells

## Мета
Виправити 4 підтверджені баги з мінімальним diff, без зміни публічного API (@alias/shared) і без зміни ігрової логіки на сервері (окрім Redis restore).

## Контекст (підтверджені проблеми)
1. `packages/client/src/hooks/useTelegramBackButton.ts:41-54` — SETTINGS/TEAMS викликають `leaveRoom()`; LOBBY → MENU без leave → zombie rejoin.
2. `packages/client/src/context/offlineGameActions.ts:719-723` — REMOVE_OFFLINE_PLAYER не чистить teams (на відміну від KICK_PLAYER ~630-643).
3. `packages/server/src/services/RoomManager.ts:297-332` — `restoreRoomFromRedis` не відновлює `teamsLocked` з syncState.
4. `packages/client/src/screens/lobby/LobbyScreen.tsx:257-271` vs `TeamSetupScreen.tsx:98` — віртуальні team shells лише в LobbyScreen; TeamSetup порожній при teams[]=[].

## Scope (дозволені файли)
- `packages/client/src/hooks/useTelegramBackButton.ts`
- `packages/client/src/context/offlineGameActions.ts`
- `packages/client/src/screens/lobby/TeamSetupScreen.tsx`
- `packages/client/src/screens/lobby/LobbyScreen.tsx` (лише винесення helper, не UX-рефакторинг)
- НОВИЙ: `packages/client/src/screens/lobby/buildTeamShells.ts` (або `packages/client/src/utils/buildTeamShells.ts`)
- `packages/server/src/services/RoomManager.ts` (лише restoreRoomFromRedis + тест)
- Тести: `offlineGameActions.test.ts`, `RoomManager.test.ts`, новий тест для `useTelegramBackButton`

## Задача 1.1 — useTelegramBackButton

Поточна логіка (НЕ ламати):
- PROFILE_SETTINGS → PROFILE
- LOBBY_SETTINGS → LOBBY
- PLAYER_STATS → PROFILE або MENU

Змінити:
| gameState | Було | Має бути |
|-----------|------|----------|
| SETTINGS | leaveRoom() | setGameState(GameState.LOBBY) |
| TEAMS | leaveRoom() | setGameState(GameState.LOBBY) |
| LOBBY | setGameState(MENU) | leaveRoom() (або confirm → leaveRoom) |
| VS_SCREEN … GAME_OVER | leaveRoom() | без змін |

Для LOBBY → exit:
- Мінімальний diff пріоритетніший за ідеальний UX.
- Не дублюй модалку в hook без потреби — якщо потрібен confirm, передай callback з App.tsx.
- Після leaveRoom: localStorage keys (ROOM_CODE, PLAYER_ID, SESSION) очищені — вже в GameContext.leaveRoom.

Edge cases:
- Offline LOBBY + TMA back → коректний вихід, без zombie keys.
- LOBBY_SETTINGS + !roomCode → setGameState(MENU), не LOBBY.

## Задача 1.2 — REMOVE_OFFLINE_PLAYER team cleanup

У `offlineGameActions.ts` case REMOVE_OFFLINE_PLAYER:
- Скопіюй cleanup з case KICK_PLAYER (filter players + map teams, nextPlayerIndex clamp).
- Використай materialize/buildTeamShells перед мутацією якщо потрібно.
- Один SET_STATE з players + teams (без проміжного inconsistent state).

Unit test:
`it('should remove offline player from teams when REMOVE_OFFLINE_PLAYER', ...)`

## Задача 1.3 — teamsLocked Redis restore

У `restoreRoomFromRedis` додай:
`teamsLocked: syncState.teamsLocked ?? false`

Тест RoomManager: persist teamsLocked true → restore → expect true.

## Задача 1.4 — Shared buildTeamShells helper

Винеси логіку з LobbyScreen teamShells useMemo і materializeOfflineTeamsIfNeeded.

```ts
export function buildTeamShells(params: {
  teams: Team[];
  teamCount: number;
  teamMode: 'TEAMS' | 'SOLO';
  language: Language;
  maxTeams?: number;
}): Team[]
```

Правила:
- SOLO → teams as-is (копія players).
- TEAMS → desiredCount = clamp(teamCount, 2, maxTeams); synthetic shells team-0..n-1 з TEAM_NAMES.
- Збережи players з teams[i] при padding.

TeamSetupScreen: display/move на materialized list; setTeams після rename/move.

## Заборонено Phase 1
- Зміни packages/shared events/actions.
- Server START_GAME validation (Phase 2).
- Рефакторинг SettingsScreen, GameEngine, authorizeGameAction.
- Typography / ModalSheet зміни.
- Нові Socket events.

## Acceptance criteria
- [x] TMA back SETTINGS/TEAMS → LOBBY (не leaveRoom)
- [x] TMA back LOBBY → leaveRoom, localStorage чистий
- [x] Offline remove → немає ghost у teams
- [x] Redis restore → teamsLocked відновлюється
- [x] Offline TeamSetup → shells при teams[]=[]
- [x] pnpm typecheck + client/server tests green
- [x] CHANGELOG + CURRENT_FOCUS оновлені

## Verification
pnpm typecheck
pnpm --filter @alias/client test
pnpm --filter @alias/server test

## Самоперевірка
- CLIENT_NAV_STATES для SETTINGS overlay не зламано?
- Offline START_GAME після buildTeamShells refactor?
- Немає circular imports?
```

---

## Phase 2 — Серверна цілісність лоббі

**Орієнтовний час:** 2–3 сесії. **Може торкнутись `@alias/shared`** (lobbyReadiness, RoomErrorCode).

### Промт

```
# Lobby Fix — Phase 2: Server-side lobby validation, game-state guards, room:exists, join policy

## Передумова
Phase 1 завершена, тести green. Прочитай diff Phase 1.

## Мета
Закрити розрив «клієнт валідує — сервер мовчки погоджується».

## Pre-read
- packages/server/src/services/GameEngine.ts
- packages/server/src/game/authorizeGameAction.ts
- packages/server/src/validation/schemas.ts
- packages/shared/src/events.ts (RoomErrorCode)
- packages/client/src/screens/lobby/deriveLobbyReadiness.ts
- packages/server/src/handlers/socketHandlers.ts
- packages/server/src/handlers/__tests__/socketHandlers.int.test.ts

## Задача 2.1 — Shared lobby readiness helper

НОВИЙ packages/shared/src/lobbyReadiness.ts:

```ts
export function deriveLobbyReadinessServer(params: {
  teamMode: 'TEAMS' | 'SOLO';
  playersCount: number;
  teams: { players: unknown[] }[];
  playerIds?: string[]; // для unassigned calc
}): { ok: boolean; reason?: 'MIN_PLAYERS' | 'UNASSIGNED' | 'EMPTY_TEAM' };
```

Логіка = mirror deriveLobbyReadiness (без i18n):
- playersCount >= 2
- TEAMS: unassigned === 0
- TEAMS: кожна team shell non-empty

Експорт з packages/shared/src/index.ts.
pnpm build:shared перед тестами.
Опційно: client deriveLobbyReadiness делегує в shared core (якщо diff невеликий).

## Задача 2.2 — START_GAME server validation

GameEngine case START_GAME, ПЕРЕД зміною gameState:
1. ensureTeamShells (TEAMS) або SOLO layout prep
2. deriveLobbyReadinessServer — якщо !ok → не мутувати room
3. Помилка через існуючий pipeline (room:error), не новий канал

Новий RoomErrorCode LOBBY_NOT_READY якщо потрібен — shared + client onError toast.

Тести GameEngine:
- 1 player → reject
- unassigned → reject
- empty team → reject
- valid TEAMS → success
- SOLO 2+ players → success

## Задача 2.3 — Game-state guards

LOBBY_STATES = LOBBY | TEAMS

Дозволені лише в LOBBY/TEAMS:
- GENERATE_TEAMS, TEAM_*, TEAM_LOCK, TEAM_RENAME
- UPDATE_SETTINGS (Phase 2: блокуй усі поза LOBBY/TEAMS — простіше)

START_GAME:
- ONLINE server: лише GameState.LOBBY
- (OFFLINE — client-only, server не стосується)

При порушенні → room:error (існуючий NOT_ALLOWED / INVALID_STATE).

Тести: PLAYING + TEAM_JOIN → deny.

## Задача 2.4 — room:exists fix

socketHandlers room:exists:
- Не ack true лише за writer key
- Спробуй getRoom / restoreRoomFromRedis
- exists = Boolean(room з валідним snapshot)
- Writer без state → false

Integration test: writer-only → exists false.

## Задача 2.5 — Join policy (зміна поведінки!)

room:join лише якщо room.gameState === LOBBY.
Інакше room:error GAME_ALREADY_STARTED (новий код у shared якщо треба).

Перевір E2E multiplayer.spec.ts happy path не зламаний.
Документуй у CHANGELOG + LOBBY_TEAM_BUILDER.md (1 абзац).

## Заборонено Phase 2
- Зміна правил очок / game modes.
- RoomManager grace refactor (окрім тестів).
- Клієнтський UX (Phase 3).
- Breaking GameSyncState shape.

## Acceptance criteria
- [x] START_GAME invalid lobby → server reject
- [x] TEAM_JOIN у PLAYING → reject
- [x] UPDATE_SETTINGS teamCount у PLAYING → reject
- [x] room:exists stale writer → false
- [x] room:join у PLAYING → error
- [x] pnpm build:shared && typecheck green
- [x] Server tests expanded
- [x] LOBBY_TEAM_BUILDER.md + CHANGELOG оновлені

## Verification
pnpm build:shared
pnpm typecheck
pnpm --filter @alias/server test
pnpm --filter @alias/shared test
```

---

## Phase 3 — UX, надійність, консистентність

**Орієнтовний час:** 1–2 сесії. **Без нових socket events.**

### Промт

```
# Lobby Fix — Phase 3: Optimistic settings rollback, leaveRoom semantics, UI polish, i18n

## Передумова
Phases 1–2 green. Прочитай їхній diff.

## Задача 3.1 — Optimistic settings rollback (online host)

GameContext.tsx (~907-933):
- lastSyncedSettingsRef оновлюй на game:state-sync
- Перед host optimistic setSettings — snapshot вже на сервері
- room:error → rollback settings (не theme/sound — local-only)

Тест GameContext: onError після setSettings → revert.

## Задача 3.2 — leaveRoom / offline exit

leaveRoom завжди gameMode ONLINE (~1045).

Варіант мінімальний:
- leaveRoom(opts?: { resetGameMode?: boolean }) default true
- Offline exit: resetGameMode: false або окремий exitOfflineLobby()

Узгодь: LobbyScreen exit, EnterNameSheet cancel offline, TMA back offline lobby.
Online leaveRoom без регресії (socket + LS clear).

## Задача 3.3 — LobbyPlayModeBar duplicate "+"

LobbyPlayModeBar.tsx ~101-118: один control для increment.
Онови LobbyPlayModeBar.test.tsx.

## Задача 3.4 — teamsExpanded UX

LobbyScreen.tsx ~328-330: не overwrite user toggle без потреби (ref userToggledTeamsRef або init-only).

## Задача 3.5 — Start button a11y

LobbyStartPanel.tsx: disabled={!readiness.ok}, зберегти toast у handleStartTap.

## Задача 3.6 — i18n hardcoded UA

Перенеси в translations.ts (UA + EN):
- TeamSetupScreen — "Перемістити сюди", instructions
- useTelegramLobbyDeepLink — error toasts
- SettingsScreen — топ-5 user-visible hardcoded (не весь файл)

TYPO-001: typographyClass.*, без нових text-xs/sm.

## Задача 3.7 — Overfill policy

Залиш warn-only (hasOverfilledTeam не блокує ok).
Додай коментар у deriveLobbyReadiness + LOBBY_TEAM_BUILDER.md.
НЕ блокуй старт без оновлення shared helper (Phase 2).

## Задача 3.8 — Дрібниці (якщо час)
- QR fail toast LobbyScreen
- LOBBY_SETTINGS back !roomCode → MENU (якщо не в Phase 1)

## Заборонено Phase 3
- Нові socket events
- Зміна server validation Phase 2
- Великий рефактор SettingsScreen

## Acceptance criteria
- [x] Settings rollback on error
- [x] Offline exit gameMode коректний
- [x] Один "+" у PlayModeBar
- [x] teamsExpanded зберігає user choice
- [x] Start disabled коли !ready
- [x] Критичні UA в translations
- [x] Client tests + typecheck green

## Verification
pnpm typecheck
pnpm --filter @alias/client test
rg "Перемістити" packages/client/src --glob "!translations.ts"
```

---

## Phase 4 — Тести та E2E

**Орієнтовний час:** 1–2 сесії.

### Промт

```
# Lobby Fix — Phase 4: Test coverage (unit + integration + E2E)

## Передумова
Phases 1–3 complete. CHANGELOG [Unreleased] описує фікси.

## Unit — Client (нові/розширені)

useTelegramBackButton.test.ts:
- SETTINGS → LOBBY, не leaveRoom
- TEAMS → LOBBY
- LOBBY → leaveRoom
- PLAYING → leaveRoom

buildTeamShells.test.ts:
- empty teams + teamCount=2 → 2 shells
- SOLO passthrough
- players preserved

offlineGameActions: REMOVE_OFFLINE_PLAYER team cleanup (regression)

GameContext: setSettings rollback; CLIENT_NAV_STATES SETTINGS guard

Components smoke:
- TeamSetupScreen renders shells when teams=[]
- LobbyStartPanel disabled state

## Unit / Integration — Server

RoomManager: teamsLocked restore
GameEngine: START_GAME reject/accept cases
authorizeGameAction: lobby actions wrong gameState
socketHandlers.int: room:exists writer-only; join PLAYING; START_GAME invalid

## E2E Playwright

Новий або розширений spec lobby-team-builder:
Tag @core:
1. Host create, guest join (2+ players)
2. Guests TEAM_JOIN різні команди
3. Host lock → guest cannot switch
4. Start blocked until ready (lobby-start-validation)
5. Start → PRE_ROUND/playing

Tag @smoke: скорочений create→join→assign→start

Helpers game-ui.ts: joinTeam(), expectLobbyReadiness()

Viewport: desktop; опційно mobile-chrome 375px guest play-format bar.

## Заборонено
- Flaky timing без waitFor
- Implementation-detail tests
- Production зміни окрім data-testid (мінімально)

## Acceptance criteria
- [x] Нові unit tests pass
- [x] E2E @core lobby pass (або documented skip + reason)
- [x] pnpm verify green (typecheck + lint + format:check)
- [x] CHANGELOG: Added tests for lobby fixes

## Verification
pnpm typecheck
pnpm --filter @alias/client test
pnpm --filter @alias/server test
pnpm test:e2e -- --grep "@core|lobby"
```

---

## Final Audit — повторна перевірка лоббі

**Запускати лише після green Phases 1–4.**

### Промт

```
# Lobby Fix — Final Audit: повторна детальна перевірка лоббі

## Роль
Senior reviewer + QA. Не пиши новий код окрім критичного hotfix при regression. Головний deliverable — звіт.

## Pre-read
1. .cursor/CURRENT_FOCUS.md
2. CHANGELOG.md [Unreleased]
3. docs/LOBBY_TEAM_BUILDER.md
4. docs/archive/LOBBY_FIX_PROMPTS.md
5. git diff (повний scope lobby changes)
6. AUDIT_RESULTS.md

## Verification commands (запусти всі)
pnpm build:shared
pnpm typecheck
pnpm --filter @alias/shared test
pnpm --filter @alias/server test
pnpm --filter @alias/client test
pnpm verify
rg "text-\[[0-9]+px\]" packages/client/src/screens/lobby --glob "*.tsx"

E2E (якщо postgres):
pnpm test:e2e -- --grep "lobby|@core|@smoke"

## Частина A — Регресія B1–B12

| ID | Баг | Перевірка |
|----|-----|-----------|
| B1 | TMA SETTINGS back leaveRoom | useTelegramBackButton + test |
| B2 | TMA LOBBY zombie session | LOBBY → leaveRoom, LS clean |
| B3 | teamsLocked Redis restore | RoomManager test |
| B4 | Offline remove ghost teams | offlineGameActions test |
| B5 | TeamSetup empty shells | test / manual |
| B6 | Server START_GAME validation | GameEngine test |
| B7 | Mid-game TEAM_JOIN | authorize + int test |
| B8 | room:exists false positive | int test |
| B9 | Join during PLAYING | int test |
| B10 | Settings rollback | GameContext test |
| B11 | leaveRoom gameMode | offline exit test |
| B12 | Duplicate + PlayModeBar | code review |

Статус кожного: ✅ Fixed / ⚠️ Partial / ❌ Regression + file:line.

## Частина B — Архітектурна цілісність

Перевір НЕ зламано:
- GameSyncState.teamsLocked sync
- game:state-sync merge (theme/sound local)
- CLIENT_NAV_STATES SETTINGS overlay
- Offline sendAction не в socket
- Online ADD_OFFLINE_PLAYER server no-op

Trace flows:
1. Online create → assign → lock → start → PRE_ROUND
2. Guest team pick → play format bar hides
3. Disconnect → grace → rejoin
4. Host disconnect → migration → START_GAME
5. Offline add → assign → remove → teams clean → start
6. TeamSetup → back LOBBY
7. Solo → no team UI → start
8. Settings sync all clients
9. TMA deep link lobby_XXXXX

## Частина C — Нові баги від фіксів

Шукай: circular imports, double materialization, rollback vs sync race,
START_GAME too strict SOLO/QUIZ/IMPOSTER, join guard vs rejoin, TMA mid-game exit.

## Частина D — Test coverage matrix

| Area | Unit | Int | E2E | Gap |
|------|------|-----|-----|-----|
| TMA navigation | | | | |
| buildTeamShells | | | | |
| Offline remove | | | | |
| Server readiness | | | | |
| Game-state guards | | | | |
| room:exists/join | | | | |
| Settings rollback | | | | |
| Team builder UX | | | | |
| Host migration | | | | |
| Reconnect | | | | |

## Частина E — Документація

- LOBBY_TEAM_BUILDER ↔ code
- CHANGELOG повний
- AUDIT_RESULTS RESOLVED / open
- CURRENT_FOCUS next steps

## Частина F — Manual TMA @375px (owner)

Checklist (якщо немає device — pending):
- TMA back Lobby/Settings
- Play format bar guest collapse
- AddOfflinePlayerSheet keyboard
- Telegram invite
- Dark/light lobby

## Формат звіту

# Lobby Post-Fix Audit — YYYY-MM-DD

## Executive summary
## Regression matrix B1–B12
## Architecture checklist
## New issues
## Test coverage matrix
## Open / deferred
## Recommendations (max 5)

## Успіх аудиту
- B1–B12 ✅ або ⚠️ documented
- 0 нових 🔴 без плану
- tests + typecheck green
- docs synced

## Заборонено
- Drive-by рефакторинг
- Зміна game rules без запиту
- Commit/push без запиту

Після аудиту: онови AUDIT_RESULTS.md, CURRENT_FOCUS, docs/daily, CHANGELOG якщо знайдено нові issues.
```

---

## Чекліст прогресу (для власника)

| # | Фаза | Статус | Дата | Нотатки |
|---|------|--------|------|---------|
| 0 | Аудит (чат 2026-06-08) | ✅ | 2026-06-08 | Промти зібрані |
| 1 | Client critical + Redis | ✅ | 2026-06-08 | TMA back, offline remove, teamsLocked restore, buildTeamShells |
| 2 | Server integrity | ✅ | 2026-06-08 | deriveLobbyReadinessServer, START_GAME guards, room:exists/join |
| 3 | UX polish | ✅ | 2026-06-08 | rollback, leaveRoom, PlayModeBar, i18n, a11y |
| 4 | Tests E2E | ✅ | 2026-06-08 | unit + int + `lobby-team-builder.spec.ts` |
| 5 | Final audit | ✅ | 2026-06-08 | B1–B12 ✅; verify + E2E green; AUDIT_RESULTS Block I |

---

## Troubleshooting

| Симптом | Дія |
|---------|-----|
| Phase 2 ламає E2E join | Перевір join guard vs rejoin; rejoin ≠ join |
| buildTeamShells circular import | Helper у `utils/`, не в `screens/lobby/components` |
| START_GAME too strict | Перевір SOLO не вимагає team assignment |
| TMA back ламає mid-game | PLAYING… має лишатися leaveRoom |
| shared build забутий | `pnpm build:shared` перед typecheck |

---

*Створено: 2026-06-08. Джерело: lobby audit session + phased fix plan.*
