# Current Focus — Alias Master

**Last updated:** 2026-06-10 (session: Liquid Glass Micro B ✅ — fixed/island rollout)  
**Active branch:** `main`

## What's in progress

- **Profile / Lobby Settings improvements** — epic plan у `docs/PROFILE_LOBBY_SETTINGS_IMPROVEMENT_PROMPTS.md`; Session 0–8 ✅; Micro C ✅; **відкриті: мікро A–B** (Profile epic)
- **Liquid Glass fix epic** — **Sessions 0–9 ✅**; **Micro A ✅**; **Micro B ✅** (menu/lobby + ScoreboardScreen); manual TMA @375px glass QA (owner)

## What was just completed

- **Micro C:** Guest lobby defaults — `lib/guestLobbyDefaults.ts`, guest nav on `ProfileScreen`, `LobbySettingsScreen` localStorage path + sign-in banner, `createNewRoom` guest merge; i18n UA/DE/EN; Vitest guest + auth paths
- **Profile/Lobby Settings Session 8:** Shared settings primitives (`components/Settings/`) — `SettingsToggle`, `SettingsSlider`, `LanguageChipRow`, `CategoryChipGrid`, `lobbySettingsCompare`; migrated `LobbySettingsScreen`; incremental DRY in `SettingsScreen` (categories, language chips, skip penalty); unsaved-changes guard (`useUnsavedChangesGuard`, `BackNavigationGuardProvider`, `UnsavedChangesModal`) on profile + lobby defaults screens; i18n `settingsUnsaved*` (UA/DE/EN); Vitest for primitives + dirty guard; typecheck green; 262/264 client tests (2 pre-existing `QuickBuyModal` flakes unrelated)
- **Profile/Lobby Settings Session 7:** ProfileScreen dedup — removed duplicate stats from `authBenefits`; guest store single path; 255/255 client tests

## Next steps

1. [x] **Liquid Glass Session 2** — fixed chrome wiring (пілот: `ProfileSettingsScreen`, `LobbySettingsScreen`)
2. [x] **Liquid Glass Session 3** — z-index liquid-chrome vs modal (`--z-liquid-chrome: 30`)
3. [x] **Liquid Glass Session 4** — footer blur unify (`glass.css` direct blur, mask pseudos removed)
4. [x] **Liquid Glass Session 5** — TMA bootstrap `bootstrapTelegramMiniApp()` + `isExpanded` on `viewportChanged`
5. [x] **Liquid Glass Session 6** — useGyroscope scope (FooterIsland only)
6. [x] **Liquid Glass Session 7** — prefers-reduced-transparency + CSS cleanup
7. [ ] **Мікро A** (Profile epic) — avatar preview + email overflow (`ProfileSettingsScreen`)
8. [ ] **Мікро B** (Profile epic) — in-lobby `SettingsScreen` header → `ScreenTitle`
9. [x] **Мікро C** — guest path до lobby defaults (localStorage A)
10. [x] **Liquid Glass Session 8** — banner z-index + LazyRoute skeleton
11. [x] **Liquid Glass Session 9** — visual QA + tests + doc sync (`TMA_LAYOUT.md`)
12. [x] **Liquid Glass Micro B** — rollout fixed/island на menu/lobby + ScoreboardScreen
13. [ ] **Manual TMA @375px** — keyboard lift QA matrix + Liquid Glass visual QA (owner)
14. [ ] Push — лише на явний запит власника

## Known issues / blockers

- **Header gaps (post-6):** `ImposterScreen` / `PlayingScreen` game exception (pattern E); `AdminApp` defer
- `QuickBuyModal.test.tsx` — 2 flaky failures (duplicate modal in DOM); pre-existing, not Session 8
- Manual TMA glass QA not run on physical device (deferred to owner; automated Vitest coverage ✅)

## Context for next session

- **Liquid Glass epic:** Sessions 0–9 ✅; Micro A ✅ (`GlassChromePortal`); Micro B ✅ (fixed/island on all menu/lobby + ScoreboardScreen); manual device QA deferred
- **Profile/Lobby Settings epic:** Session 8 ✅; відкриті мікро A–B; daily `docs/daily/2026-06-10.md`
- **Shared settings import path:** `components/Settings/` (PascalCase — same folder as `AppSettingsModal`)
- **Dirty guard:** screens register via `useUnsavedChangesGuard`; Telegram back wired in `useTelegramBackButton`
