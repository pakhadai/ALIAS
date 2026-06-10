# Current Focus — Alias Master

**Last updated:** 2026-06-10 (session: Micro C — guest lobby defaults localStorage ✅)  
**Active branch:** `main`

## What's in progress

- **Profile / Lobby Settings improvements** — epic plan у `docs/PROFILE_LOBBY_SETTINGS_IMPROVEMENT_PROMPTS.md`; Session 0–8 ✅; Micro C ✅; **наступні: мікро A–B**

## What was just completed

- **Micro C:** Guest lobby defaults — `lib/guestLobbyDefaults.ts`, guest nav on `ProfileScreen`, `LobbySettingsScreen` localStorage path + sign-in banner, `createNewRoom` guest merge; i18n UA/DE/EN; Vitest guest + auth paths
- **Profile/Lobby Settings Session 8:** Shared settings primitives (`components/Settings/`) — `SettingsToggle`, `SettingsSlider`, `LanguageChipRow`, `CategoryChipGrid`, `lobbySettingsCompare`; migrated `LobbySettingsScreen`; incremental DRY in `SettingsScreen` (categories, language chips, skip penalty); unsaved-changes guard (`useUnsavedChangesGuard`, `BackNavigationGuardProvider`, `UnsavedChangesModal`) on profile + lobby defaults screens; i18n `settingsUnsaved*` (UA/DE/EN); Vitest for primitives + dirty guard; typecheck green; 262/264 client tests (2 pre-existing `QuickBuyModal` flakes unrelated)
- **Profile/Lobby Settings Session 7:** ProfileScreen dedup — removed duplicate stats from `authBenefits`; guest store single path; 255/255 client tests

## Next steps

1. [ ] **Мікро A** — avatar preview + email overflow (`ProfileSettingsScreen`)
2. [ ] **Мікро B** — in-lobby `SettingsScreen` header → `ScreenTitle`
3. [x] **Мікро C** — guest path до lobby defaults (localStorage A)
4. [ ] **Manual TMA @375px** — keyboard lift QA matrix
5. [ ] Push — лише на явний запит власника

## Known issues / blockers

- **Header gaps (post-6):** `ImposterScreen` / `PlayingScreen` game exception (pattern E); `AdminApp` defer
- `QuickBuyModal.test.tsx` — 2 flaky failures (duplicate modal in DOM); pre-existing, not Session 8
- Manual TMA glass QA not run on physical device (I-13 / J-2 deferred)

## Context for next session

- **Profile/Lobby Settings epic:** Session 8 ✅; відкриті мікро A–C; daily `docs/daily/2026-06-10.md`
- **Shared settings import path:** `components/Settings/` (PascalCase — same folder as `AppSettingsModal`)
- **Dirty guard:** screens register via `useUnsavedChangesGuard`; Telegram back wired in `useTelegramBackButton`
