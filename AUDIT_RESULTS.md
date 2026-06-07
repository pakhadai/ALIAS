# Audit Results — Alias Master

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
| B-1 | 🟢 | ✅ VERIFIED | Relay + Redis adapter + writer lock OK (2026-06-07). Evidence: `RoomActionRelay.ts`, `RedisRoomStore.ts` `alias:room:writer:*`, `index.ts` adapter + relay init, `socketHandlers.ts` writer routing. |
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
| G-7 | 🟡 | ✅ RESOLVED | `@alias/shared` pure utils — `utils.test.ts` (shuffleArray, getTeamColor, constants); vitest script added (2026-06-07 Phase 6) |
| G-8 | 🟠 | ✅ RESOLVED | E2E `@smoke` + `@core` specs added — `smoke-round.spec.ts`, `core-acceptance.spec.ts`, `helpers/game-ui.ts` (2026-06-07 Phase 7). Local run blocked without Postgres (`docker compose up -d postgres`); CI runs `@smoke` / `@core` on chromium + mobile-chrome. |

---

**Last updated:** 2026-06-07 (test-gap session — Phase 8 coverage + verify)

**Open issues:** 0

**Bootstrap note:** детальні знімки stack/docs/arch audit консолідовано тут; окремі `.cursor/*_AUDIT.md` видалено як дублікати.
