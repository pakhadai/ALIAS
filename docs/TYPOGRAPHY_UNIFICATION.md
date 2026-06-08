# TYPO-001 — Уніфікація типографіки клієнта

**Status:** `implemented` ✅ (Phases 0–7 complete, 2026-06-08); epic **closed**  
**Epic:** Semantic typography tokens + міграція захардкоджених `text-[Npx]`  
**Scope:** `packages/client` (без змін `@alias/shared` / server)  
**Пов’язано:** [`UI_TOKENS.md`](./UI_TOKENS.md), [`TMA_LAYOUT.md`](./TMA_LAYOUT.md), [`.cursor/rules/08-typography.mdc`](../.cursor/rules/08-typography.mdc)

---

## User story

**Як** гравець у TMA/PWA,  
**я хочу** послідовну типографіку на всіх екранах,  
**щоб** інтерфейс виглядав цілісно, читабельно (≥16px на інпутах де потрібно) і не «стрибав» між 9px / 11px / 13px на схожих елементах.

**Acceptance criteria (epic):**

1. Є **канонічна шкала** з 6 semantic ролей + 1 frozen виняток (назва гри).
2. Нові компоненти **не** додають `text-[Npx]` — лише `text-ui-*` або семантичні класи.
3. Arbitrary `text-[Npx]` у `packages/client/src` → **0** (винятки задокументовані).
4. `pnpm typecheck` + client unit tests green після кожної фази.
5. `docs/UI_TOKENS.md` описує typography tokens; grep-governance у цьому файлі.

---

## Поточний стан (baseline audit)

| Метрика | Значення |
|---------|----------|
| Google Fonts завантажено | Montserrat 900, Playfair 400/700/900, Inter 400–800, Exo 2 (Merriweather **removed**) |
| Tailwind `text-*` scale | 11 розмірів (`xs`…`8xl`), ~280 використань |
| Arbitrary `text-[Npx]` | 12 унікальних px, ~299 використань |
| CSS vars для розміру | **немає** (лише `--font-heading` / `--font-body`) |
| Єдиний канон заголовка модалки | `modalSheetTitleClass` → `text-2xl font-serif` |

Деталі аудиту — сесія 2026-06-07 (чат / daily).

---

## Цільова типографічна система

### Ролі (semantic)

| Роль | Token / клас | Розмір | Сімейство | Вага / стиль | Референс у коді |
|------|--------------|--------|-----------|--------------|-----------------|
| **game-title** | *(frozen, без token)* | `text-7xl` + `tracking-[0.25em]` | `font-serif` (theme heading) | `font-normal` | `Logo` in `Shared.tsx` |
| **heading** | `text-ui-heading` | **24px** (`1.5rem`) | `font-serif` | theme heading vars | `ModalSheetTitle` |
| **body** | `text-ui-body` | **14px** (`0.875rem`) | `font-sans` | `font-normal` / `medium` | `ConfirmationModal` message, toast |
| **label** | `text-ui-label` | **10px** (`0.625rem`) | `font-sans` | `font-bold uppercase` + tracking | Settings/Rules section labels, `Button` |
| **caption** | `text-ui-caption` | **10px** (`0.625rem`) | `font-sans` | normal case; wide tracking для brand | `brandCaptionClass`, `captionMutedClass` |
| **system** | `text-ui-system` | **12px** (`0.75rem`) | `font-sans` | `font-medium` (не uppercase за замовч.) | `ConnectionStatusBanner`, `PwaUpdateBanner` |

### Окрема шкала — game display (не мігрувати в UI tokens)

Екрани гри (Imposter, VS, Countdown, word card, milestone) використовують **display scale** (`text-3xl`…`text-8xl`, `clamp(...)`). Це **не** частина app UI typography — лише прибрати дублікати, де елемент насправді body/heading.

### Мапінг legacy → target

