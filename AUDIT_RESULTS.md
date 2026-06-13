# Audit Results — MOVLI Master

Формат: дата | блок | severity | статус | опис

## Legend
- 🔴 CRITICAL — зламане або security issue
- 🟠 HIGH — значна проблема, потрібне виправлення
- 🟡 MEDIUM — покращення або потенційна проблема
- 🟢 LOW — minor або polish
- ✅ RESOLVED — виправлено (залишати для трасування)

---

## Блок A: Security

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| A-1 | 🟢 | ✅ ACCEPTED | Prod JWT fail-fast OK; dev default secret expected (2026-06-07). Evidence: `config.ts` L49 `dev-secret-change-me` + L96–102 prod throw if missing/weak. |
| A-2 | 🟡 | ✅ RESOLVED | `console.log` у prod paths — dev-gated / `console.warn` (2026-06-06 session 2) |

## Блок B: Architecture

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| B-1 | 🟢 | ✅ VERIFIED | Relay + Redis adapter + writer lock OK (2026-06-07). Evidence: `RoomActionRelay.ts`, `RedisRoomStore.ts` `movli:room:writer:*`, `index.ts` adapter + relay init, `socketHandlers.ts` writer routing. |
| B-2 | ✅ | RESOLVED | README `GameSyncState` синхронізовано з `events.ts` (2026-06-06) |

## Блок C: Performance

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| C-1 | 🟡 | ✅ RESOLVED | Bundle **2026-06-07**: lazy routes — `main` **305.5 KB** (93.83 KB gzip), was 500 KB. Session 5: `RulesModal` split → `RulesScreen` lazy chunk 1 KB; no Vite static/dynamic conflict. Chunks: `GameFlow` 50 KB, `LobbyScreen` 59 KB, `SettingsScreen` 47 KB, `StoreScreen` 14 KB, `admin` 44 KB, `styles` 234 KB. |
| C-2 | 🟢 | ✅ VERIFIED | GameEngine timer cleanup OK (2026-06-07). Evidence: `GameEngine.ts` `stopTimer()` clears `timerInterval`; `clearTimeout` on `timeUpFallbackTimeout` / `quizNextWordTimeout`. |

## Блок D: Code Quality

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| D-1 | 🟠 | ✅ RESOLVED | `noUncheckedIndexedAccess` + `noImplicitReturns` у `tsconfig.base.json` (2026-06-06 session 2) |
| D-2 | ✅ | RESOLVED | `engines.node` **>=20** (2026-06-06) |
| D-3 | 🟡 | ✅ RESOLVED | `AuthService.test.ts` — static import; 208/208 pass (2026-06-06 session 2) |
| D-4 | 🟡 | ✅ RESOLVED | Mount-only `useEffect([], [])` audit (2026-06-07 session 3). Refactored: `useDeferredOpen`, `useResourceLoad`, Scoreboard CSS. **Deferred (documented):** `useSocketConnection` io lifecycle, `GameContext` URL/deep-link + rejoin connect, `useAuth`/`AdminApp` auth bootstrap, `useTelegramApp` TMA SDK. **Legitimate `[]`:** event subscriptions (PWA, Button prefs, viewport, install prompt, StatsTab poll). |
| D-5 | 🟢 | ✅ ACCEPTED | Class `ErrorBoundary` acceptable (2026-06-07). Evidence: `Shared.tsx` class boundary + `index.tsx` `Sentry.ErrorBoundary` wrapper — React pattern for error boundaries. |

## Блок E: Documentation

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| E-1 | ✅ | RESOLVED | `LOBBY_TEAM_BUILDER.md` — LobbyScreen vs TeamSetupScreen (2026-06-06) |
| E-2 | ✅ | RESOLVED | Steward files + INDEX cleanup (2026-06-06) |
| E-3 | ✅ | RESOLVED | Видалено `docs/Comands.md` (дублікат ECC, не проєкт) |

