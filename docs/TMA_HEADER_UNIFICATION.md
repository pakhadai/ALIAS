# TMA Header Unification — план фаз (OMR → Alias)

> **Мета:** уніфікувати хедери в `@alias/client`, взявши з Oh My Revit (OMR) SSOT константи, формули висоти, TG gutter і матрицю екранів — **без** зміни нашого канону **sticky glass у scroll** (не portal fixed).
>
> **Канон layout:** [`TMA_LAYOUT.md`](./TMA_LAYOUT.md#glass-app-chrome-header--footer) · **Еталон:** `packages/client/src/screens/lobby/LobbyScreen.tsx`
>
> **Workflow:** [`.cursor/rules/04-workflow.mdc`](../.cursor/rules/04-workflow.mdc) — після кожної фази оновлюй `CURRENT_FOCUS.md`, `CHANGELOG.md` [Unreleased], `docs/daily/YYYY-MM-DD.md`.

## Що беремо з OMR

| Патерн OMR | Адаптація в Alias |
|------------|-------------------|
| `telegramLayoutConstants.ts` (SSOT) | `packages/client/src/constants/tmaLayoutConstants.ts` |
| `--tg-page-header-height` | `--app-page-header-height` (+ ResizeObserver у `GlassAppHeader`) |
| Формула title row `max(content−device, 44px)` | CSS fallback + helpers |
| `TG_CHROME_GUTTER_PX = 80` | padding title row у TMA |
| Browser back fallback | `AppHeader` `onBack` поза Telegram |
| Baseline floor 88px | fallback у CSS коли SDK не ready |
| Route / screen matrix | таблиця `GameState` у `TMA_LAYOUT.md` |
| Progressive glass on scroll | **optional / defer** — не блокер |

## Що НЕ беремо

- Portal fixed headers у `document.body`
- SSR static shells (Vite SPA, не Next.js)
- URL routing / `NavDesktop` / bottom tab bar OMR
- Desktop Telegram 428px column (`position: absolute`)

## Фази

| # | Назва | Scope | Залежності |
|---|-------|-------|------------|
| **0** | Audit + матриця | doc only, grep-звіт | — |
| **1** | Constants + `--app-page-header-height` | foundation, без screen migration | 0 |
| **2** | AppHeader API | TG gutter, back fallback, child row | 1 |
| **3a** | Menu / profile screens | rollout `ScreenShell` + `AppHeader` | 2 |
| **3b** | Lobby-adjacent + game non-playing | Settings, TeamSetup, summaries… | 2 |
| **4** | MenuScreen (home) | fixed → scrollable або unified constants | 1–2 |
| **5** | TMA hardening | floor, back matrix, toast offset | 3a–4 |
| **6** | Verification | automated + manual checklist | усі |

**3a і 3b** можна паралельно після фази 2.

---

## Фаза 0 — Audit і матриця

**Ціль:** інвентаризація без зміни TSX.

### Задачі

1. Класифікувати кожен screen у `packages/client/src/screens/**`:
   - **A)** `ScreenShell` + `AppHeader` (канон)
   - **B)** fixed header (`MenuScreen`)
   - **C)** ad-hoc `<header pt-safe-top>` у scroll body
   - **D)** без хедера / лише shell padding
   - **E)** game exception (`PlayingScreen` `pt-env-top`)

2. Додати в [`TMA_LAYOUT.md`](./TMA_LAYOUT.md) секцію **«Header matrix (GameState)»**:

   | GameState / Screen | Pattern | Header | BackButton (TMA) | Footer | Notes |

3. Оновити [`.cursor/CURRENT_FOCUS.md`](../.cursor/CURRENT_FOCUS.md) — план фаз 1–6.

### Вихід

- diff лише markdown
- короткий звіт gaps

### Перевірка

- матриця покриває всі `GameState` з UI chrome

---

## Фаза 1 — SSOT константи + формула висоти

