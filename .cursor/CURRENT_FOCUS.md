# Current Focus — Alias Master

**Last updated:** 2026-06-08 (session: TYPO-001 Session A)  
**Active branch:** `main` (uncommitted: lobby + modal + typography + E2E)

## What's in progress

- **TYPO-001** typography — Phases 0–6 ✅; **Session A** ✅; **Phase 7 automated gates** ✅; **Phase 7 manual TMA QA** pending (owner @375px)
- Manual TMA smoke @375px — ModalSheet Phase 5B checklist (device pending owner)

## What was just completed

- **TYPO-001 Phase 7 automated:** governance grep green; `SettingsScreen` number inputs → `bodyInput`; client tests green
- **TYPO-001 Session A (TMA inputs 16px):** commit `a355f09` — 5 screens `text-sm`/`inherit` → `typographyClass.bodyInput`
- **TYPO-001 Phase 6 (font + governance):** Merriweather removed from `index.html`; Playfair weights trimmed; `.cursor/rules/08-typography.mdc`; app UI `text-[Npx]` → 0 outside GameFlow; `pnpm verify` green
- **TYPO-001 Phase 5 (system messages):** `systemBannerClass`, `systemStatusClass`; ConnectionStatusBanner, PwaUpdateBanner, MenuScreen error, LobbyScreen guest strips, TelegramAuthLoadingScreen, App TMA auth error, SentryErrorFallback, StoreScreen purchase banner; toast unchanged (`text-ui-body`); client **125/125**
- **TYPO-001 Phase 4 (labels & captions):** `labelSectionClass`, `labelSectionTitleClass`, `formLabelClass`; ~27 files → `text-ui-label`; `Button` → label token; client **123/123**
- **TYPO-001 Phase 3b (menu + lobby body):** 13 files → `typographyClass.body` / `bodyInput`; grep `text-[13px]` in scope → **0**; client **123/123**
- **TYPO-001 Phase 3a (modals + shared body):** `text-ui-body-input` (16px); modals + toast + App auth; client **123/123**

- **TYPO-001 Phase 2 (primitives & headings):** `ScreenTitle`; `modalSheetTitleClass` → `typographyClass.heading`; migrated screen headings in menu/*, admin/AdminApp, lobby (PlayersSection, LobbyAvatarStrip, LobbyScreen teams h3); LoginModal hero → `text-ui-heading`; client **123/123**; typecheck green
- **TYPO-001 Phase 1 (token foundation):** `--ui-text-*` in `styles.css` `:root` + `@theme`; `constants/typography.ts` + tests — no consumer migration in Phase 1
- **ModalSheet Phase 4 (tall escape hatches):** `LoginModal`→`size="default"` + `ModalSheetFooter`; `RulesModal`/`AppSettingsModal`/`CustomDeckModal`→`ModalSheetBody`/`Footer`; tall CSS split scroll (`overflow: hidden`); `PlayingPauseOverlay` shadow removed; `EnterNameScreen` loading→`bottomSheetBackdropClass`; `ImposterScreen`→`ConfirmationModal`; smoke tests LoginModal/RulesModal
- **ModalSheet Phase 2 (presets API):** `ModalSheet.presets.ts`; `compact`→`px-5`+`max-w-sm`; tall scroll wrapper; `ModalSheetBody`/`Footer`; `paddedContent` deprecated in JSDoc; tests expanded
- **ModalSheet Phase 3 (CTA):** `LogoutConfirmBottomSheet` + admin confirm → `Button` stack (ConfirmationModal canon)
- **ModalSheet Phase 2:** 16 consumers migrated to `size`; LoginModal card→tall; ad-hoc padding/`max-h-[*dvh]` removed
- **ModalSheet Phase 1b (API):** `size` prop, built-in padding by preset, `panelVariant` deprecated — `ModalSheet.tsx`, `Shared.tsx`, `ModalSheet.test.tsx`
- **ModalSheet Phase 1a (visual foundation):** backdrop glass (blur/scrim/mask), frosted panel inset glass, sheet `height: auto` — `styles.css`, `UI_TOKENS.md`
- **ModalSheet Phase 0 (audit):** 16-consumer matrix, target contract (`compact`/`default`/`tall`), outlier priorities, doc sync — `TMA_LAYOUT.md`, `UI_TOKENS.md`, `07-modals.mdc`
- **ModalSheet edge-to-edge** (prior session): backdrop без `padding-bottom`; `pb-modal-bottom` всередині; keyboard lift = keyboard px only

## Next steps

1. [x] **Phase 1a** — `styles.css`: backdrop + panel glass, sheet content-height
2. [x] **Phase 1b** — `size` prop, built-in padding, deprecate `panelVariant`
3. [x] **Phase 2** — 16 consumers → `size`; LoginModal tall; padding canon
4. [x] **Phase 3** — simple consumers → `size` presets + CTA (`LogoutConfirm`, `AdminApp`, QuickJoin, Invite, …)
5. [x] **Phase 4** — tall escape hatches (`LoginModal`, `AppSettings`, `CustomDeck`, `RulesModal`, `PlayingPauseOverlay`, EnterName loading, Imposter confirm)
6. [x] **Phase 5** — automated verification + grep governance + docs sync
7. [ ] Manual TMA smoke — ModalSheet Phase 5B checklist @375px (dark + light, iOS + Android)
8. [x] **TYPO-001 Phase 1** — typography tokens (`styles.css`, `typography.ts`, `UI_TOKENS.md`)
9. [x] **TYPO-001 Phase 2** — `ScreenTitle`, `modalSheetTitleClass`, screen headings
10. [x] **TYPO-001 Phase 3a** — body text у modals + shared (+ `text-ui-body-input`)
11. [x] **TYPO-001 Phase 3b** — body text у menu + lobby
12. [x] **TYPO-001 Phase 4** — labels & captions
13. [x] **TYPO-001 Phase 5** — system messages (banners, connection strips; toast stays body)
14. [x] **TYPO-001 Phase 6** — font optimize + `08-typography.mdc` + verify
15. [x] **TYPO-001 Session A** — TMA inputs 16px (5 screens)
16. [x] **TYPO-001 Phase 7** — automated governance gates + Settings number inputs
17. [ ] **TYPO-001 Phase 7** — manual TMA visual QA @375px (owner)
18. [ ] Push — лише на явний запит власника

## Known issues / blockers

- ~~`LoginModal` card variant~~ — migrated to `size="default"` Phase 4
- ~~Backdrop glass слабкий внизу~~ — fixed Phase 1a (mask + bottom scrim)
- `EnterNameScreen` — `scrollElementIntoViewCentered` на input (keyboard policy debt)
- No focus trap / Esc on ModalSheet (deferred)
- Play format bar exit — device TMA not confirmed

## Context for next session

Modal unification → `docs/TMA_LAYOUT.md` (roadmap + consumer audit). Overlay tokens → `docs/UI_TOKENS.md#modalsheet-overlay--panel-tokens`. Typography → `docs/UI_TOKENS.md#typography-tokens`, epic `docs/TYPOGRAPHY_UNIFICATION.md` (**implemented**). Rules → `.cursor/rules/07-modals.mdc`, `.cursor/rules/08-typography.mdc`. Lobby UX → `docs/LOBBY_TEAM_BUILDER.md`.
