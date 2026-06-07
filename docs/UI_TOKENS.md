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

## Safe-area utilities (TMA / PWA)

Визначення padding-ключів: [`packages/client/tailwind.config.ts`](../packages/client/tailwind.config.ts) (`theme.extend.padding`).

Порядок fallback у значеннях: `--tg-content-safe-area-inset-*` → `--tg-safe-area-inset-*` → `env(safe-area-inset-*)`. Ключі з мінімумом (`safe-*`) додають `max(…, 1rem–2rem)`; `env-*` — без мінімуму.

| Utility | CSS padding | Мінімум | Типове використання |
|---------|-------------|---------|---------------------|
| `pt-safe-top` / `pb-safe-top` | top / bottom | 1.5rem | Хедери екранів |
| `pt-safe-top-sm` / `pb-safe-top-sm` | top / bottom | 0.75rem | Тости, компактні відступи зверху |
| `pt-safe-top-md` / `pb-safe-top-md` | top / bottom | 1.25rem | Enter name sheet |
| `pt-safe-bottom` / `pb-safe-bottom` | bottom / top | 1.5rem | Fixed footer, bottom sheets |
| `pt-safe-bottom-sm` / `pb-safe-bottom-sm` | bottom | 1rem | Store footer |
| `pt-safe-bottom-md` / `pb-safe-bottom-md` | bottom | 1.25rem | — |
| `pt-safe-bottom-8` / `pb-safe-bottom-8` | bottom | 2rem | Modal sheets, admin panel |
| `pt-env-top` / `pb-env-top` | top / bottom | — | PlayingScreen, MenuScreen (raw inset) |
| `pt-env-bottom` / `pb-env-bottom` | bottom | — | ClassicUI footer, PlayingScreen |

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

## Пов'язані файли

| Файл | Роль |
|------|------|
| `packages/client/src/styles.css` | `@theme` → `--color-ui-*` для Tailwind 4 |
| `packages/client/tailwind.config.ts` | safe-area padding, анімації, шрифти |
| `packages/client/src/context/GameContext.tsx` | runtime `setProperty('--ui-*', …)` |
| `packages/client/src/constants/themes.ts` | `THEME_CONFIG` — 5 базових кольорів + optional `elevated` / premium `accentAlt` / `accentWarm` |
| `packages/client/src/types.ts` | `ThemeConfig.tokens` |
| `.cursor/rules/02-react.mdc` | React + Tailwind стандарти |