| Було | Стане |
|------|--------|
| `text-2xl font-serif` (modal title) | `text-ui-heading font-serif` |
| `text-3xl` / `text-[26px]` screen h2 | `text-ui-heading` |
| `text-sm`, `text-[13px]` body | `text-ui-body` |
| `text-xs` у body paragraphs | `text-ui-body` або `text-ui-system` за контекстом |
| `text-[9px]`…`text-[11px]` labels | `text-ui-label` |
| `text-[10px]` CTA на кнопках (не `Button`) | `text-ui-label` або `Button` size |
| `text-xs` banners / status | `text-ui-system` |
| `text-7xl` ALIAS | **без змін** |

### Font loading (після Phase 6)

- Прибрати **Merriweather** з `index.html`.
- Залишити лише ваги, що реально використовуються (перевірити після міграції).
- `tailwind.config.ts`: коментар що `font-serif` у TSX = **heading role**, не Playfair напряму.

---

## Roadmap — фази

| Фаза | Назва | Статус | Scope | Оцінка сесії |
|------|-------|--------|-------|--------------|
| **0** | Audit & contract | ✅ | Baseline grep, ролі, цей doc | — |
| **1** | Token foundation | ✅ | `styles.css` `@theme`, `typography.ts`, `UI_TOKENS.md`, unit test | 1 сесія |
| **2** | Primitives & headings | ✅ | `ScreenTitle`, `modalSheetTitleClass`, screen h1/h2/h3 migration | 1 сесія |
| **3** | Body & inputs | ✅ | Phase 3a modals + shared; Phase 3b menu + lobby | 1–2 сесії |
| **4** | Labels & captions | ✅ | settings, rules, admin micro-labels, `Button` label token, label helpers | 1 сесія |
| **5** | System messages | ✅ | banners, connection strips, auth boot, Sentry fallback | 1 сесія |
| **6** | Font optimize & governance | ✅ | `index.html`, `08-typography.mdc`, final sweep, verify | 1 сесія |
| **7** | Visual QA (TMA) | ✅ | Manual @375px + Playwright computed-style audit; `@theme` token fix | 2026-06-08 |

**Не в scope epic:** редизайн game display typography; зміна `Logo`; нові Google Fonts.

---

## Phase 1 — Token foundation

### Deliverables

1. `packages/client/src/styles.css` — CSS variables + `@theme` entries:
   ```css
   --ui-text-heading: 1.5rem;
   --ui-text-body: 0.875rem;
   --ui-text-label: 0.625rem;
   --ui-text-system: 0.75rem;
   --ui-text-heading-leading: 1.25;
   --ui-text-body-leading: 1.5;
   --ui-text-label-tracking: 0.2em;
   ```
2. Tailwind utilities (через `@theme` як `text-ui-heading` тощо) **або** класи `.text-ui-heading` у `styles.css`.
3. `packages/client/src/constants/typography.ts` — експорт `typographyClass` map для reuse в TSX.
4. `docs/UI_TOKENS.md` — секція **Typography tokens**.
5. Unit test: `typography.test.ts` — класи існують, розміри відповідають contract.

### Verification

```bash
pnpm --filter @alias/client test typography
pnpm typecheck
```

### Session prompt — Phase 1

```
@alias-steward Pre-flight: TYPO-001 Phase 1 — typography token foundation.

Контекст: docs/TYPOGRAPHY_UNIFICATION.md (цільова шкала 5 ролей).
Задача:
1. Додай typography CSS vars і Tailwind `text-ui-heading|body|label|system` у packages/client/src/styles.css (@theme).
2. Створи packages/client/src/constants/typography.ts з typographyClass map.
3. Онови docs/UI_TOKENS.md — секція Typography (таблиця ролей + заборони).
4. Додай typography.test.ts (vitest) — snapshot або assert на class strings.
5. НЕ мігруй consumers у цій сесії — лише foundation.
6. pnpm typecheck + релевантні тести.

Заборони: не чіпати Logo, game display screens, не видаляти fonts з index.html ще.
Після: онови docs/TYPOGRAPHY_UNIFICATION.md (Phase 1 ✅), CHANGELOG [Unreleased], .cursor/CURRENT_FOCUS.md.
```

---

## Phase 2 — Primitives & headings

### Deliverables

1. `ScreenTitle` component у `packages/client/src/components/typography/ScreenTitle.tsx`:
   - Той самий візуал що `ModalSheetTitle` (`text-ui-heading font-serif tracking-wide`).
   - Props: `as`, `themeClass`, `children`.
