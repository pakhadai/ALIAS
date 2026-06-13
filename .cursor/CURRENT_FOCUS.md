# Current Focus — MOVLI Master

**Last updated:** 2026-06-13 (session: full verify + E2E login dismiss fix)  
**Active branch:** `main`

## What's in progress

- **Home screen brand refresh** — tagline + `HomeWordRain` on menu ✅; manual visual QA pending
- **Profile / Lobby Settings improvements** — epic plan у `docs/PROFILE_LOBBY_SETTINGS_IMPROVEMENT_PROMPTS.md`; Session 0–8 ✅; Micro C ✅; **відкриті: мікро A–B** (Profile epic)
- **Liquid Glass fix epic** — **Sessions 0–9 ✅**; **Micro A ✅**; **Micro B ✅**; manual TMA @375px glass QA (owner)

## What was just completed

- **Full verify (2026-06-13):**
  - typecheck ✅; server **357** + client **389** unit tests ✅; lint ✅
  - E2E **36 passed**, 4 skipped (CI, fresh webServer); rematch + reconnect fixes
  - `LazyRouteFallback.test.tsx` → `EmbeddedBootLoading`; ESLint for `scripts/**/*.mjs`
  - Docs: `PROJECT_STATE`, `CHANGELOG`, `docs/daily/2026-06-13.md`
  - `homeTagline` in `translations.ts` (UA/DE/EN); `Logo` tagline row with flanking dividers
  - `HomeWordRain` ambient background on `MenuScreen` (CSS `home-word-rise`, `prefers-reduced-motion` off)
  - Tests: `homeBrand.test.ts`, `HomeWordRain.test.tsx`, `Logo.test.tsx`, `MenuScreen.buttons`; typecheck ✅
- **TMA Desktop layout §9 (2026-06-12):**
  - Docs sync: `TMA_LAYOUT.md#desktop-tma` — detection, CSS policy, anti-patterns, owner QA checklist (7 steps)
  - Epic marked complete; CHANGELOG [Unreleased] already covers §1–8 fixes; verify typecheck + client **376/376** ✅
- **TMA Desktop layout §8 (2026-06-12):**
  - `@supports not (backdrop-filter)`: modal backdrop/panel + `ui-glass-panel` opaque fallback in `styles.css`; header/footer tint raised 82%/54% → 90%/68% in `glass.css` — usable UI without blur on any platform
- **TMA Desktop layout §7 (2026-06-12):**
  - `styles.css`: `html[data-telegram-desktop]` — opaque modal backdrop (single 85–90% tint layer, blur off); panel 96% `--ui-card` fill; top bar 92% opaque; pseudo masks/blur disabled; nested sheets inherit
- **TMA Desktop layout §6 (2026-06-12):**
  - `glass.css`: `html[data-telegram-desktop]` — header/footer/feather island opaque (92% `color-mix`), blur `::before` off, feather height 0; mobile liquid glass unchanged
- **TMA Desktop layout §5 (2026-06-12):**
  - Modal backdrop `padding-top`: mobile-only `var(--tma-inset-top)` via `:not([data-telegram-desktop])`; desktop uses `var(--tma-content-safe-top, 0px)` — sheets start at WebView top, not 104px down
- **TMA Desktop layout §4 (2026-06-12):**
  - `AppHeader`: `applyTgGutter` guarded by `!isTelegramDesktopPlatform(platform)` — desktop skips `data-tg-gutter` / 80px inline padding
  - Tests: `tdesktop` + initData → gutter absent; `ios` → gutter present (`GlassAppHeader.test.tsx`)
- **TMA Desktop layout §1–3 (2026-06-12):**
  - `TELEGRAM_DESKTOP_CONTENT_TOP_FLOOR_PX` (0), `resolveTelegramContentTopFloorPx`, `TELEGRAM_DESKTOP_DOCUMENT_FLAG`
  - Bootstrap: platform floor + `data-telegram-desktop`; desktop SDK inset not clamped to 104px
  - CSS: `html[data-telegram-desktop]` safe-top override; mobile rule `:not([data-telegram-desktop])`
  - Tests: `tmaLayoutConstants.test.ts`, `useTelegramApp.test.ts`; mobile floor 104px unchanged
- **Lobby defaults auth-only (2026-06-12):**
  - Guest profile nav: lock + login CTA; `LobbySettingsScreen` redirects guests with toast
  - Removed guest `localStorage` path; `guestLobbyDefaults.ts` → `lobbyDefaults.ts`
  - Fixed saved word language overwritten by UI language on `createNewRoom`
  - Tests: `lobbyDefaults.test.ts`, `LobbySettingsScreen.test.tsx`; CHANGELOG [Unreleased]
- **Telegram / preset avatars (2026-06-12):**
  - `Player.avatarUrl` у shared + room join/create; `PlayerAvatar` у lobby/GameFlow
  - Profile Settings: «Синхронізувати з Telegram» (`POST /api/auth/profile/sync-telegram-avatar`)
  - Docs: `README.md` (Socket + REST + User), `CHANGELOG.md` [Unreleased]
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
5. [x] Push — 2026-06-13 (verify: typecheck + 746 unit + 36 E2E pass)

## Known issues / blockers

- **TMA header:** desktop epic §0–9 done (code + docs ✅); owner manual QA on `tdesktop`/`macos` pending — checklist `TMA_LAYOUT.md#desktop-tma`; mobile @375px floor 104px + gutter 80px + feather glass preserved
- **Header gaps (post-6):** `ImposterScreen` / `PlayingScreen` game exception (pattern E); `AdminApp` defer
- `QuickBuyModal.test.tsx` — act() warnings; pre-existing
- `LobbyAvatarStrip.tsx` — unused `theme` var (eslint warning)

## Context for next session

- **Offline lobby SSOT:** `LobbyRulesSummaryCard.tsx` + `offlineGameActions.prepareOfflineTeamsForStart`
- **Lobby settings entry:** `lobby-settings-chips` (no `lobby-header-settings`)
- **Default teamMode:** `SOLO` in `gameReducer` initial state
- **LAYOUT-001 ✅:** `docs/LAYOUT_SURFACE_UNIFICATION_PROMPTS.md`
- **Profile/Lobby Settings epic:** Session 8 ✅; відкриті мікро A–B