**Ціль:** один SSOT для розмірів; синхронізація toast/spacer без magic rem.

### Константи (орієнтир OMR)

| Константа | Значення | Призначення |
|-----------|----------|-------------|
| `HEADER_ROW_MIN_PX` | 44 | мін. висота title row |
| `TG_CHROME_GUTTER_PX` | 80 | L/R clearance під нативні TG кнопки |
| `APP_HEADER_BAR_PX` | 60 | Legacy constant; header height = title row (`content-safe-top`) |
| `TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX` | 88 | fallback content-safe |
| `HOME_CARD_TOP_GAP_PX` | 16 | зазор home card (фаза 4) |

### Формула title row (оновлено 2026-06-09 — Bot API 8.0+)

```text
headerRowH = max(var(--tg-content-safe-area-inset-top, 88px), 44px)
totalHeaderHeight = headerRowH + [childRowPx?]
→ --app-page-header-height
```

Title центрується у повній content-safe зоні (без окремого `pt-device-top` — device вже в SDK inset).

### Задачі

1. Створити `packages/client/src/constants/tmaLayoutConstants.ts` + тести.
2. Оновити `packages/client/src/styles.css`:
   - `--app-page-header-height` (fallback)
   - `--tma-toast-offset-header` для `data-app-header` → нова змінна
3. `GlassAppHeader.tsx`: `useLayoutEffect` + `ResizeObserver` → писати measured height у `--app-page-header-height`.
4. Оновити `docs/UI_TOKENS.md`, `TMA_LAYOUT.md` (секція Constants).

### Не чіпати

- consumers screens

### Перевірка

```bash
pnpm typecheck
pnpm --filter @alias/client test
```

---

## Фаза 2 — AppHeader API

**Ціль:** OMR-поведінка в sticky `ui-app-header`.

### Нові props (`GlassAppHeader.tsx`)

| Prop | Default | Опис |
|------|---------|------|
| `title` | — | preset для center slot |
| `onBack` | — | browser + узгодження з `useTelegramBackButton` |
| `showBackInBrowser` | true | кнопка назад поза TMA |
| `children` | — | другий ряд (search/tabs — майбутнє) |
| `childRowHeightPx` | 44 | explicit height child row |
| `tgChromeGutter` | true | 80px gutter у TMA |

### CSS

- `.ui-app-header__title-row` — min-height 44px, padding-inline з constants
- `.ui-app-header__child-row` — height з prop
- ResizeObserver враховує child row

### Задачі

1. Розширити `AppHeader` / `GlassAppHeader`.
2. Рефактор `LobbyScreen` на новий API — поведінка 1:1.
3. Тести: TMA spacer vs browser back; child row → CSS var.

### Перевірка

```bash
pnpm typecheck
pnpm --filter @alias/client test
```

---

## Фаза 3a — Menu / profile screens

**Патерн:**

```tsx
<ScreenShell
  className={currentTheme.bg}
  header={<AppHeader title={...} onBack={() => setGameState(...)} />}
  contentClassName="px-6"
>
  {/* body без ad-hoc <header pt-safe-top> */}
</ScreenShell>
```

### Файли

- `ProfileScreen.tsx`
- `ProfileSettingsScreen.tsx`
- `PlayerStatsScreen.tsx`
- `MyDecksScreen.tsx`
- `MyWordPacksScreen.tsx`
- `LobbySettingsScreen.tsx`

### Правила

- `contentClassName` для `px`, **не** на header
- Back targets як у `useTelegramBackButton`
- TMA: лівий spacer / native BackButton — не дублювати логіку в UI

### Gate

```bash
rg "<header className=.*pt-safe-top" packages/client/src/screens/menu --glob "Profile*.tsx"
rg "<header className=.*pt-safe-top" packages/client/src/screens/menu --glob "My*.tsx"
# → 0 на migrated files
```

---

## Фаза 3b — Lobby-adjacent + game non-playing

### Файли