2. Рефактор `modalSheetTitleClass` → використовує `typographyClass.heading`.
3. Міграція **screen h2/h1** (не game display):
   - `ProfileScreen`, `ProfileSettingsScreen`, `PlayerStatsScreen`
   - `StoreScreen`, `MyDecksScreen`, `MyWordPacksScreen`, `LobbySettingsScreen`
   - `RulesScreen`, `AdminApp` header
   - Lobby: `PlayersSection`, `LobbyAvatarStrip`, `LobbyScreen` h3 → `ScreenTitle` або `text-ui-heading` з меншим `as` де h3
4. `LoginModal` hero `text-3xl` → `text-ui-heading` (або залишити escape з коментарем `// escape: marketing hero` — рішення в сесії, default = heading token).

### Out of scope

- `Logo` / `text-7xl`
- Game flow screens

### Verification

```bash
rg "font-serif text-(2xl|3xl|\[26px\])" packages/client/src/screens/menu packages/client/src/screens/admin --glob "*.tsx"
# Має зменшитись до 0 або лише // escape
pnpm --filter @alias/client test
pnpm typecheck
```

### Session prompt — Phase 2

```
TYPO-001 Phase 2 — primitives & screen headings.

Прочитай docs/TYPOGRAPHY_UNIFICATION.md Phase 2.
Prerequisite: Phase 1 tokens існують (text-ui-heading тощо).

Задача:
1. Створи ScreenTitle (packages/client/src/components/typography/ScreenTitle.tsx) — канон як ModalSheetTitle.
2. Онови ModalSheetTitle / modalSheetTitleClass на typographyClass.heading.
3. Мігруй screen headings у menu/*, admin/AdminApp, lobby section titles (PlayersSection, LobbyAvatarStrip, LobbyScreen h3) на ScreenTitle або text-ui-heading.
4. text-3xl / text-[26px] / text-2xl для ЗАГОЛОВКІВ ЕКРАНІВ → text-ui-heading. Не чіпай Logo, Imposter, VS, Countdown, RoundSummary.
5. Тести для ScreenTitle + онови ModalSheet.test.tsx якщо потрібно.
6. pnpm typecheck + client tests.

Мінімальний diff. Після — TYPOGRAPHY_UNIFICATION Phase 2 ✅, CHANGELOG, CURRENT_FOCUS.
```

---

## Phase 3 — Body & inputs

### Deliverables

Міграція **основного тексту** на `text-ui-body`:

| Область | Файли (пріоритет) |
|---------|-------------------|
| Modals body | `ConfirmationModal`, `LoginModal`, `RulesModal`, `AppSettingsModal`, `CustomDeckModal`, `QuickBuyModal` |
| Menu | `MenuScreen`, `EnterNameSheet`, `QuickJoinSheet` |
| Lobby | `OnlineLobbyIntro`, `TeamCard`, `UnassignedPool`, `LobbyGuestWaitingCard`, `LobbyPlayModeBar`, `AssignPlayerSheet`, `LobbyInviteSheet` |
| Profile | `ProfileScreen` paragraphs, `ProfileSettingsScreen`, `PlayerStatsScreen` |
| Shared | `ToastNotification` → `text-ui-body` (не system — toast це readable message) |

### Mapping rules

- `text-sm` у paragraph / input → `text-ui-body`
- `text-[13px]` → `text-ui-body` (14px — свідоме укрупнення)
- `text-base` у App error → `text-ui-body` або окремий emphasis (за замовч. body)
- Inputs: `text-ui-body` + `font-sans`; **min 16px на iOS** — якщо input нижче, додати `text-base` лише на input через `text-ui-body` = 14px + policy comment OR bump body inputs to 16px в token (рішення: inputs use `text-base`/16px class `text-ui-body-input` — optional sub-token)

**Рекомендація:** додати `text-ui-body-input: 1rem` для `<input>` / `<textarea>` (TMA rule 16px).

### Verification

