# Current Focus — Alias Master

**Last updated:** 2026-06-11 (session: LAYOUT-001 Phase 0 baseline ✅)  
**Active branch:** `main`

## What's in progress

- **LAYOUT-001** — layout/surface/radius unification epic **in progress** — Phase 0 baseline ✅ (`docs/daily/2026-06-11.md`); **next: Phase 1** (`layout=` rollout на 6 екранів: MenuScreen + 5 GameFlow transitional) — `docs/LAYOUT_SURFACE_UNIFICATION_PROMPTS.md`
- **Profile / Lobby Settings improvements** — epic plan у `docs/PROFILE_LOBBY_SETTINGS_IMPROVEMENT_PROMPTS.md`; Session 0–8 ✅; Micro C ✅; **відкриті: мікро A–B** (Profile epic)
- **Liquid Glass fix epic** — **Sessions 0–9 ✅**; **Micro A ✅**; **Micro B ✅**; manual TMA @375px glass QA (owner)

## What was just completed

- **Mask-based glass header + footer:** blur `::before` + tint `::after`, no sharp borders; feather 48px (sticky: padding + negative margin); tint **60% → 25%**; `.ui-app-footer` + `.footer-island` mirror header upward; `glass.css`, `styles.css`, CHANGELOG + daily
- **TMA AppHeader height + title alignment:** content-safe floor **88 → 104px**; `.ui-app-header__title-row` → CSS grid (bottom 44px control band aligned with native TG back/menu); tests + CHANGELOG [Unreleased]; Vitest 28/28 targeted, typecheck green
- **Hybrid glass header feather:** superseded by mask-based layers above
- **Profile/Lobby Settings Session 8:** Shared settings primitives + unsaved-changes guard

## Next steps

1. [ ] **LAYOUT-001 Phase 1** — ScreenShell `layout=` на MenuScreen + Countdown/GameOver/PreRound/VS/RoundSummary
2. [ ] **Manual TMA @375px** — Profile title vs TG chrome; якщо glass короткий — floor 108px або bleed
3. [ ] **Мікро A** (Profile epic) — avatar preview + email overflow (`ProfileSettingsScreen`)
4. [ ] **Мікро B** (Profile epic) — in-lobby `SettingsScreen` header → `ScreenTitle`
5. [ ] Push — лише на явний запит власника

## Known issues / blockers

- **TMA header:** owner QA pending після floor 104px + grid control band (automated tests ✅)
- **Header gaps (post-6):** `ImposterScreen` / `PlayingScreen` game exception (pattern E); `AdminApp` defer
- `QuickBuyModal.test.tsx` — 2 flaky failures; pre-existing

## Context for next session

- **LAYOUT-001 baseline (2026-06-11):** 13 files з `layout=`, **6 без** (MenuScreen + 5 GameFlow); island footers 14 instances / 10 files; menu `currentTheme.text*` **86**; typecheck ✅; client **312/313** (fail: `offlineGameActions` TEAM_JOIN) — `docs/daily/2026-06-11.md`
- **TMA header SSOT:** `TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX = 104`; title row grid у `styles.css` `.ui-app-header__title-row`; daily `docs/daily/2026-06-10.md` (секція TMA AppHeader)
- **Liquid Glass epic:** Sessions 0–9 ✅; Micro A/B ✅; manual device QA deferred
- **Profile/Lobby Settings epic:** Session 8 ✅; відкриті мікро A–B
- **Dirty guard:** `useUnsavedChangesGuard` + `BackNavigationGuardProvider`