## Блок F: TMA

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| F-1 | 🟢 | ✅ VERIFIED | TMA viewport/safe-area/haptics/Stars/HMAC implemented (2026-06-07). Evidence: `useTelegramApp.ts` expand + safe-area; `useHapticFeedback.ts`; `QuickBuyModal.tsx` `openInvoice`; `AuthService.validateTelegramInitData` HMAC-SHA256. |

## Блок G: Testing

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| G-1 | 🟠 | ✅ RESOLVED | `authorizeGameAction` — 42 table-driven unit tests (`game/__tests__/authorizeGameAction.test.ts`, 2026-06-07) |
| G-2 | 🟠 | ✅ RESOLVED | GameEngine coverage **91.66%** lines — IMPOSTER, team builder, QUIZ lifecycle, mode merges (2026-06-07) |
| G-3 | 🟠 | ✅ RESOLVED | RoomManager coverage **89.27%** lines — rejoin, grace, Redis restore, host migration (2026-06-07) |
| G-4 | 🟠 | ✅ RESOLVED | REST routes integration — store, purchases/webhook, custom-decks, push, admin (+ AuthService HMAC/expiry, 2026-06-07) |
| G-5 | 🟡 | ✅ RESOLVED | Socket/pipeline/relay integration — `socketHandlers.int.test.ts` (8 cases: room:exists ack, grace rejoin, NOT_HOST/NOT_EXPLAINER E2E), `gameActionPipeline.test.ts`, `RoomActionRelay.test.ts` relay timeout/unavailable. Server **341** tests (2026-06-07 Phase 4) |
| G-6 | 🟡 | ✅ RESOLVED | Client unit — GameContext sync, offlineGameActions, gameReducer edge cases, QuickBuyModal TMA Stars (44 tests, 2026-06-07 Phase 5) |
| G-7 | 🟡 | ✅ RESOLVED | `@movli/shared` pure utils — `utils.test.ts` (shuffleArray, getTeamColor, constants); vitest script added (2026-06-07 Phase 6) |
| G-8 | 🟠 | ✅ RESOLVED | E2E `@smoke` + `@core` specs added — `smoke-round.spec.ts`, `core-acceptance.spec.ts`, `helpers/game-ui.ts` (2026-06-07 Phase 7). Local run blocked without Postgres (`docker compose up -d postgres`); CI runs `@smoke` / `@core` on chromium + mobile-chrome. |
| G-9 | 🟡 | ✅ RESOLVED | Lobby Fix Phase 4 tests — `buildTeamShells`, `TeamSetupScreen`, `room:exists` writer-only int, `lobby-team-builder.spec.ts`; client **142/142**, server **356/356** (2026-06-08) |

---

**Last updated:** 2026-06-13 (TEST-COV-001 Session 11 — epic closed)

**Open issues:** 0 🔴; 1 🟡 deferred (manual TMA device pass)

## Блок H: Lobby Fix (2026-06-08 audit)

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| H-1 | 🟠 | ✅ RESOLVED | TMA back SETTINGS/TEAMS called `leaveRoom` — now → LOBBY (Phase 1, `useTelegramBackButton.ts`) |
| H-2 | 🟠 | ✅ RESOLVED | TMA back LOBBY → MENU left zombie session keys — now `leaveRoom()` (Phase 1) |
| H-3 | 🟠 | ✅ RESOLVED | `restoreRoomFromRedis` missing `teamsLocked` — fixed (Phase 1, `RoomManager.ts`) |
| H-4 | 🟠 | ✅ RESOLVED | `REMOVE_OFFLINE_PLAYER` ghost in teams — team cleanup like KICK_PLAYER (Phase 1) |
| H-5 | 🟡 | ✅ RESOLVED | `TeamSetupScreen` empty when `teams[]=[]` — `buildTeamShells` (Phase 1) |
| H-6 | 🟠 | ✅ RESOLVED | Server START_GAME lobby readiness validation — Phase 2 (`deriveLobbyReadinessServer`, `LOBBY_NOT_READY`) |
| H-7 | 🟠 | ✅ RESOLVED | TEAM_JOIN mid-game blocked — Phase 2 (`authorizeGameAction` `INVALID_STATE`) |
| H-8 | 🟡 | ✅ RESOLVED | `room:exists` false positive on writer-only key — Phase 2 |
| H-9 | 🟡 | ✅ RESOLVED | Join during PLAYING — Phase 2 (`GAME_ALREADY_STARTED`) |
| H-10 | 🟡 | ✅ RESOLVED | Optimistic settings rollback on `room:error` — Phase 3 (`GameContext.tsx`) |
| H-11 | 🟡 | ✅ RESOLVED | `leaveRoom({ resetGameMode: false })` preserves OFFLINE — Phase 3 |
| H-12 | 🟢 | ✅ RESOLVED | Duplicate "+" in LobbyPlayModeBar — Phase 3 |

