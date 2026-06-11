# Current Focus — Alias Master

**Last updated:** 2026-06-11 (session: offline lobby parity — SOLO START_GAME + rules card ✅)  
**Active branch:** `main`

## What's in progress

- **Profile / Lobby Settings improvements** — epic plan у `docs/PROFILE_LOBBY_SETTINGS_IMPROVEMENT_PROMPTS.md`; Session 0–8 ✅; Micro C ✅; **відкриті: мікро A–B** (Profile epic)
- **Liquid Glass fix epic** — **Sessions 0–9 ✅**; **Micro A ✅**; **Micro B ✅**; manual TMA @375px glass QA (owner)

## What was just completed

- **Offline lobby parity (2026-06-11):**
  - `offlineGameActions` `START_GAME` — SOLO/TEAMS team materialize (mirror `GameEngine`); fixes PreRound «немає гравців»
  - `LobbyRulesSummaryCard` — rules quick-access для OFFLINE + ONLINE; header gear прибрано з lobby
  - Tests: `LobbyRulesSummaryCard.test.tsx`, expanded `offlineGameActions.test.ts`, `LobbyScreen.test.tsx`
  - Docs: `LOBBY_TEAM_BUILDER.md`, `TESTING_ACCEPTANCE.md`, E2E `game-ui.ts`
- **LAYOUT-001 ✅ (Phases 0–7):** layout/surface/radius/spacing unification

## Next steps

1. [ ] **Manual QA @375px** — offline lobby: rules card tap → settings; SOLO start 2+ players → PreRound (not empty team)
2. [ ] **Manual TMA @375px** — LAYOUT-001 QA checklist
3. [ ] **Мікро A** (Profile epic) — avatar preview + email overflow
4. [ ] **Мікро B** (Profile epic) — in-lobby `SettingsScreen` header → `ScreenTitle`
5. [ ] Push — лише на явний запит власника

## Known issues / blockers

- **TMA header:** owner QA pending після floor 104px + grid control band (automated tests ✅)
- **Header gaps (post-6):** `ImposterScreen` / `PlayingScreen` game exception (pattern E); `AdminApp` defer
- `QuickBuyModal.test.tsx` — act() warnings; pre-existing
- `LobbyAvatarStrip.tsx` — unused `theme` var (eslint warning)

## Context for next session

- **Offline lobby SSOT:** `LobbyRulesSummaryCard.tsx` + `offlineGameActions.prepareOfflineTeamsForStart`
- **Lobby settings entry:** `lobby-settings-chips` (no `lobby-header-settings`)
- **Default teamMode:** `SOLO` in `gameReducer` initial state
- **LAYOUT-001 ✅:** `docs/LAYOUT_SURFACE_UNIFICATION_PROMPTS.md`
- **Profile/Lobby Settings epic:** Session 8 ✅; відкриті мікро A–B
