# Current Focus — Alias Master

**Last updated:** 2026-06-10 (session: mask-based glass header/footer feather ✅)  
**Active branch:** `main`

## What's in progress

- **Profile / Lobby Settings improvements** — epic plan у `docs/PROFILE_LOBBY_SETTINGS_IMPROVEMENT_PROMPTS.md`; Session 0–8 ✅; Micro C ✅; **відкриті: мікро A–B** (Profile epic)
- **Liquid Glass fix epic** — **Sessions 0–9 ✅**; **Micro A ✅**; **Micro B ✅**; manual TMA @375px glass QA (owner)

## What was just completed

- **Mask-based glass header + footer:** blur `::before` + tint `::after`, no sharp borders; feather 48px (sticky: padding + negative margin); tint **60% → 25%**; `.ui-app-footer` + `.footer-island` mirror header upward; `glass.css`, `styles.css`, CHANGELOG + daily
- **TMA AppHeader height + title alignment:** content-safe floor **88 → 104px**; `.ui-app-header__title-row` → CSS grid (bottom 44px control band aligned with native TG back/menu); tests + CHANGELOG [Unreleased]; Vitest 28/28 targeted, typecheck green
- **Hybrid glass header feather:** superseded by mask-based layers above
- **Profile/Lobby Settings Session 8:** Shared settings primitives + unsaved-changes guard

## Next steps

1. [ ] **Manual TMA @375px** — Profile title vs TG chrome; якщо glass короткий — floor 108px або bleed
2. [ ] **Мікро A** (Profile epic) — avatar preview + email overflow (`ProfileSettingsScreen`)
3. [ ] **Мікро B** (Profile epic) — in-lobby `SettingsScreen` header → `ScreenTitle`
4. [ ] Push — лише на явний запит власника

## Known issues / blockers

- **TMA header:** owner QA pending після floor 104px + grid control band (automated tests ✅)
- **Header gaps (post-6):** `ImposterScreen` / `PlayingScreen` game exception (pattern E); `AdminApp` defer
- `QuickBuyModal.test.tsx` — 2 flaky failures; pre-existing

## Context for next session

- **TMA header SSOT:** `TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX = 104`; title row grid у `styles.css` `.ui-app-header__title-row`; daily `docs/daily/2026-06-10.md` (секція TMA AppHeader)
- **Liquid Glass epic:** Sessions 0–9 ✅; Micro A/B ✅; manual device QA deferred
- **Profile/Lobby Settings epic:** Session 8 ✅; відкриті мікро A–B
- **Dirty guard:** `useUnsavedChangesGuard` + `BackNavigationGuardProvider`