- `SettingsScreen.tsx` — header з scroll body → `ScreenShell` header slot
- `TeamSetupScreen.tsx`
- `JoinInputScreen.tsx`, `RulesScreen.tsx` (якщо в роутингу)
- `PreRoundScreen.tsx`
- `GameOverScreen`, `RoundSummaryScreen`, `VSScreen`, `CountdownScreen`, `ImposterScreen`, `ScoreboardScreen` — де є top chrome

### Винятки (не чіпати)

- **`PlayingScreen`** — `pt-env-top pb-env-bottom`
- **`MenuScreen`** — фаза 4
- **`AdminApp`** — defer або trivial sticky bar

### Перевірка

- оновити Header matrix у `TMA_LAYOUT.md` — ✅ migrated

---

## Фаза 4 — MenuScreen (home)

**Проблема:** fixed header + ручний spacer `calc(var(--tma-inset-top) + var(--tma-fixed-header-height))`.

### Варіант A (рекомендований)

- `ScreenShell` без fixed header
- Icon row у scrollable top / sticky `AppHeader` (icons right, empty center)
- Logo + CTA у scroll content
- прибрати fixed + spacer div
- `--app-home-card-top` = content-safe + 16px (документувати)

### Варіант B

- залишити fixed, але spacer з `tmaLayoutConstants` + `--app-page-header-height`

### Обов'язково

- `EnterNameSheet` overlay: `aria-hidden` / `pointer-events` як зараз
- Manual checklist: home @375px TMA

---

## Фаза 5 — TMA hardening

1. **`useTelegramApp.ts`** — floor 88px як CSS fallback (не ламати правило «не писати 0px»).
2. **`useTelegramBackButton.ts`** — звір з Header matrix; main без back: `MENU`, `ENTER_NAME`.
3. **Toast / banner** — `--tma-toast-top` + `ToastNotification.test.tsx`.
4. **Docs** — секції «Що взяли з OMR» / «Alias-specific»; таблиця computed heights.

### Що взяли з OMR

| Патерн OMR | Alias адаптація |
|------------|-----------------|
| `TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX = 88` | `--tma-content-top-floor` + `useTelegramApp` sync; fallback у `--tma-inset-top` |
| Route back matrix | `resolveTelegramBackAction()` ↔ `TMA_LAYOUT.md` Header matrix |
| Toast below header | `--tma-toast-top` + `data-app-header`; banner — `--tma-banner-top` |
| Never write 0px inset inline | `applyTelegramSafeAreaCssVars` skip ≤0; CSS floor handles first paint |

### Alias-specific (не OMR)

| Рішення | Чому |
|---------|------|
| Sticky glass **in scroll** (`ScreenShell`) | Не portal fixed headers |
| `leaveRoom()` для game flow back | Server-authoritative room lifecycle |
| Offline lobby `{ resetGameMode: false }` | Preserve offline session on TMA back |
| `ConnectionStatusBanner` shares header offset | Reconnect UX не перекриває `AppHeader` controls |

### Computed heights (runtime)

| CSS var | Fallback (SDK not ready) | Runtime override |
|---------|---------------------------|------------------|
| `--tma-content-top-floor` | `88px` | `useTelegramApp` → inline px from SSOT |
| `--tma-inset-top` | `content-floor + device-inset` | SDK `--tg-content-safe-area-inset-*` |
| `--app-page-header-height` | title row + inset + 3.75rem | `GlassAppHeader` ResizeObserver |
| `--tma-toast-top` | `max(0.75rem, inset) + offset` | `data-app-header` → header + 0.75rem |
| `--tma-banner-top` | `--tma-inset-top` | `data-app-header` → `--app-page-header-height` |

---

## Фаза 6 — Verification

### Automated

```bash
pnpm build:shared && pnpm typecheck
pnpm --filter @alias/client test
```

### Grep gates

