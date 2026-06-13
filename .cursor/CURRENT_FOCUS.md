# Current Focus — MOVLI Master

**Last updated:** 2026-06-13 (Profile epic Micro B ✅)  
**Active branch:** `main`

## What's in progress

- **Home screen brand refresh** — tagline + `HomeWordRain` on menu ✅; manual visual QA pending
- **Profile / Lobby Settings improvements** — epic plan у `docs/PROFILE_LOBBY_SETTINGS_IMPROVEMENT_PROMPTS.md`; Session 0–8 ✅; **Micro A ✅**; **Micro B ✅**; Micro C ✅
- **Liquid Glass fix epic** — **Sessions 0–9 ✅**; **Micro A ✅**; **Micro B ✅**; manual TMA @375px glass QA (owner)

## What was just completed

- **Profile epic Micro B:** in-lobby `SettingsScreen` header — `ScreenTitle` (вже в коді); додано RTL guard на heading typography (6 tests) ✅
- **Profile epic Micro A:** avatar preview, email truncate, 44px tap targets ✅

## Next steps

1. [ ] **Manual QA @375px** — offline lobby: rules card tap → settings; SOLO start 2+ players → PreRound
2. [ ] **Manual TMA @375px** — LAYOUT-001 QA checklist
3. [ ] (Optional) TEST-COV мікро A–B — QuizModeHandler / `gameTask`+`haptics` unit tests

## Known issues / blockers

- **TMA header:** desktop epic §0–9 done (code + docs ✅); owner manual QA on `tdesktop`/`macos` pending — checklist `TMA_LAYOUT.md#desktop-tma`; mobile @375px floor 104px + gutter 80px + feather glass preserved
- **Header gaps (post-6):** `ImposterScreen` / `PlayingScreen` game exception (pattern E); `AdminApp` defer
- `LobbySettingsScreen.test.tsx` — intermittent unsaved-changes dialog assertion; pre-existing
- `LobbyAvatarStrip.tsx` — unused `theme` var (eslint warning)

## Context for next session

- **Offline lobby SSOT:** `LobbyRulesSummaryCard.tsx` + `offlineGameActions.prepareOfflineTeamsForStart`
- **Lobby settings entry:** `lobby-settings-chips` (no `lobby-header-settings`)
- **Default teamMode:** `SOLO` in `gameReducer` initial state
- **LAYOUT-001 ✅:** `docs/LAYOUT_SURFACE_UNIFICATION_PROMPTS.md`
- **TEST-COV-001 ✅:** `docs/TEST_COVERAGE_EXPANSION_PROMPTS.md` — server **402** / client **480** / shared **36**; `pnpm test:client` at root; E2E `@extended` via `pnpm --filter @movli/e2e run test:extended`