## Блок I: Lobby Fix Final Audit (2026-06-08)

**Verifier:** `pnpm build:shared && typecheck && shared 17/17 && server 356/356 && client 142/142 && verify green`; E2E `lobby|@core|@smoke` **33 passed / 3 skipped** (lobby-team-builder skips mobile-chrome by design).

| ID | B# | Status | Evidence |
|----|-----|--------|----------|
| I-1 | B1 | ✅ VERIFIED | `useTelegramBackButton.ts:45-48` SETTINGS/TEAMS → LOBBY; test L62–74 |
| I-2 | B2 | ✅ VERIFIED | `useTelegramBackButton.ts:49-51` LOBBY → `leaveRoom`; `GameContext.tsx:1065-1067` LS keys cleared |
| I-3 | B3 | ✅ VERIFIED | `RoomManager.test.ts` restores `teamsLocked` from Redis |
| I-4 | B4 | ✅ VERIFIED | `offlineGameActions.test.ts` REMOVE_OFFLINE_PLAYER team cleanup |
| I-5 | B5 | ✅ VERIFIED | `TeamSetupScreen.test.tsx` virtual shells; `buildTeamShells.ts` |
| I-6 | B6 | ✅ VERIFIED | `GameEngine.test.ts` START_GAME reject/accept + `LOBBY_NOT_READY` |
| I-7 | B7 | ✅ VERIFIED | `authorizeGameAction.test.ts` + `socketHandlers.int.test.ts` INVALID_STATE mid-game |
| I-8 | B8 | ✅ VERIFIED | `socketHandlers.int.test.ts` writer-only `room:exists` → false |
| I-9 | B9 | ✅ VERIFIED | `socketHandlers.int.test.ts` join PLAYING → `GAME_ALREADY_STARTED` |
| I-10 | B10 | ✅ VERIFIED | `GameContext.test.ts` settings rollback on `room:error` |
| I-11 | B11 | ✅ VERIFIED | `GameContext.test.ts` + `useTelegramBackButton.test.ts` offline `resetGameMode: false` |
| I-12 | B12 | ✅ VERIFIED | `LobbyPlayModeBar.tsx` single `+`; test `getAllByRole('Add team').length === 1` |

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| I-13 | 🟡 | ⏳ DEFERRED | Manual TMA @375px checklist (Part F) — no device in CI; owner pass pending |
| I-14 | 🟢 | ✅ RESOLVED | `LobbyScreen.test.tsx` / `QuickBuyModal.test.tsx` React `act(...)` warnings — TEST-COV-001 Session 10 (`waitFor`, sync `ResizeObserver` in `test/setup.ts`) |

**Architecture invariants (Part B):** `teamsLocked` sync ✅; theme/sound local merge ✅ (`GameContext.tsx:327-337`); `CLIENT_NAV_STATES` SETTINGS overlay ✅; offline `sendAction` → `handleGameAction` ✅; online `ADD_OFFLINE_PLAYER` server no-op ✅ (`socketHandlers.ts:381-383`). No circular imports (`buildTeamShells` in `utils/`). No new 🔴 regressions.