```bash
# fixed headers (виняток: PlayingScreen)
rg "fixed left-0 right-0 top-0" packages/client/src/screens

# ad-hoc headers (виняток: PlayingScreen)
rg "<header className=.*pt-safe-top" packages/client/src/screens

# deprecated magic (має → 0 або comment)
rg "tma-fixed-header-height" packages/client/src
```

### E2E (якщо env ready)

```bash
pnpm --filter @alias/e2e test -- --grep @smoke
```

### Code review checklist

- [ ] Non-game screens: `ScreenShell` + `AppHeader` або задокументований виняток
- [ ] `--app-page-header-height` оновлюється на mount
- [ ] Toast не перекриває header
- [ ] Lobby 1:1 (TG spacer, browser X, settings)
- [ ] Glass blur при scroll
- [ ] `prefers-reduced-transparency` fallback

### Manual TMA @375px (owner device)

- [ ] Menu/home: logo, icons, safe area
- [ ] Profile → Settings → back
- [ ] Lobby: glass header + footer
- [ ] Settings: sticky header, save footer
- [ ] EnterName keyboard: header не стрибає

### Документація після фази 6

- `CHANGELOG.md` [Unreleased]
- `CURRENT_FOCUS.md` — phases done
- `AUDIT_RESULTS.md` — закрити related items

---

## Session prompts

Копіюй **один** блок на сесію. Повна специфікація — цей файл.

### Сесія 0

```
Виконай Фазу 0 з docs/TMA_HEADER_UNIFICATION.md — audit хедерів + Header matrix у TMA_LAYOUT.md. Без змін TSX. Онови CURRENT_FOCUS.md.
```

### Сесія 1

```
Виконай Фазу 1 з docs/TMA_HEADER_UNIFICATION.md — tmaLayoutConstants.ts, --app-page-header-height, GlassAppHeader ResizeObserver, тести, UI_TOKENS + TMA_LAYOUT. Без міграції screens. pnpm typecheck + client tests.
```

### Сесія 2

```
Виконай Фазу 2 з docs/TMA_HEADER_UNIFICATION.md — розшир AppHeader (TG gutter, onBack, child row), рефактор LobbyScreen 1:1, тести. pnpm typecheck + client tests.
```

### Сесія 3a

```
Виконай Фазу 3a з docs/TMA_HEADER_UNIFICATION.md — міграція menu/profile screens на ScreenShell + AppHeader. pnpm typecheck + client tests.
```

### Сесія 3b

```
Виконай Фазу 3b з docs/TMA_HEADER_UNIFICATION.md — Settings, TeamSetup, game non-playing screens. PlayingScreen не чіпати. pnpm typecheck + client tests.
```

### Сесія 4

```
Виконай Фазу 4 з docs/TMA_HEADER_UNIFICATION.md — MenuScreen home (варіант A або B з доку). EnterName overlay перевірити. pnpm typecheck + client tests.
```

### Сесія 5

```
Виконай Фазу 5 з docs/TMA_HEADER_UNIFICATION.md — TMA hardening (floor, back matrix, toast). pnpm typecheck + client tests.
```

### Сесія 6

```
Виконай Фазу 6 з docs/TMA_HEADER_UNIFICATION.md — повна verification (grep gates, tests, checklist, CHANGELOG, CURRENT_FOCUS).
```

---

## Посилання

- [TMA_LAYOUT.md](./TMA_LAYOUT.md)
- [UI_TOKENS.md](./UI_TOKENS.md)
- [TYPOGRAPHY_UNIFICATION.md](./TYPOGRAPHY_UNIFICATION.md)
- [`.cursor/rules/06-tma.mdc`](../.cursor/rules/06-tma.mdc)
- `packages/client/src/components/layout/GlassAppHeader.tsx`
- `packages/client/src/components/layout/ScreenShell.tsx`
- `packages/client/src/hooks/useTelegramBackButton.ts`
- `packages/client/src/hooks/useTelegramApp.ts`