```bash
rg "text-\[13px\]|text-sm" packages/client/src --glob "*.tsx" | wc -l
# Число має суттєво впасти (paragraphs); залишки лише в game/ admin escape
```

### Session prompt — Phase 3a (modals + shared)

```
TYPO-001 Phase 3a — body text у modals і shared components.

Док: docs/TYPOGRAPHY_UNIFICATION.md Phase 3.
Tokens: text-ui-body, опційно text-ui-body-input (16px) для input/textarea.

Мігруй paragraphs і form text у:
ConfirmationModal, LoginModal, RulesModal, AppSettingsModal, CustomDeckModal, QuickBuyModal, ToastNotification, App.tsx auth errors.

text-sm / text-[13px] → text-ui-body (inputs → text-ui-body-input якщо додано).
Не чіпай: labels (Phase 4), system banners (Phase 5), game screens, Logo.

pnpm typecheck + client tests. Онови docs після завершення.
```

### Session prompt — Phase 3b (menu + lobby)

```
TYPO-001 Phase 3b — body text у menu та lobby.

Продовження Phase 3. Файли:
MenuScreen, EnterNameSheet, QuickJoinSheet, OnlineLobbyIntro, TeamCard, UnassignedPool, LobbyGuestWaitingCard, LobbyPlayModeBar, AssignPlayerSheet, LobbyInviteSheet, ProfileScreen (лише body paragraphs), ProfileSettingsScreen, PlayerStatsScreen.

text-sm / text-[13px] → text-ui-body. Кнопки з власним text-sm залиш для Phase 4/Button unify якщо це label-стиль.

pnpm typecheck + test. Grep: text-[13px] у цих папках → 0.
```

---

## Phase 4 — Labels & captions

### Deliverables

Уніфікувати micro-text на `text-ui-label`:

- Section labels: `text-[9px]`, `text-[10px]`, `text-[11px]` uppercase tracking
- CTA text на custom buttons (`text-[10px] uppercase tracking-[0.3em]`) → `text-ui-label` або перевести на `Button` component
- `Button.tsx` base `text-xs` → узгодити з `text-ui-label` (10px) **або** залишити Button на 12px з коментарем — prefer label token для uppercase CTAs
- Admin tabs, `SettingsScreen`, `TeamSetupScreen`, `LobbyScreen` chips
- Badges `text-[7px]` Profile → `text-ui-label` (min readable — можливо bump до 10px)

### Verification

```bash
rg "text-\[(7|8|9|10|11)px\]" packages/client/src --glob "*.tsx"
# Target: 0 outside GameFlow/, PwaUpdateBanner, SentryErrorFallback (Phase 5+)
# Verified 2026-06-07: in-scope → 0; escapes: GameFlow (game display), PwaUpdateBanner (Phase 5)
```

**Label helpers** (`constants/typography.ts`): `labelSectionClass`, `labelSectionTitleClass`, `formLabelClass`.

### Session prompt — Phase 4

```
TYPO-001 Phase 4 — labels & captions.

Уніфікуй micro typography на text-ui-label:
- AppSettingsModal, RulesModal section titles, ProfileSettingsScreen, SettingsScreen, TeamSetupScreen, LobbyScreen, MenuScreen divider, StoreScreen tabs, admin tabs, CustomDeckModal labels, Button base styles (узгодь з label token).

text-[9px|10px|11px] uppercase → text-ui-label (+ існуючий tracking з token або utility).
Profile badge text-[7px] → text-ui-label (10px).

Не чіпай game display, Logo, ConnectionStatusBanner (Phase 5).
pnpm typecheck + tests. Grep governance update у TYPOGRAPHY_UNIFICATION.md.
```

---

## Phase 5 — System messages

### Deliverables

Канон **`text-ui-system`** для статусів і алертів:

| Компонент | Зараз | Target |
|-----------|-------|--------|
| `ConnectionStatusBanner` | `text-xs uppercase bold` | `text-ui-system font-bold uppercase` |
| `PwaUpdateBanner` | `text-xs` | `text-ui-system` |
| `MenuScreen` server error strip | `text-xs` | `text-ui-system` |
| `SentryErrorFallback` | mixed | system + body |
| Lobby connection warnings | `text-sm`/`text-xs` | system для banner, body для опису |

