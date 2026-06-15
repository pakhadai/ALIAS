# Current Focus — MOVLI Master

**Last updated:** 2026-06-15 (BTN-001 Phase 7 ✅ epic close)  
**Active branch:** `main`

## What's in progress

- **Profile / Lobby Settings improvements** — Micro A–C ✅; manual QA pending
- **Liquid Glass fix epic** — Sessions 0–9 ✅; Micro A–B ✅; manual TMA @375px glass QA (owner)
- **BTN-001 manual visual QA** — `.cursor/VISUAL_QA_CHECKLIST.md` § BTN-001 @375px + Warm Paper + Midnight Ruby (owner)

## What was just completed

- **BTN-001 Phase 7 (epic close):** `UI_TOKENS.md` § Button synced; `VISUAL_QA_CHECKLIST.md` § BTN-001; `buttonGovernance.test.ts`; epic status `implemented`; `CHANGELOG` [Unreleased]
- **BTN-001 Phase 6:** Store/decks/lobby chrome — scope files **0** raw `<button>`; tests ✅

## Next steps

1. [ ] **Manual QA @375px** — BTN-001 checklist (Warm Paper neutral pills, modal footers, profile nav rows)
2. [ ] **Manual QA @375px** — Translation mode: UA deck + DE target, flip shows German answer; lobby target picker
2. [ ] **Manual QA @375px** — Hardcore variants (Taboo / Skip / Max), hint flip tap vs swipe, taboo chips
2. [ ] **Manual QA @375px** — offline lobby rules card → settings; SOLO start 2+ players → PreRound
3. [ ] **Manual TMA @375px** — LAYOUT-001 QA checklist

## Known issues / blockers

- **TMA header:** owner manual QA on `tdesktop`/`macos` pending
- `LobbySettingsScreen.test.tsx` — intermittent unsaved-changes dialog assertion; pre-existing

## Context for next session

- **BTN-001:** epic **implemented**; automated gates in `buttonGovernance.test.ts`; raw `<button>` allowlist in `docs/BUTTON_UNIFICATION.md` § Governance
- **Hardcore variants:** `TABOO` = taboo list + classic skip; `SKIP_ENDS_TURN` = skip ends turn (default); `MAX` = both
- **Deck JSON v:1:** `encodeWordEntry` / `decodeWordEntry` in `@movli/shared`
- **Offline lobby SSOT:** `LobbyRulesSummaryCard.tsx` + `offlineGameActions.prepareOfflineTeamsForStart`
