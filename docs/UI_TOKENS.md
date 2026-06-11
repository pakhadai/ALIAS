# UI-токени Alias Master

**Status:** `implemented` (сесії 1–7/7 завершено 2026-06-07 — verification grep + unit/E2E smoke green)

> Канон стилів клієнта: семантичні `--ui-*` змінні та Tailwind-утиліти `*-ui-*`.  
> Джерело значень тем: `packages/client/src/constants/themes.ts` (`THEME_CONFIG`), застосування — `GameContext.tsx`.  
> Огляд продукту: [README — Теми та локалізація](../README.md#теми-та-локалізація).

## П'ять базових кольорів на тему

Кожна тема задає мінімальний набір у `ThemeConfig.tokens` (або обчислює похідні в `GameContext`):

| Роль | CSS-змінна | Tailwind (приклад) | Призначення |
|------|------------|-------------------|-------------|
| **bg** | `--ui-bg` | `bg-ui-bg` | Найглибший фон екрану |
| **surface** | `--ui-surface` | `bg-ui-surface` | Картки, панелі, базові контейнери |
| **fg** | `--ui-fg` | `text-ui-fg` | Основний текст |
| **accent** | `--ui-accent` | `bg-ui-accent`, `text-ui-accent` | Primary CTA, акценти, focus |
| **border** | `--ui-border` | `border-ui-border` | Рамки, контури інпутів |

Приклад палітри за замовчуванням (**Midnight Ruby**, `PREMIUM_DARK`) — у [README](../README.md#палітра-за-замовчуванням-midnight-ruby-premium_dark).

### Похідні токени (derive у `GameContext`)

Усі інші `--ui-*` обчислюються з п'яти базових через `color-mix(in_srgb, …)`:

| Похідний токен | Формула (скорочено) |
|----------------|---------------------|
| `--ui-fg-muted` | dark: `fg 72% + bg 28%`; light: `fg 55% + surface 45%` (light — з прозорістю) |
| `--ui-fg-subtle` | dark: `fg 48% + bg 52%`; light: `fg-muted 55% + transparent` |
| `--ui-fg-disabled` | `fg-muted 45% + transparent` |
| `--ui-elevated` | `elevated` або `surface 72% + bg 28%` |
| `--ui-card` | `elevated 88% + bg 12%` або `surface 70% + bg 30%` |
| `--ui-surface-hover` | `surface 88% + accent 12%` |
| `--ui-border-subtle` | `border 62% + bg 38%` |
| `--ui-divider` | `border` |
| `--ui-accent-soft` / `--ui-accent-muted` | `accent 58% + surface 42%` |
| `--ui-accent-hover` | `accent 88% + white 12%` |
| `--ui-accent-pressed` | `accent 82% + black 18%` |
| `--ui-accent-ring` | `accent 40% + transparent` |
| `--ui-accent-alt` | `accentAlt` (premium) або `accent 65% + fg 35%` |
| `--ui-accent-warm` | `accentWarm` (premium) або `accent` |
| `--ui-accent-warm-soft` | `accent-warm 72% + fg 28%` |
| `--ui-success` / `--ui-warning` / `--ui-danger` | `accent 10% + base status hue 90%` |

Опційно в темі: **`elevated`** — явний HEX для піднятих поверхонь (рекомендовано для `isDark: true` і світлих тем з білими картками).

### Premium exception: multi-accent теми

Теми **FOREST**, **VOID_LUXE**, **QUANTUM_ECLIPSE** мають кілька візуальних акцентів. Замість окремих HEX-наборів дозволено **не більше двох** додаткових партнерів у `ThemeConfig.tokens`:

- `accentAlt` → `--ui-accent-alt` (secondary cool accent)
- `accentWarm` → `--ui-accent-warm` (+ `--ui-accent-warm-soft` через mix)

Інші похідні (`accent-soft`, hover, ring тощо) лишаються на primary `accent`. Не додавай `accentSoft`, `fgMuted`, `accentHover` тощо в `themes.ts` — лише derive.

## Повний список `--ui-*`

### Фон і поверхні

| Змінна | Tailwind |
|--------|----------|
| `--ui-bg` | `bg-ui-bg` |
| `--ui-surface` | `bg-ui-surface` |
| `--ui-elevated` | `bg-ui-elevated` |
| `--ui-surface-hover` | `bg-ui-surface-hover` |
| `--ui-card` | `bg-ui-card` |

### Текст

| Змінна | Tailwind |
|--------|----------|
| `--ui-fg` | `text-ui-fg` |
| `--ui-fg-muted` | `text-ui-fg-muted` |
| `--ui-fg-subtle` | `text-ui-fg-subtle` |
| `--ui-fg-disabled` | `text-ui-fg-disabled` |

### Рамки і розділювачі

| Змінна | Tailwind |
|--------|----------|
| `--ui-border` | `border-ui-border` |
| `--ui-border-subtle` | `border-ui-border-subtle` |
| `--ui-divider` | `border-ui-divider` |

### Акцент

| Змінна | Tailwind |
|--------|----------|
| `--ui-accent` | `bg-ui-accent`, `text-ui-accent`, `border-ui-accent` |
| `--ui-accent-contrast` | `text-ui-accent-contrast` |
| `--ui-accent-hover` | `hover:bg-ui-accent-hover` |
| `--ui-accent-pressed` | `active:bg-ui-accent-pressed` |
| `--ui-accent-muted` | `bg-ui-accent-muted` |
| `--ui-accent-ring` | `ring-ui-accent-ring` |
| `--ui-accent-soft` | *(переважно `color-mix` з `var(--ui-accent-soft)`)* |
| `--ui-accent-alt` | *(CSS var; без окремого `@theme` — mix / inline)* |
| `--ui-accent-warm` | *(CSS var)* |
| `--ui-accent-warm-soft` | *(CSS var)* |

### Статуси

| Змінна | Tailwind |
|--------|----------|
| `--ui-success` | `text-ui-success`, `bg-ui-success` |
| `--ui-warning` | `text-ui-warning`, `bg-ui-warning` |
| `--ui-danger` | `text-ui-danger`, `bg-ui-danger` |

### Ігрова картка слова

| Змінна | Tailwind |
|--------|----------|
| `--ui-word-card-bg` | `bg-ui-word-card-bg` |
| `--ui-word-card-fg` | `text-ui-word-card-fg` |
| `--ui-word-card-border` | `border-ui-word-card-border` |

### Правило для компонентів

1. **Кольори в TSX** — лише через Tailwind `*-ui-*` (мапінг у [`packages/client/src/styles.css`](../packages/client/src/styles.css) `@theme`) **або** `var(--ui-…)` / `color-mix(in_srgb, var(--ui-…) …)`.
2. **Не** використовуй legacy-класи з hardcoded hex у `tailwind.config.ts` (видалені в сесії 1/7).
3. Складні градієнти / прозорість — `color-mix` від `--ui-*`, не raw `#RRGGBB` у className.

Перше фарбування до React: fallback у `:root` у `styles.css`. Після монтування `GameContext` перезаписує змінні з обраної теми. У Telegram Mini App частина токенів може підмінятися `--tg-theme-*` (див. `styles.css`, `[data-telegram-app='true']`).

## Typography tokens

**Status:** Phases 1–6 complete (TYPO-001 implemented); Session A inputs 16px ✅; Phase 7 automated gates ✅; manual TMA QA pending.  
**Epic:** [`TYPOGRAPHY_UNIFICATION.md`](./TYPOGRAPHY_UNIFICATION.md)

### Semantic roles

| Роль | Tailwind size | CSS var | rem | Сімейство | Стиль |
|------|---------------|---------|-----|-----------|-------|
| **heading** | `text-ui-heading` | `--ui-text-heading` | 1.5rem (24px) | `font-serif` → `--font-heading` | `leading-ui-heading` (1.25) |
| **body** | `text-ui-body` | `--ui-text-body` | 0.875rem (14px) | `font-sans` → `--font-body` | `leading-ui-body` (1.5) |
| **body-input** | `text-ui-body-input` | `--ui-text-body-input` | 1rem (16px) | `font-sans` | TMA/iOS — `<input>` / `<textarea>` (no iOS zoom) |
| **label** | `text-ui-label` | `--ui-text-label` | 0.625rem (10px) | `font-sans` | `font-bold uppercase tracking-ui-label` (0.2em) |
| **system** | `text-ui-system` | `--ui-text-system` | 0.75rem (12px) | `font-sans` | `font-medium` (не uppercase за замовч.) |

**Precomposed map:** `packages/client/src/constants/typography.ts` → `typographyClass.*` plus helpers: `brandCaptionClass`, `captionMutedClass`, `labelSectionClass`, `formLabelClass`, `systemBannerClass`, `systemStatusClass`.  
**Components:** `ScreenTitle` / `ModalSheetTitle` — `typographyClass.heading`; `ConnectionStatusBanner` — `systemBannerClass`; toast — `typographyClass.body`.

### CSS contract (`styles.css`)

| Змінна | Значення | `@theme` utility |
|--------|----------|------------------|
| `--ui-text-heading` | `1.5rem` | `--text-ui-heading` → `text-ui-heading` |
| `--ui-text-body` | `0.875rem` | `--text-ui-body` → `text-ui-body` |
| `--ui-text-body-input` | `1rem` | `--text-ui-body-input` → `text-ui-body-input` |
| `--ui-text-label` | `0.625rem` | `--text-ui-label` → `text-ui-label` |
| `--ui-text-caption` | `0.625rem` | `--text-ui-caption` → `text-ui-caption` |
| `--ui-text-system` | `0.75rem` | `--text-ui-system` → `text-ui-system` |
| `--ui-text-heading-leading` | `1.25` | `--line-height-ui-heading` → `leading-ui-heading` |
| `--ui-text-body-leading` | `1.5` | `--line-height-ui-body` → `leading-ui-body` |
| `--ui-text-label-tracking` | `0.2em` | `--letter-spacing-ui-label` → `tracking-ui-label` |

### Заборони (typography)

| Заборонено | Замість |
|------------|---------|
| Нові `text-[Npx]` у app UI | `text-ui-*` або `typographyClass.*` |
| `text-sm` / `text-xs` у **нових** компонентах app UI | `text-ui-body` / `text-ui-system` / `text-ui-label` |
| Зміна `Logo` (`text-7xl`) | frozen — без token |

**Винятки (дозволено):**

- **`Logo`** — `text-7xl font-serif tracking-[0.25em]` (game title, frozen).
- **Game display** — `text-3xl`…`text-8xl`, `clamp()` на екранах гри (Imposter, VS, Countdown, word card).
- **Emoji avatars** — `text-sm` на декоративних emoji spans (`TeamCard`, `UnassignedPool`).
- **Admin tabs** — `font-mono text-xs` у compact admin panel (Phase 8 optional).
- **Material icon glyphs** — `text-[18px]` на icon font metrics (не semantic copy).

**Примітка:** `font-serif` у TSX = runtime `--font-heading` (`.font-serif` override), не напряму Playfair з `tailwind.config.ts`. Phase 8 (optional): alias `font-heading`.

## Border radius

**Status:** LAYOUT-001 Phase 3 ✅ (`rounded-theme` utility).  
**Epic:** [`LAYOUT_SURFACE_UNIFICATION_PROMPTS.md`](./LAYOUT_SURFACE_UNIFICATION_PROMPTS.md)

| Рівень | API | Приклад | Коли |
|--------|-----|---------|------|
| **Theme-aware** | `rounded-theme` або `rounded-[var(--theme-radius)]` | `Button`, `AccentFooterCta`, inputs | Primary controls — radius змінюється з темою (`6px` PAPER_LUXE → pill PREMIUM_DARK) |
| **Fixed glass** | `rounded-2xl` / `rounded-3xl` у `surfaceClasses.ts` | `SURFACE_CARD_CLASS`, `SURFACE_PANEL_CLASS` | Frosted panels — не theme pill |
| **Sheet** | `--ui-sheet-radius` (`28px`) | `ModalSheet` panel | Bottom sheets only |

### CSS contract

| Змінна | Runtime | `@theme` utility |
|--------|---------|------------------|
| `--theme-radius` | `GameContext` ← `ThemeConfig.borderRadius` | `--radius-theme` → `rounded-theme` |
| `--ui-sheet-radius` | `:root` у `styles.css` | — (CSS var на `.bottom-sheet-panel`) |

**Правило:** нові primary buttons / inputs — `rounded-theme`, не hardcoded `rounded-2xl`. Glass card shells — fixed radius через `SURFACE_*` constants.

## Surface classes

**Status:** LAYOUT-001 Phase 3 ✅ — SSOT `surfaceClasses.ts`; profile aliases у `profileSurfaceClasses.ts`.  
**Epic:** [`LAYOUT_SURFACE_UNIFICATION_PROMPTS.md`](./LAYOUT_SURFACE_UNIFICATION_PROMPTS.md)

| Константа | Класи (скорочено) | Призначення |
|-----------|-------------------|-------------|
| `SURFACE_PANEL_CLASS` | `ui-glass-panel rounded-3xl` | Elevated section panel (benefits, settings block) |
| `SURFACE_CARD_CLASS` | `ui-glass-panel rounded-2xl` | List row / stat card shell |
| `SURFACE_NAV_ROW_CLASS` | glass + `rounded-2xl` + nav layout + tap feedback | Full-width nav row (Profile nav list) |
| `SURFACE_NAV_ACCENT_BTN_CLASS` | `rounded-2xl` + `lobby-start-btn--plain` | Solid accent CTA row (no frosted glass) |

**Profile aliases (backward compat):** `PROFILE_PANEL_CLASS`, `PROFILE_NAV_BTN_CLASS`, `PROFILE_NAV_ACCENT_BTN_CLASS` — re-export з `surfaceClasses.ts`. Profile-only: `PROFILE_LIST_CLASS`, `PROFILE_PANEL_HEADER_CLASS`, `PROFILE_STAT_CARD_CLASS` (`SURFACE_CARD_CLASS` + stat layout).

**Модуль:** `packages/client/src/constants/surfaceClasses.ts` — імпорт для Phase 5 card migration (RulesModal, Store, settings).

## Spacing (vertical rhythm)

**Status:** LAYOUT-001 Phase 6 ✅ (optional) — SSOT `spacing.ts`; pilot на settings + stats екранах.  
**Epic:** [`LAYOUT_SURFACE_UNIFICATION_PROMPTS.md`](./LAYOUT_SURFACE_UNIFICATION_PROMPTS.md)

| Константа | Tailwind | Коли |
|-----------|----------|------|
| `screenBodyPy` | `py-4` | Default `ScreenShell` body vertical padding (settings, lists) |
| `sectionGap` | `space-y-5` | Compact stacked sections (`MyDecksScreen`, `MyWordPacksScreen`) |
| `sectionGapLg` | `space-y-6` | Form / sheet inner stacks (`EnterNameSheet`) |
| `sectionGapXl` | `space-y-8` | Settings pages — avatar, fields, card blocks |
| `stackGap` | `gap-4` | Flex column stacks (`PlayerStatsScreen`) |

**Правило:** горизонтальний inset лишається в `screenLayout.ts` / `layout=` preset; spacing constants — лише vertical rhythm (`py-*`, `space-y-*`, `gap-*`). Не дублювати `px-*` / `max-w-*` тут.

**Модуль:** `packages/client/src/constants/spacing.ts` — re-export через `constants/index.ts`.

## Screen layout presets

**Status:** LAYOUT-001 Phase 1 ✅ — SSOT `screenLayout.ts`; `ScreenShell` prop `layout=` merges `bodyClassName` + `ScreenLayoutContext` for browser back-rail alignment.  
**Epic:** [`LAYOUT_SURFACE_UNIFICATION_PROMPTS.md`](./LAYOUT_SURFACE_UNIFICATION_PROMPTS.md) · Layout policy: [`TMA_LAYOUT.md`](./TMA_LAYOUT.md)

| Preset | `bodyClassName` (скорочено) | Коли |
|--------|----------------------------|------|
| `canonical` | `max-w-2xl mx-auto px-6 md:px-8` | Profile, Store, settings menu, in-lobby settings |
| `narrow` | `max-w-md mx-auto px-6 md:px-8` | Player stats |
| `fullPx4` | `w-full px-4` | Online lobby |
| `fullPx6` | `w-full px-6` | My decks, scoreboard, game over, countdown |
| `fullPx8` | `w-full px-8` | Team setup, VS, pre-round, round summary |
| `wideMd` | `w-full px-6 md:px-10` | Join code, rules |

**Правило:** `contentClassName` на `ScreenShell` — лише vertical layout (`py-*`, `gap-*`, `flex`, `justify-*`); **не** дублювати `px-*` / `max-w-*` коли є `layout=`. Горизонтальний inset — у preset.

**Модуль:** `packages/client/src/constants/screenLayout.ts` — `SCREEN_LAYOUT`, тип `ScreenLayoutPreset`.

## Footer island presets

**Status:** LAYOUT-001 Phase 2 ✅ — SSOT `footerLayout.ts`; island footers через `footerIslandClassName()`.  
**Epic:** [`LAYOUT_SURFACE_UNIFICATION_PROMPTS.md`](./LAYOUT_SURFACE_UNIFICATION_PROMPTS.md) · [`TMA_LAYOUT.md` — Footer island presets](./TMA_LAYOUT.md#footer-island-layout-presets-layout-001-)

| Preset | Classes | Коли |
|--------|---------|------|
| `narrow` | `max-w-sm mx-auto w-full` | Single primary CTA (lobby start, profile logout) |
| `canonical` | `max-w-2xl mx-auto w-full` | Save bar, store trust strip, settings host footer |
| `fullBleed` | `w-full px-6` | Full-width CTA row (`MyDecksScreen`, `ScoreboardScreen`, `TeamSetupScreen`) |

**Default `FixedBottomBar` (non-island):** `max-w-sm` — окремий від island presets.

**Модуль:** `packages/client/src/constants/footerLayout.ts` — `FOOTER_ISLAND_LAYOUT`, `footerIslandClassName()`.

## Safe-area utilities (TMA / PWA)

Визначення padding-ключів: [`packages/client/tailwind.config.ts`](../packages/client/tailwind.config.ts) (`theme.extend.padding`).

Порядок fallback: **`--tma-inset-top`** = `--tg-content-safe-area-inset-top` (notch + TG chrome в одному SDK value). **`--tma-inset-bottom/left/right`** = content-safe + `max(safe-area, env())`. Ключі з мінімумом (`safe-*`) додають `max(…, 1rem–2rem)`; `env-*` — без мінімуму.

| Utility | CSS padding | Мінімум | Типове використання |
|---------|-------------|---------|---------------------|
| `pt-safe-top` / `pb-safe-top` | top / bottom | 1.5rem | Хедери екранів |
| `pt-safe-top-sm` / `pb-safe-top-sm` | top / bottom | 0.75rem | Тости, компактні відступи зверху |
| `pt-safe-top-md` / `pb-safe-top-md` | top / bottom | 1.25rem | Enter name sheet |
| `pt-safe-bottom` / `pb-safe-bottom` | bottom / top | 1.5rem | Fixed footer, scroll shell (екрани) |
| `pt-safe-bottom-sm` / `pb-safe-bottom-sm` | bottom | 1rem | Store footer |
| `pt-safe-bottom-md` / `pb-safe-bottom-md` | bottom | 1.25rem | — |
| `pt-modal-bottom` / `pb-modal-bottom` | bottom | 1rem | ModalSheet content, footers with CTA |
| `pt-safe-bottom-8` / `pb-safe-bottom-8` | bottom | 2rem | Fixed footer (lg), admin panel |
| `pt-env-top` / `pb-env-bottom` | top / bottom | — | PlayingScreen, MenuScreen fixed header |
| `pl-env-left` / `pr-env-right` | left / right | — | MenuScreen header — clearance від Telegram menu pill |

Додатково: [`06-tma.mdc`](../.cursor/rules/06-tma.mdc) — viewport `100dvh`, safe-area на body, bottom nav `calc(env(safe-area-inset-bottom) + 56px)`.

## Заборони

| Заборонено | Замість |
|------------|---------|
| `text-white`, `text-black` для UI-тексту | `text-ui-fg`, `text-ui-fg-muted`, `text-ui-accent-contrast` на акcent-кнопках |
| `bg-white`, `bg-black` для поверхонь | `bg-ui-bg`, `bg-ui-surface`, `bg-ui-card` |
| Raw `#hex` / `rgb()` у `className` або inline `style` для theme-aware UI | `--ui-*` або `*-ui-*` |

**Винятки (дозволено):**

- **Theme preview** у налаштуваннях (`ThemeConfig.preview`, swatches у `AppSettingsModal`).
- **`colorHex` команд** — inline колір аватара/команди (не частина app theme). Джерело: `@alias/shared` `TEAM_COLORS` (`hex` + optional `--team-color-*`); `Team.color` зберігає CSS var name або hex fallback через `getTeamColorToken()`.
- **`:root` fallback** у `styles.css` до гідрації React.
- **`THEME_CONFIG` / `themes.json`** — джерело палітр, не TSX-компоненти.

## ModalSheet overlay & panel tokens

Джерело: `packages/client/src/styles.css` (`:root`, `.bottom-sheet-*`). Layout policy: [`TMA_LAYOUT.md`](./TMA_LAYOUT.md#bottom-sheets-modalsheet). Consumer matrix: [`TMA_LAYOUT.md` — Phase 0 audit](./TMA_LAYOUT.md#modalsheet-consumer-audit-phase-0-grep-2026-06-07).

### Backdrop (frosted glass)

| Змінна | Поточне значення | Призначення |
|--------|------------------|-------------|
| `--ui-overlay-blur` | `72px` | Primary `backdrop-filter` на backdrop `::before` |
| `--ui-overlay-blur-secondary` | `36px` | Другий blur-шар на backdrop `::after` (stacked frost) |
| `--ui-overlay-saturate` | `0.76` | Primary desaturate — гасить accent bleed |
| `--ui-overlay-saturate-secondary` | `0.82` | Secondary frost layer |
| `--ui-overlay-brightness` | `0.87` | Легке затемнення під матовим scrim |
| `--ui-overlay-tint-base` | `bg` + warm sepia/`fg` mix | База тонованого скла |
| `--ui-overlay-glass-top` | `tint-base 88%` | Верх scrim |
| `--ui-overlay-glass-mid` | `tint-base 66%` | Середина gradient |
| `--ui-overlay-glass-bottom` | `tint-base 56%` | Низ scrim |
| `--ui-overlay-glass` | linear-gradient(top→mid→bottom) | Фон backdrop `::before` |
| `--ui-overlay-frost` | warm `tint-base` diagonal | Матовий шар backdrop `::after` |

**Mask:** gradient fade до `rgba(0,0,0,0.68)` внизу — майже повний blur біля панелі.

**Reduced transparency:** backdrop — tint gradient без blur; panel — opaque `color-mix(card 94%, elevated 6%)`, pseudo layers hidden.

## App chrome (glass header + footer)

Джерело: `packages/client/src/styles.css` (`.ui-app-header`, `.ui-app-footer`, `.lobby-start-btn-*`). Layout policy: [`TMA_LAYOUT.md` — Glass app chrome](./TMA_LAYOUT.md#glass-app-chrome-header--footer).

### Header (`.ui-app-header`)

| Змінна | Типове | Призначення |
|--------|--------|-------------|
| `--app-page-header-height` | measured + CSS fallback | Повна висота sticky header (inset + bar); `GlassAppHeader` пише measured px через `ResizeObserver`; fallback — формула з `tmaLayoutConstants.ts` |
| `--tma-content-safe-top` | SDK + floor on TMA | Title row min-height; вирівнювання з TG chrome |
| `--tma-content-top-floor` | `104px` | Baseline content-safe when SDK not ready; synced by `useTelegramApp` (`TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX`) |
| `--tma-banner-top` | inset or header height | `ConnectionStatusBanner` top offset; mirrors toast header rule |
| `--tma-toast-top` | inset + offset or header + gap | Portal toast position (`ToastNotification`) |
| `--ui-chrome-glass-opacity-top` | `62%` | SSOT tint біля верху sticky chrome (header + modal top bar) |
| `--ui-chrome-glass-opacity-bottom` | `12%` | SSOT tint біля feather |
| `--ui-chrome-glass-blur` | `22px` | SSOT `backdrop-filter` blur |
| `--ui-chrome-glass-saturate` | `1.5` | SSOT saturation разом із blur |
| `--ui-app-header-opacity-top` | `var(--ui-chrome-glass-opacity-top)` | Tint `--ui-bg` біля верху bar |
| `--ui-app-header-opacity-bottom` | `var(--ui-chrome-glass-opacity-bottom)` | Tint біля нижнього feather |
| `--ui-app-header-blur` | `var(--ui-chrome-glass-blur)` | `backdrop-filter` на `::before` |
| `--ui-app-header-saturate` | `var(--ui-chrome-glass-saturate)` | Saturation разом із blur |

Mask на `::before` / `::after`: gradient feather **вниз** (м’який перехід до контенту).

### Footer (`.ui-app-footer`)

| Змінна | Типове | Призначення |
|--------|--------|-------------|
| `--ui-app-footer-opacity-bottom` | `28%` | Tint біля низу (safe area) |
| `--ui-app-footer-opacity-top` | `6%` | Tint біля верхнього feather |
| `--ui-app-footer-blur` | `16px` | Blur на `::before` |
| `--ui-app-footer-saturate` | `1.2` | Saturation |

Mask — дзеркально header (feather **вгору**).

### Accent footer CTA (`AccentFooterCta`)

| Variant | Shell | Кнопка | Анімація |
|---------|-------|--------|----------|
| `animated` | `.accent-footer-cta-shell--ready` | `.lobby-start-btn--ready` + theme | Perimeter snake: `radial-gradient` на `::before`/`::after`, `accent-cta-snake` 3s (`@property --snake-x/y`) |
| `blocked` | `.accent-footer-cta-shell--blocked` | `.lobby-start-btn--blocked` | `blocked-pulse` 3s |
| `plain` | `.accent-footer-cta-shell--plain` | `.lobby-start-btn--plain` + theme | немає (повний accent без glow/snake) |

| Клас | Стан | Опис |
|------|------|------|
| `.lobby-start-btn--blocked` | `variant="blocked"` | Opaque «вигорілий» червоний (`color-mix` `--ui-accent` + `--ui-bg`) |
| `.lobby-start-btn--ready` | `variant="animated"` | Повний theme accent + легкий glow |
| `.lobby-start-btn--plain` | `variant="plain"` | Повний theme accent, tap scale — без glow box-shadow |

**Не плутати:** `.ui-glass-panel` — rounded inset panel для sheet-adjacent блоків; app chrome — flat full-width.

### Panel & chrome

| Змінна / клас | Значення | Призначення |
|---------------|----------|-------------|
| `--ui-sheet-radius` | `28px` | Верхні кути sheet |
| `--ui-sheet-shadow` | multi-layer inset+drop | Тінь панелі |
| `--ui-sheet-glass-inset` | `2px` | Inset frosted layer (як `lobby-start-glass`) |
| `--ui-sheet-glass-blur` | `34px` | Panel `::before` blur — matte frosted |
| `--ui-sheet-handle` | sepia + `fg` mix | Drag handle bar |
| `--ui-sheet-ease` | `cubic-bezier(0.32, 0.72, 0, 1)` | iOS-style easing |
| `--ui-sheet-anim-ms` | `400ms` | Slide transform |
| `.bottom-sheet-panel` | inset `::before` blur + `::after` card tint | Frosted panel (Phase 1a) |
| `.bottom-sheet-panel--size-compact` | `max-height: min(88dvh, 820px)` | `size="compact"` — content-driven |
| `.bottom-sheet-panel--size-default` | `max-height: min(88dvh, 820px)` | `size="default"` (default prop) |
| `.bottom-sheet-panel--size-tall` | `max-height: min(92dvh, 820px)` | `size="tall"` + `data-sheet-scroll` |

**Presets module:** `packages/client/src/components/ModalSheet.presets.ts` — padding map, default `maxWidth` per size.

### Content padding (`size` prop)

| `size` | Wrapper classes (`paddedContent`, default) | Default `maxWidth` | Bottom safe |
|--------|---------------------------------------------|--------------------|-------------|
| `compact` | `px-5 pt-0 text-center` | `sm` | `pb-modal-bottom` |
| `default` | `px-5 pt-0` | `md` | `pb-modal-bottom` |
| `tall` | `px-5 pt-0` + scroll (`overflow-y-auto`, `flex-1`) | `md` | `pb-modal-bottom` |

`paddedContent={false}` — deprecated path; use for split body/footer (`ModalSheetBody` / `ModalSheetFooter`). Canon padding lives in `ModalSheet.presets.ts`.

## Пов'язані файли

| Файл | Роль |
|------|------|
| `packages/client/src/styles.css` | `@theme` → `--color-ui-*`; `--tma-inset-*` safe-area sum |
| `packages/client/tailwind.config.ts` | safe-area padding, анімації, шрифти |
| `packages/client/src/context/GameContext.tsx` | runtime `setProperty('--ui-*', …)` |
| `packages/client/src/constants/themes.ts` | `THEME_CONFIG` — 5 базових кольорів + optional `elevated` / premium `accentAlt` / `accentWarm` |
| `packages/client/src/components/typography/ScreenTitle.tsx` | Screen / section heading primitive (TYPO-001 Phase 2) |
| `packages/client/src/constants/typography.ts` | `typographyClass`, `typographyTokens` (TYPO-001) |
| `packages/client/src/constants/surfaceClasses.ts` | `SURFACE_PANEL_CLASS`, `SURFACE_CARD_CLASS`, nav row / accent CTA (LAYOUT-001) |
| `packages/client/src/constants/footerLayout.ts` | Footer island presets: `footerIslandClassName()` (LAYOUT-001) |
| `packages/client/src/constants/screenLayout.ts` | Screen body layout presets (LAYOUT-001) |
| `packages/client/src/constants/spacing.ts` | Vertical rhythm fragments: `screenBodyPy`, `sectionGap*` (LAYOUT-001 Phase 6) |
| `packages/client/src/constants/tmaLayoutConstants.ts` | TMA header/footer SSOT: `HEADER_ROW_MIN_PX`, `TG_CHROME_GUTTER_PX`, `APP_HEADER_BAR_PX`, `--app-page-header-height` helpers |
| `packages/client/src/types.ts` | `ThemeConfig.tokens` |
| `.cursor/rules/02-react.mdc` | React + Tailwind стандарти |