Toast лишається **`text-ui-body`** (читабельність > compact).

**System helpers** (`constants/typography.ts`): `systemBannerClass`, `systemStatusClass`.

### Verification

Migrated: `ConnectionStatusBanner`, `PwaUpdateBanner`, `MenuScreen` server error, `LobbyScreen` guest connection strips, `TelegramAuthLoadingScreen`, `App.tsx` TMA auth error title, `SentryErrorFallback`, `StoreScreen` purchase status banner. Toast unchanged (`typographyClass.body`).

```
TYPO-001 Phase 5 — system messages.

Застосуй text-ui-system до:
ConnectionStatusBanner, PwaUpdateBanner, MenuScreen connection error, lobby connection/error strips (LobbyScreen), SentryErrorFallback, App auth loading states де це status text.

Правило: banner/status → text-ui-system; пояснювальний текст під ним → text-ui-body.
ToastNotification лишається text-ui-body.

pnpm typecheck + tests. Manual smoke: reconnect banner, PWA update banner.
```

---

## Phase 6 — Font optimize & governance

### Deliverables

1. `index.html` — прибрати Merriweather; trim font weights (Montserrat 900 only, Playfair used weights, Inter 400–800, Exo 2 as needed).
2. `.cursor/rules/08-typography.mdc` (або секція в `02-react.mdc`):
   - Заборона нових `text-[Npx]`
   - Канон ролей → `docs/UI_TOKENS.md`
   - Винятки: `Logo`, game display, `clamp()`, admin monospace codes
3. Grep script або documented commands у `TYPOGRAPHY_UNIFICATION.md`:

```bash
# Має бути 0 після epic
rg "text-\[[0-9]+px\]" packages/client/src --glob "*.{tsx,css}"

# Має бути 0 для raw text-sm/xs у нових файлах — soft gate (manual review)
```

4. `pnpm verify` green.
5. Epic status → `implemented`.

### Session prompt — Phase 6

```
TYPO-001 Phase 6 — font loading + governance + verification.

1. index.html: видали Merriweather, оптимізуй Google Fonts subset/weights.
2. Створи .cursor/rules/08-typography.mdc з заборонами text-[Npx] і посиланням на UI_TOKENS typography.
3. Final migration sweep: rg text-[Npx] — виправ залишки або додай // escape: причина (≤5 місць).
4. pnpm verify (typecheck + client tests).
5. Онови TYPOGRAPHY_UNIFICATION.md — всі фази ✅, INDEX.md, CHANGELOG [Unreleased] Added/Changed.

Не змінюй Logo. Документуй game display як виняток.
```

---

## Phase 7 — Visual QA (manual) ✅

### Automated gates (2026-06-08) ✅

| Gate | Result |
|------|--------|
| `text-[Npx]` app UI (excl. GameFlow) | 1 escape — icon glyph `text-[18px]` (whitelist) |
| `text-xs\|text-sm` app UI (excl. GameFlow, admin) | 2 escapes — emoji avatar sizing in `TeamCard` / `UnassignedPool` |
| Merriweather in code | 0 |
| `modalSheetTitleClass` → `text-ui-heading` | yes |
| Logo `text-7xl` frozen | yes |
| Text/textarea inputs → `bodyInput` / `text-ui-body-input` | yes (excl. display: JoinInput `text-6xl`, TeamSetup `text-xl`) |
| `pnpm typecheck` + client typography tests | green |
| E2E `@smoke` mobile-chrome | 7/7 green |

### Regression fixed (Session D)

**Root cause:** Tailwind v4 `@theme` used `--font-size-ui-*` / `--line-height-ui-*` / `--letter-spacing-ui-*` — utilities `text-ui-heading`, `text-ui-label`, `leading-ui-*`, `tracking-ui-*` were **not generated**. All semantic copy fell back to inherited 16px body.

**Fix:** `packages/client/src/styles.css` — rename to v4 namespaces: `--text-ui-*`, `--leading-ui-*`, `--tracking-ui-*`.

