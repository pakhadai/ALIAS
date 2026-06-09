# Current Focus — Alias Master

**Last updated:** 2026-06-09 (session: chrome glass legibility)  
**Active branch:** `main`

## What's in progress

- *(none)*

## What was just completed

- **Chrome glass legibility:** SSOT `--ui-chrome-glass-*` (62% tint, 22px blur); `.ui-app-header` + `.bottom-sheet-top-bar` shared masks; modal top bar no longer 10%/3% override
- **StoreScreen header migration:** `ScreenShell` + `AppHeader` (tabs child row) + `FixedBottomBar`; back → MENU; J-6 resolved; Header matrix updated
- **ModalSheet keyboard animation:** CSS `--sheet-keyboard-lift` + 280ms transition; `useDeferredSheetInputFocus`; `pb-modal-bottom` CSS transition; EnterName/QuickJoin/AddOffline deferred focus; `docs/TMA_LAYOUT.md` keyboard section
- **Doc hygiene:** `LOBBY_FIX_PROMPTS` → `docs/archive/`; consolidated `CHANGELOG` `[Unreleased]`; `AGENT_BRIEF` governance in `CONTRIBUTING` + steward; `docs/archive/README.md`
- **E2E lobby helpers:** `expectLobbyReadiness` / `closeLobbySettings` synced with lobby redesign (no `lobby-start-validation`; offline-safe lobby return marker via `lobby-start-panel`)
- **Lobby play-mode bar:** reverted erroneous ONLINE hide; `LobbyPlayModeBarSlot` instant show on mount + `ResizeObserver` height sync (fixes empty gap where Solo/Teams bar should appear)
- **TMA header unification Phase 5:** 88px content-safe floor (`--tma-content-top-floor`, `useTelegramApp` sync, `--tma-inset-top` CSS); `resolveTelegramBackAction()` aligned with Header matrix (`MENU`/`ENTER_NAME` hide); `--tma-banner-top` for `ConnectionStatusBanner`; Vitest (`useTelegramApp`, `useTelegramBackButton`, toast/banner)
- **TMA header unification Phase 4:** `MenuScreen` home — fixed header → `ScreenShell` + sticky `AppHeader` (variant A); removed `--tma-fixed-header-height` / `data-fixed-header`; `--app-home-card-top`; `EnterNameSheet` overlay verified (`aria-hidden`, modals suppressed); Vitest
- **TMA header unification Phase 3b:** lobby-adjacent + game non-playing → `ScreenShell` + `AppHeader` / `FixedBottomBar` — `SettingsScreen`, `TeamSetupScreen`, `JoinInputScreen`, `RulesScreen`, `VSScreen`, `CountdownScreen`, `RoundSummaryScreen`, `ScoreboardScreen`, `GameOverScreen`; `ImposterScreen` / `PlayingScreen` untouched; Header matrix updated
- **TMA header unification Phase 3a:** menu/profile screens → `ScreenShell` + `AppHeader` — `ProfileScreen`, `ProfileSettingsScreen`, `PlayerStatsScreen`, `MyDecksScreen`, `MyWordPacksScreen`, `LobbySettingsScreen`; `FixedBottomBar` for save/create footers; grep gate 0 ad-hoc `pt-safe-top` on migrated files
- **TMA header unification Phase 2:** `AppHeader` API (`title`, `onBack`, `showBackInBrowser`, `children`/`childRowHeightPx`, `tgChromeGutter`); CSS `.ui-app-header__title-row` / `__child-row`; `LobbyScreen` refactor 1:1; Vitest (TMA gutter vs browser back, child row height)
- **TMA header unification Phase 1:** `tmaLayoutConstants.ts` + tests; `--app-page-header-height` у `styles.css`; `GlassAppHeader` ResizeObserver; toast offset via measured height; docs `UI_TOKENS` + `TMA_LAYOUT` Constants section
- **TMA header unification Phase 0:** grep audit усіх `GameState` screens; класифікація патернів A–E; **Header matrix** у `docs/TMA_LAYOUT.md#header-matrix-gamestate`; gaps report
- **Lobby glass chrome (canonical):** sticky header/footer inside scroll; documented in `TMA_LAYOUT.md`, `LOBBY_TEAM_BUILDER.md`, `UI_TOKENS.md`

## Next steps

1. [ ] **Manual TMA @375px** — keyboard lift QA matrix (flows 1–15, owner device)
2. [ ] Push — лише на явний запит власника

## Known issues / blockers

- **Header gaps (post-6):** `ImposterScreen` / `PlayingScreen` game exception (pattern E); `AdminApp` defer
- `EnterNameScreen` — `scrollElementIntoViewCentered` on input (keyboard policy debt)
- No focus trap / Esc on ModalSheet (deferred)
- Manual TMA glass QA not run on physical device (I-13 / J-2 deferred)

## Context for next session

- **TMA header unification:** phases 0–6 ✅ — canon `ScreenShell` + `AppHeader`; see `docs/TMA_HEADER_UNIFICATION.md`
- **Header matrix:** `docs/TMA_LAYOUT.md#header-matrix-gamestate`
- **Glass lobby etalon:** `docs/TMA_LAYOUT.md#glass-app-chrome-header--footer`
