# Current Focus — Alias Master

**Last updated:** 2026-06-08 (session: TYPO-001 Session D — Phase 7 QA)  
**Active branch:** `main` (uncommitted: TYPO-001 Session D fix + docs)

## What's in progress

- _(none — TYPO-001 epic closed)_

## What was just completed

- **TYPO-001 Session D (Phase 7 visual QA):** Playwright @375px audit found critical `@theme` namespace bug (`--font-size-ui-*` → no `text-ui-*` utilities); fixed in `styles.css`; post-fix: Logo 72px, labels 10px, headings 24px; E2E smoke mobile-chrome 7/7; `pnpm verify` green; epic **closed**
- **TYPO-001 Session C (app UI sweep):** 17 files — modals, menu, lobby, shared; grep app UI `text-xs|text-sm` → 0 (escapes: emoji avatars, admin, GameFlow)
- **TYPO-001 Session B (SettingsScreen):** ~19 legacy sizes → semantic tokens; client **126/126**
- **TYPO-001 Phase 7 automated:** governance grep green; Settings number inputs → `bodyInput`
- **TYPO-001 Session A (TMA inputs 16px):** commit `a355f09` — 5 screens → `bodyInput`
- **TYPO-001 Phases 0–6:** token foundation through font optimize + governance — see `docs/TYPOGRAPHY_UNIFICATION.md`
- **ModalSheet Phases 0–5:** consumer migration, tall escape hatches, verification — see `docs/TMA_LAYOUT.md`

## Next steps

1. [ ] Push — лише на явний запит власника
2. [ ] Manual TMA device pass (optional) — Telegram iOS/Android @375px for haptics + notch feel (computed-style audit done in Session D)
3. [ ] Optional Phase 8: rename `font-serif` → `font-heading` class alias (post-epic)

## Known issues / blockers

- `EnterNameScreen` — `scrollElementIntoViewCentered` on input (keyboard policy debt)
- No focus trap / Esc on ModalSheet (deferred)
- Play format bar exit — device TMA not confirmed
- ESLint: unused typography helper imports in Session C files (warnings only, cleanup optional)

## Context for next session

Typography epic closed → `docs/TYPOGRAPHY_UNIFICATION.md` ✅. Modal unification → `docs/TMA_LAYOUT.md`. Overlay tokens → `docs/UI_TOKENS.md#modalsheet-overlay--panel-tokens`. Rules → `.cursor/rules/07-modals.mdc`, `.cursor/rules/08-typography.mdc`.