**Verified @375px (Playwright Pixel 5):** Logo 72px; CTA labels 10px; ScreenTitle 24px; `text-ui-label` CSS rules present.

### Checklist @375px — Session D results

| Screen | 375px light | 375px dark | Issues | Fixed |
|--------|-------------|------------|--------|-------|
| Menu | ✅ | ✅ | `text-ui-*` utilities missing → labels rendered 16px | `styles.css` `@theme` |
| Modal vs Screen titles | ✅ | ✅ | same token gap | `styles.css` |
| Profile + ProfileSettings | ✅ | ✅ | — | — |
| Lobby (player list) | ✅ | ✅ | — | — |
| SettingsScreen | ✅ | ✅ | — | — |
| Connection banner | ✅ | ✅ | `top-[var(--tma-inset-top)]` + `systemBannerClass` | — |
| Rules modal/screen | ✅ | ✅ | tab chips = label; body 14px | — |
| Themes (PAPER_LUXE + PREMIUM_DARK) | ✅ | ✅ | `.font-serif` → theme `--font-heading` | — |
| GameFlow (regression smoke) | ✅ | ✅ | display typography untouched; E2E round smoke green | — |

### Session prompt — Phase 7

```
TYPO-001 Phase 7 — manual TMA visual QA typography.

Використай .cursor/VISUAL_QA_CHECKLIST.md + docs/TYPOGRAPHY_UNIFICATION.md Phase 7 checklist.
Перевір @375px: Menu, Profile, Lobby, Settings modal, Rules modal, connection banner, EnterName sheet.
Зафіксуй знахідки в docs/daily/YYYY-MM-DD.md. Якщо регресії — мінімальні фікси в окремих комітах за фазами.
```

---

## Grep governance (після Phase 6)

| Перевірка | Очікування |
|-----------|------------|
| `text-[Npx]` у app UI (`src`, без `GameFlow/`) | **0** |
| `text-[Npx]` у `GameFlow/**` | дозволено (game display — див. whitelist у `08-typography.mdc`) |
| Icon glyph sizing (`text-[18px]`, `text-[80px]` на Material Symbols) | дозволено |
| `modalSheetTitleClass` містить `text-ui-heading` | так |
| `Logo` містить `text-7xl` | так (frozen) |
| `UI_TOKENS.md` секція Typography | заповнена |
| Merriweather у repo | **0** |
| `.cursor/rules/08-typography.mdc` | є |

### Команди

```bash
# App UI — 0 matches (exclude GameFlow)
rg "text-\[[0-9]+px\]" packages/client/src --glob "*.tsx" --glob "!**/GameFlow/**"

# Повний grep (GameFlow + icon escapes очікувані)
rg "text-\[[0-9]+px\]" packages/client/src --glob "*.{tsx,css}"

pnpm verify
```

---

## Ризики та мітигація

| Ризик | Мітигація |
|-------|-----------|
| 13px→14px змінить layout | Перевірити lobby chips; truncate де потрібно |
| Label 9px→10px розширить settings | Більше line-breaks — прийнятно |
| iOS input zoom | `text-ui-body-input` = 16px |
| `font-serif` плутанина | Док + rename до Phase 8 (optional): `font-heading` class alias |
| Regression у E2E | `pnpm test:e2e` smoke після Phase 3b і 6 |

---

## Optional Phase 8 (post-epic)

- Rename `font-serif` → `font-heading` у Tailwind extend (breaking class rename — окремий epic).
- `Typography` Storybook / visual regression snapshots.
- Admin panel окрема compact scale (якщо 10px label замало).

---

## Пов’язані файли

| Файл | Роль |
|------|------|
| `packages/client/src/styles.css` | CSS vars, `@theme`, `.font-serif`/`.font-sans` |
| `packages/client/tailwind.config.ts` | `fontFamily` |
| `packages/client/index.html` | Google Fonts |
| `packages/client/src/constants/themes.ts` | Per-theme heading/body fonts |
| `packages/client/src/components/Shared.tsx` | `Logo`, `ModalSheetTitle` |
| `packages/client/src/constants/typography.ts` | *(Phase 1)* class map |
| `docs/UI_TOKENS.md` | Canon typography tokens |
