# Current Focus — MOVLI Master

**Last updated:** 2026-06-15 (Lobby QR invite hardening ✅, full test suite green)  
**Active branch:** `main`

## What's in progress

- **Home screen brand refresh** — tagline + `HomeWordRain` on menu ✅; hero flex collapse order ✅; manual visual QA pending
- **Profile / Lobby Settings improvements** — Micro A–C ✅; manual QA pending
- **Liquid Glass fix epic** — Sessions 0–9 ✅; Micro A–B ✅; manual TMA @375px glass QA (owner)

## What was just completed

- **Lobby QR invite:** `useLobbyQrCode` (loading/error/retry, cancellation), `VITE_PUBLIC_APP_URL`, invite sheet + QR modal UX, tests + `docs/VIRAL_INVITES_PHASE7.md` §2b
- **Translation mode:** DB deck builds `source|target` pairs via `WordService`; flip card back shows `GameTask.answer` in target language; lobby target-language picker excludes deck language; pack language chip fixes deck `language` field
- **Hardcore + Hint flip epic:** `@movli/shared` `hardcoreVariant`, `GameTask.hint/tabooWords`, `wordEntry.ts`; server WordService + handlers + GameEngine merge; client flip card, taboo chips, settings 3-chip picker, offline skip logic ✅

## Next steps

1. [ ] **Manual QA @375px** — Translation mode: UA deck + DE target, flip shows German answer; lobby target picker
2. [ ] **Manual QA @375px** — Hardcore variants (Taboo / Skip / Max), hint flip tap vs swipe, taboo chips
2. [ ] **Manual QA @375px** — offline lobby rules card → settings; SOLO start 2+ players → PreRound
3. [ ] **Manual TMA @375px** — LAYOUT-001 QA checklist

## Known issues / blockers

- **TMA header:** owner manual QA on `tdesktop`/`macos` pending
- `LobbySettingsScreen.test.tsx` — intermittent unsaved-changes dialog assertion; pre-existing

## Context for next session

- **Hardcore variants:** `TABOO` = taboo list + classic skip; `SKIP_ENDS_TURN` = skip ends turn (default); `MAX` = both
- **Deck JSON v:1:** `encodeWordEntry` / `decodeWordEntry` in `@movli/shared`
- **Offline lobby SSOT:** `LobbyRulesSummaryCard.tsx` + `offlineGameActions.prepareOfflineTeamsForStart`