## Блок J: TMA Header Unification (2026-06-08 Phase 6)

**Verifier:** `pnpm build:shared && typecheck` green; client **202/202**; grep gates 0; E2E `@smoke` **15 passed / 1 skipped**.

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| J-1 | 🟢 | ✅ VERIFIED | Grep gates — no `fixed left-0 right-0 top-0`, no ad-hoc `pt-safe-top` (except documented E), no `tma-fixed-header-height` |
| J-2 | 🟡 | ⏳ DEFERRED | Manual TMA @375px checklist (Menu, Profile→Settings, Lobby, Settings footer, EnterName keyboard) — owner device |
| J-3 | 🟢 | ✅ VERIFIED | `--app-page-header-height` ResizeObserver + toast/banner offset (`GlassAppHeader.test.tsx`, `ToastNotification.test.tsx`) |
| J-4 | 🟢 | ✅ VERIFIED | `prefers-reduced-transparency` gradient fallback (`styles.css` L1084+) |
| J-5 | 🟢 | ✅ VERIFIED | Lobby 1:1 — TMA spacer, browser X, settings (`LobbyScreen.test.tsx`) |
| J-6 | 🟢 | ✅ RESOLVED | `StoreScreen` → `ScreenShell` + `AppHeader` (safe inset, TMA viewport, back → MENU) |
| J-7 | 🟢 | ✅ RESOLVED | E2E `smoke-round` settings-close — `backTestId` + `forceBrowserChromeMode` (`game-ui.ts`) |

**Phases 0–6:** ✅ complete. Canon: `ScreenShell` + sticky `AppHeader` in scroll; exceptions: `PlayingScreen`, `ImposterScreen`, `AdminApp`.

## Блок K: Test coverage expansion (TEST-COV-001, 2026-06-13)

**Verifier:** `pnpm verify` ✅ · server **402** · client **480** · shared **36** · server coverage **75.63%** (floor 67% OK).

| ID | Sev | Status | Опис |
|----|-----|--------|------|
| K-1 | 🟠 | ✅ RESOLVED | Server `auth.ts` REST integration — **58.89%** stmts (`auth.routes.test.ts`, Session 1) |
| K-2 | 🟠 | ✅ RESOLVED | `socketHandlers.ts` room lifecycle + relay — **70.8%** stmts (`socketHandlers.int.test.ts`, Session 2) |
| K-3 | 🟡 | ✅ RESOLVED | `purchases.ts` + `admin.ts` webhook/CRUD branches — **~49%** each (Session 3) |
| K-4 | 🟠 | ✅ RESOLVED | Client GameFlow RTL smoke — 6 screens **~55%** folder coverage (Session 4) |
| K-5 | 🟡 | ✅ RESOLVED | `GameRouter` + `GameContext` guards — `App.test.tsx`, `GameFlow.test.tsx` (Sessions 5) |
| K-6 | 🟡 | ✅ RESOLVED | Profile / Store / MyWordPacks RTL smoke (Session 6) |
| K-7 | 🟡 | ✅ RESOLVED | Client `api.ts` **~47%** + in-lobby `SettingsScreen` host/guest (Session 7) |
| K-8 | 🟢 | ✅ RESOLVED | `@movli/shared` **36** tests — `events`, `network`, lobby readiness (Session 8) |
| K-9 | 🟢 | ✅ RESOLVED | E2E `@extended` store/profile specs + optional `test:extended` (Session 9) |
| K-10 | 🟢 | ✅ RESOLVED | act() hygiene + root `test:client` script (Session 10) |
| K-11 | 🟢 | ✅ RESOLVED | Docs canon + full verify closure (Session 11); epic `implemented` |

**Epic canon:** `docs/TEST_COVERAGE_EXPANSION_PROMPTS.md`, guard matrix `docs/TESTING_ACCEPTANCE.md`.

**Bootstrap note:** детальні знімки stack/docs/arch audit консолідовано тут; окремі `.cursor/*_AUDIT.md` видалено як дублікати.
