# TMA layout — safe area та shared primitives

> Короткий гайд для Telegram Mini App і PWA. Деталі padding-ключів: [`UI_TOKENS.md`](./UI_TOKENS.md#safe-area-utilities-tma--pwa). Правила: [`.cursor/rules/06-tma.mdc`](../.cursor/rules/06-tma.mdc).

## Primitives

| Компонент | Шлях | Призначення |
|-----------|------|-------------|
| `ScreenShell` | `packages/client/src/components/layout/ScreenShell.tsx` | Повноекранна оболонка: scroll-колонка `flex-1 min-h-0 overflow-y-auto`; `headerFixed` / `footerFixed` — chrome **поза** scroll через `GlassChromePortal` → `document.body`; без них — **sticky in-flow** (legacy prod); `contentClassName` лише на body wrapper |
| `AppHeader` / `GlassAppHeader` | `packages/client/src/components/layout/GlassAppHeader.tsx` | Повноширинний flat bar: `pt-safe-top`, `.ui-app-header`; prop `fixed` → `.ui-app-header--fixed` (pair з `headerFixed`) |
| `FixedBottomBar` | `packages/client/src/components/layout/FixedBottomBar.tsx` | Sticky glass: `glass` → `.ui-app-footer`; viewport island: `island` → `.footer-island` (pair з `footerFixed`); без `glass` — gradient wash (PreRoundScreen) |
| `ModalSheet` | `packages/client/src/components/ModalSheet.tsx` | Edge-to-edge bottom sheet: панель від фізичного низу екрана; safe area **лише всередині** контенту (`pb-modal-bottom`) |

**Canonical приклад (2026-06-08):** `LobbyScreen` — glass header + scroll + glass footer з `LobbyStartPanel`, invite/add-player sheets, nested QR.

```tsx
import { ScreenShell, FixedBottomBar, AppHeader } from '../components/layout';
import { footerIslandClassName } from '../../constants/footerLayout';
import { LobbyStartPanel } from './components/LobbyStartPanel';

<ScreenShell
  className="bg-ui-bg"
  layout="fullPx4"
  headerFixed
  footerFixed
  header={<AppHeader fixed left={...} center={...} right={...} />}
  footer={
    <FixedBottomBar island contentClassName={footerIslandClassName('narrow')}>
      <LobbyStartPanel readiness={...} t={...} theme={...} onStartTap={handleStartTap} />
    </FixedBottomBar>
  }
>
  {/* scrollable content — padding vars reserve chrome space at scroll=0 */}
</ScreenShell>
```

## Glass app chrome (header + footer)

> **Статус:** ✅ Liquid Glass epic Sessions 0–9 (2026-06-10). Токени: [`UI_TOKENS.md` — App chrome](./UI_TOKENS.md#app-chrome-glass-header--footer). Session prompts: [`LIQUID_GLASS_FIX_PROMPTS.md`](./LIQUID_GLASS_FIX_PROMPTS.md).

### Два режими chrome

| Режим | API | Де зараз | Коли використовувати |
|-------|-----|----------|----------------------|
| **Fixed (target)** | `ScreenShell` `headerFixed` + `AppHeader fixed`; `footerFixed` + `FixedBottomBar island` | Усі menu/lobby екрани з chrome + `ScoreboardScreen` (Micro B ✅) | Blur поза scroll; chrome не залежить від transformed предків; footer — floating capsule |
| **Sticky in-flow (legacy)** | `ScreenShell` без `*Fixed`; `AppHeader`; `FixedBottomBar glass` / gradient | `PreRoundScreen`, `VSScreen`, `RoundSummaryScreen`; game exceptions (`PlayingScreen`, `ImposterScreen`) | Контент проходить під sticky bar при скролі; blur бачить pixels у scroll-колонці |

**Fixed layout:**

```
ScreenShell (flex col, fixed h)
├── GlassChromePortal → document.body
│   └── header         → .ui-app-header--fixed
├── scroll column      → pt-[var(--app-page-header-height)] pb-[var(--footer-island-stack)]
│   └── content
└── GlassChromePortal → document.body
    └── footer         → .footer-island
```

`GlassChromePortal` (`layout/GlassChromePortal.tsx`) — той самий патерн що `ModalPortal`: fixed chrome не під `PageTransition` / іншими transformed предками, тому `backdrop-filter` бачить viewport. `GlassAppHeader` лишає `ResizeObserver` для `--app-page-header-height`.

**Sticky layout (legacy):**

```
ScreenShell (flex col, fixed h)
└── scroll column (overflow-y-auto, flex flex-col)
    ├── header     → position: sticky; top: 0     (.ui-app-header)
    ├── content    → flex-1 wrapper + contentClassName
    └── footer     → position: sticky; bottom: 0  (.ui-app-footer, FixedBottomBar glass)
```

| Інваріант | Fixed | Sticky |
|-----------|-------|--------|
| scroll=0 | Padding vars резервують місце під chrome | Контент під header і над footer |
| Blur джерело | Viewport-fixed шар (`glass.css`) | Scroll-колонка (контент під bar) |
| Transform предок | Portal + Session 1 (`GlassChromePortal`, `PageTransition` → `transform: none`) | Потребує відсутності persistent transform на предку |
| Footer форма | Rounded `.footer-island` + gyro sheen | Flat edge-to-edge `.ui-app-footer` |
| Rollout | Micro B ✅ (2026-06-10) | Лише transitional game-flow + pattern E exceptions |

**Спільні правила:** `contentClassName` (напр. `px-4`) **не** на header/footer — лише на body wrapper; safe area на `GlassAppHeader` title row і `FixedBottomBar` / island inset; rounded capsule **не** для flat sticky footer — лише `.footer-island` або `.ui-glass-panel` (sheets).

### CSS (`styles/glass.css` + `styles.css`)

| Клас | Роль |
|------|------|
| `.ui-app-header` | Direct `backdrop-filter` + `--glass-header-bg`; pseudos вимкнені |
| `.ui-app-header--fixed` | `position: fixed; top: 0; z-index: var(--z-liquid-chrome)` |
| `.ui-app-footer` | Direct blur (той самий патерн що header); sticky in-flow у `styles.css` |
| `.footer-island` | Fixed floating capsule; `--footer-island-stack` для scroll padding; gyro `::before` sheen |
| `.ui-glass-panel` | **Окремий** патерн — rounded inset panel (ModalSheet, **не** app chrome) |

**Z-index stack (low → high):** page content < `--z-status-banner` (25) < `--z-liquid-chrome` (30) < `--z-fx` (40) < `--z-banner` (60) < `--z-modal-low` (80) < `--z-modal` (100) < toast (1000). Reconnect banner: `.ui-status-banner` + `--tma-banner-top` = measured header height.

**Fallback:** `@supports not (backdrop-filter)` і `prefers-reduced-transparency: reduce` → opaque `--ui-bg` / rgba fill без blur (`glass.css`).

**Toasts / banner:** `GlassAppHeader` → `data-app-header` на `<html>` → `--app-page-header-height` (ResizeObserver) → `--tma-toast-top`, `--tma-banner-top`.

**TMA bootstrap:** `bootstrapTelegramMiniApp()` у `index.tsx` (sync `ready`/`expand` до `createRoot`); `useTelegramApp` — `viewportChanged` + `isExpanded`, safe-area listeners.

**Gyro:** `useGyroscope` лише коли змонтований `FooterIsland` (`FixedBottomBar island`); CSS vars `--gyro-x/y` cleared on unmount.

### Lobby start CTA (`LobbyStartPanel`)

Еталон host footer у `LobbyScreen`. Не дублює `ui-glass-panel` capsule — кнопка сидить у glass footer bar.

| Стан | UI | Поведінка |
|------|-----|-----------|
| **Blocked** (`variant="blocked"`, `!readiness.ok`) | Приглушений червоний фон (`.lobby-start-btn--blocked`, mix `--ui-accent` + `--ui-bg`); текст «Почати гру» + іконка **Lock** | **Без** `disabled` — tap → `handleStartTap` → toast з `firstBlockingReason`. **Без** рядка валідації над кнопкою (toast достатньо) |
| **Ready** (`variant="animated"`) | Повний accent CTA + `.accent-footer-cta-shell--ready` | Accent **snake** по периметру (`@property --snake-x/y`, radial-gradient, 3s); `prefers-reduced-motion` → статичне кільце |
| **Ready + overfill** | Зелений `LobbyReadinessBar` «Готово до старту» + warning `teamTooMany` | Warn-only, не блокує start |

```tsx
// LobbyScreen — handleStartTap
if (!lobbyReadiness.ok) {
  haptic.impactOccurred('light');
  if (lobbyReadiness.firstBlockingReason) showNotification(..., 'error');
  return;
}
sendAction({ action: 'START_GAME' });
```

### Profile session-end footer (`ProfileScreen`)

Єдиний glass footer для guest і auth — `AccentFooterCta variant="plain"` (без snake/pulse).

| Variant | Shell | Кнопка | Анімація | Де |
|---------|-------|--------|----------|-----|
| `animated` | `--ready` + pseudo | `lobby-start-btn--ready` + theme | `accent-cta-snake` | Lobby ready |
| `blocked` | `--blocked` | `lobby-start-btn--blocked` | `blocked-pulse` | Lobby `!ready` |
| `plain` | `--plain` (без pseudo) | `lobby-start-btn--plain` + theme | немає | Profile logout / guest reset |

**Deprecated:** `ready` / `blocked` boolean props — `variant` має пріоритет.

**Guest + auth footer:** `FixedBottomBar island` + `footerFixed`, `contentClassName={footerIslandClassName('narrow')}`; confirm через `LogoutConfirmBottomSheet` (різні title/labels для guest vs auth).

### Заборони (glass chrome)

| Заборонено | Чому |
|------------|------|
| Sticky chrome + header/footer як flex-sibling **поза** scroll без `*Fixed` API | Blur не бачить scroll-контент (fixed mode — навмисно поза scroll) |
| Persistent `transform` на предку chrome (крім GPU hint на самому bar) | Ізолює backdrop-filter — див. Session 1 |
| Negative margin overlap для «штучного» glass | Ламає layout at scroll=0 |
| `--ui-overlay-tint-base` sepia на app header/footer | Занадто «матова підкладка» |
| `disabled` на start CTA | Блокує tap → toast hint |
| Дубль `firstBlockingReason` над кнопкою + toast | Шум; канон — лише toast |

### Manual QA (TMA @375px)

**Automated (Vitest 285/285, 2026-06-10):** fixed chrome wiring (`ProfileSettingsScreen`, `LobbySettingsScreen`); banner below header (`ConnectionStatusBanner`); `LazyRouteFallback` safe-area padding; z-index tokens; gyro scope; TMA bootstrap mocks.

**Manual (owner, deferred):**

- [ ] Lobby host (sticky): scroll teams — контент просвічує крізь header **і** footer
- [ ] Profile/Lobby settings (fixed): island footer + fixed header blur на device
- [ ] Reconnect banner не перекриває header back/title
- [ ] scroll=0: «ЛОБІ» відокремлено; room code нижче header; CTA не перекриває перший блок
- [ ] 1 гравець: tap start → toast «мінімум 2 гравці»; lock icon на кнопці
- [ ] Ready: спокійна червона змійка по краю кнопки
- [ ] `prefers-reduced-transparency` / без backdrop-filter: opaque fallback, CTA читабельний
- [ ] Modal open: sheet завжди над glass chrome (z 30 vs 80+)

---

Панель **прилипає до низу viewport** (`justify-content: flex-end`, backdrop **без** `padding-bottom`). Мінімальний відступ контенту / кнопок від низу екрана — **внутрішній** `pb-modal-bottom` (`max(1rem, var(--tma-inset-bottom))`):

- `ModalSheet` з `paddedContent` (default): обгортка `px-5 pt-0 pb-modal-bottom`
- `paddedContent={false}`: footer / scroll-зона з `pb-modal-bottom` на останньому блоці контенту

**Drag handle (завжди):** один рядок зверху — `BottomSheetTopBar`: полоска по центру + опційний ✕ справа (`showClose`) на одній лінії (`min-height: 2.75rem`). Колір `--ui-sheet-handle` (сепія). `data-sheet-drag-handle` — swipe-to-dismiss.

**Не** використовуй `pb-safe-bottom` / `pb-safe-bottom-8` на backdrop або нижньому краї панелі — це знову «підніме» sheet над екраном.  
**Не** використовуй `pb-env-bottom` у modal content — на desktop inset може бути 0; для кнопок потрібен `pb-modal-bottom`.

Клавіатура: `keyboardAvoidingBottomPadding(inset)` додає на backdrop **лише** висоту клавіатури (`paddingBottom: Npx`); safe area вже в `pb-modal-bottom` всередині панелі.

### Уніфікація ModalSheet — roadmap

| Фаза | Статус | Scope |
|------|--------|-------|
| **0 — Audit** | ✅ 2026-06-07 | Матриця consumers, target contract, doc sync (без TSX) |
| **1a — Visual** | ✅ 2026-06-07 | Backdrop + panel glass, sheet `height: auto` — `styles.css` |
| **1b — API** | ✅ 2026-06-07 | `size` prop (`compact`/`default`/`tall`), built-in padding; `panelVariant` deprecated |
| **2 — Consumers** | ✅ 2026-06-07 | 16 call sites → `size`; прибрано ad-hoc padding / `max-h-[*dvh]` / `panelVariant` |
| **3 — Simple consumers** | ✅ 2026-06-07 | QuickJoin, LobbyInvite, fullscreen hint, QR → `compact`; add-player `default`; CTA cleanup |
| **3 — CTA** | ✅ 2026-06-07 | `LogoutConfirm` + admin confirm → `Button` (як `ConfirmationModal`) |
| **4 — Tall escape hatches** | ✅ 2026-06-07 | `LoginModal`→`default`, tall trio→`ModalSheetBody`/`Footer`; `PlayingPauseOverlay`; `EnterNameScreen` loading; `ImposterScreen` confirm |
| **4 — API cleanup** | ✅ 2026-06-07 | Видалено `panelVariant` / `--card` CSS |
| **5 — Verification** | ✅ 2026-06-07 | grep guards green; client **114/114**; typecheck green; E2E smoke **8/15** (3 enter-name→lobby — env/investigate) |
| **TMA smoke** | pending | Manual @375px на device (owner) — checklist Phase 5B |

**Target contract (Phase 1+):**

| `size` | `max-height` (панель) | Типовий padding | Коли |
|--------|----------------------|-----------------|------|
| `compact` | content-driven (sheet default min) | `px-5 text-center` для confirm | Confirm, pause overlay, QR |
| `default` | `min(88dvh, 820px)` (поточний `.bottom-sheet-panel--sheet`) | `px-5` | Форми, invite, списки |
| `tall` | `min(92dvh, 820px)` (єдиний tall preset) | `px-5` + `data-sheet-scroll` | Rules, settings, decks, login |

- **Горизонтальний padding:** канон `px-5` на всіх preset; `compact` додає `text-center`.
- **Ширина:** `compact` → `max-w-sm` за замовчуванням (override через `maxWidth`).
- **CTA:** `ConfirmationModal` — еталон (`Button` primary + ghost); danger → `variant="danger"`.
- **Backdrop glass:** stacked blur (`72px` + `36px`); **toned matte scrim** (`--ui-overlay-tint-base`, `saturate(0.76)`) — accent CTA не «світиться» крізь sheet.

**TMA-інваріанти (не ламати при міграції):** edge-to-edge panel, `pb-modal-bottom` всередині, `keyboardAvoidingBottomPadding` = лише keyboard px, nested `zLayer` (`modalNested`, `modalConfirm`).

### ModalSheet consumer audit (Phase 5, grep 2026-06-07)

16 call sites у `packages/client/src`. Усі на `size` preset; `panelClassName` — **0** consumers (escape hatch unused). `ModalSheet.presets.ts` — padding + default width.

| Consumer | `size` | zLayer | keyboard | Body/Footer split | CTA |
|----------|--------|--------|----------|-------------------|-----|
| `ConfirmationModal` | compact | modalConfirm | — | preset | Button ✅ |
| `LoginModal` | default | modal | — | `ModalSheetFooter` | Google OAuth |
| `LogoutConfirmBottomSheet` | compact | modalNested | — | preset | Button ✅ |
| `QuickBuyModal` | default | modal | — | preset | Button primary |
| `AppSettingsModal` | tall | modal | — | Body/Footer | — |
| `CustomDeckModal` | tall | modal | — | Body/Footer | raw (editor) |
| `RulesModal` | tall | modal | — | Body | tab raw |
| `LobbyInviteSheet` | compact | modal | — | preset | options |
| `AssignPlayerSheet` | default | modalNested | — | preset | ghost cancel |
| `QuickJoinSheet` | compact | modal | ✅ | preset | custom |
| `LobbyScreen` QR | compact | modalNested | — | preset | — |
| `LobbyScreen` add-player | default | modal | ✅ | preset | form |
| `MenuScreen` fullscreen hint | compact | modal | — | preset | — |
| `EnterNameSheet` | default | modal | ✅ | preset | Button submit (on frozen `MenuScreen`) |
| `PlayingPauseOverlay` | compact | modalLow | — | preset | tap resume |
| `AdminApp` confirm | compact | modalConfirm | — | preset | Button ✅ |

**Еталонні патерни:** `ConfirmationModal` (compact + CTA), tall split — `AppSettingsModal` / `RulesModal` (`paddedContent={false}` + `ModalSheetBody`/`Footer`).

**Tech debt (поза scope):** `EnterNameSheet` — `scrollElementIntoViewCentered` на input; focus trap / Esc — deferred. `CustomDeckModal` / `RulesModal` — частина raw CTA (editor/tabs).

## Коли `pt-safe-top` vs `pt-env-top`

Inset формула (канон, [Bot API 8.0+](https://core.telegram.org/bots/webapps#contentsafeareainset)): **`--tma-inset-top` = `--tg-content-safe-area-inset-top`** (відступ від верху viewport до контенту; notch + TG chrome вже всередині SDK value). **`--tma-device-inset-top`** — лише фізичний notch (`safeAreaInset` / `env()`); для header **не** додається окремо.  
**`GlassAppHeader`:** title row `min-height: max(var(--tma-content-safe-top), 44px)` + `align-items: center` — title на одній вертикалі з нативними TG кнопками.  
Визначення: `packages/client/src/styles.css`; Tailwind `safe-*` / `env-*` / `device-top`.

| Utility | Мінімум | Коли |
|---------|---------|------|
| `pt-safe-top` / `pb-safe-bottom` | 1.5rem | Лобі, меню, налаштування, fixed footer — «звичайні» екрани |
| `pt-env-top` / `pb-env-bottom` | немає | **PlayingScreen**, fixed TMA headers — raw inset без `max(1.5rem, …)` |
| `pb-modal-bottom` | 1rem | **ModalSheet** контент і footer з кнопками |
| `pl-env-left` / `pr-env-right` | deprecated | Раніше fixed MenuScreen — замінено на `AppHeader` TG gutter (фаза 4) |

PlayingScreen навмисно використовує `pt-env-top pb-env-bottom`, щоб не додавати зайвий 1.5rem поверх Telegram UI.

**MenuScreen (Phase 4 ✅):** `ScreenShell` + sticky `AppHeader` (icons right); `--app-home-card-top` = content-safe + 16px; toast via `data-app-header`.

## Footer island layout presets (LAYOUT-001 ✅)

SSOT: `packages/client/src/constants/footerLayout.ts` → `footerIslandClassName(preset)`. Canon tokens: [`UI_TOKENS.md` — Footer island presets](./UI_TOKENS.md#footer-island-presets).

| Preset | Classes | Коли |
|--------|---------|------|
| `narrow` | `max-w-sm mx-auto w-full` | Single primary CTA — lobby start (`LobbyScreen`), profile logout |
| `canonical` | `max-w-2xl mx-auto w-full` | Save bar, store trust strip, settings host footer (`ProfileSettingsScreen`, `LobbySettingsScreen`, `StoreScreen`, in-lobby `SettingsScreen`, `MyWordPacksScreen`) |
| `fullBleed` | `w-full px-6` | Full-width CTA row aligned with body `fullPx6` (`MyDecksScreen`, `ScoreboardScreen`, `TeamSetupScreen` + optional `space-y-4`) |

**Default `FixedBottomBar` (non-island):** `max-w-sm` — не змінювати без окремого epic.

**Grep gate (Phase 7):** `rg 'island contentClassName="max-w' packages/client/src/screens` → **0** (усі через `footerIslandClassName(`).

## Fixed footer

- Завжди `pb-safe-bottom` або `pb-safe-bottom-8` на bottom bar — ніколи лише `p-6` / `pb-8`.
- Патерн кліків: зовнішній `pointer-events-none`, внутрішній контент `pointer-events-auto` (`FixedBottomBar` за замовчуванням).
- **Gradient wash:** `FixedBottomBar` prop `gradient={true}` (default) — PreRoundScreen, Settings.
- **Glass footer (sticky):** `FixedBottomBar glass` — `.ui-app-footer` in-flow; еталон — Lobby `LobbyStartPanel`.
- **Footer island (fixed):** `FixedBottomBar island` + `footerFixed` — `.footer-island` capsule; еталон — settings screens. Див. [Glass app chrome](#glass-app-chrome-header--footer).

## Клавіатура

**`ModalSheet` (default):** вбудований `keyboardAvoiding` — `useVisualViewportBottomInset()` + `keyboardAvoidingBottomPadding` з `hooks/useVisualViewportBottomInset.ts`. Consumers **не** передають `backdropStyle` для клавіатури.

- Lift через CSS custom property `--sheet-keyboard-lift` на backdrop; `styles.css` анімує `padding-bottom` (`--ui-keyboard-anim-ms: 280ms`, sync з iOS keyboard).
- Overlap buffer `KEYBOARD_SHEET_OVERLAP_PX` (8px) — sheet і keyboard як одна поверхня.
- Контент лишається на `pb-modal-bottom`; при `data-keyboard-open='true'` CSS плавно зменшує inset до `1rem` (без class-swap `pb-4`).
- **Не** використовуй `autoFocus` на інпутах у sheet — `useDeferredSheetInputFocus` після enter-анімації (`BOTTOM_SHEET_ANIM_MS` = 400ms).
- Full-page з інпутами без sheet: `JoinInputScreen` — wrapper `.keyboard-avoiding-lift` + `keyboardAvoidingBottomPadding`.
- **Не** викликай `scrollIntoView({ block: "center" })` на інпутах у bottom sheet — `ModalSheet` піднімає панель сам.
- Scroll reset панелі — лише при переході keyboard open ↔ closed (не кожен кадр inset).
- `prefers-reduced-motion` — миттєвий settle без keyboard/sheet transition.
- Escape: `keyboardAvoiding={false}` на `ModalSheet` лише з обґрунтуванням.

## Заборони

| Заборонено | Замість |
|------------|---------|
| `pb-8` / `p-6` на **fixed bottom** без safe | `pb-safe-bottom` / `pb-safe-bottom-8` |
| `pb-8` замість safe на scroll shell (TMA) | `pb-safe-bottom` |
| `pb-safe-bottom*` на **краї** ModalSheet (backdrop / panel bottom) | Edge-to-edge panel + `pb-modal-bottom` всередині контенту |
| `pb-env-bottom` у ModalSheet content / footer | `pb-modal-bottom` (мін. 1rem + inset) |
| `pb-env-bottom` на fixed game footer без мінімуму | `pb-safe-bottom` (або свідомий виняток з коментарем) |

Bootstrap viewport/safe-area: `bootstrapTelegramMiniApp()` у `index.tsx` (sync `ready`/`expand` до `createRoot`); події в `useTelegramApp` (`viewportChanged` + `isExpanded`, `safeAreaChanged`, `contentSafeAreaChanged`).

---

## Header matrix (GameState)

> **Статус:** ✅ Phase 0 audit — 2026-06-08 (doc only). План міграції: [`TMA_HEADER_UNIFICATION.md`](./TMA_HEADER_UNIFICATION.md).

### Патерни (класифікація)

| Код | Патерн | Опис |
|-----|--------|------|
| **A** | `ScreenShell` + `AppHeader` | Канон sticky glass; safe area на `GlassAppHeader` (`pt-safe-top`); toast offset через `data-app-header` |
| **B** | Fixed header | `fixed left-0 right-0 top-0` поза scroll; ручний spacer (`--tma-fixed-header-height`) |
| **C** | Ad-hoc `<header>` у scroll body | Ручний title row + back у контенті; часто `pt-safe-top` на `<header>` |
| **C′** | `ScreenShell` + ad-hoc header у body | `ScreenShell` без `header` slot → `pt-safe-top` на scroll-колонці; nav row у `children` |
| **D** | Без nav header | Лише `pt-safe-top` / `pt-safe-bottom` на shell або `ScreenShell` без title row |
| **E** | Game exception | `PlayingScreen`: `pt-env-top pb-env-bottom`; game-specific chrome (progress bar, imposter mini-header) |

**Еталон A:** `LobbyScreen` — єдиний екран на каноні `ScreenShell` + `AppHeader` (станом на 2026-06-08).

### Матриця екранів

| GameState / Screen | Pattern | Header | BackButton (TMA) | Footer | Notes |
|------------------|---------|--------|------------------|--------|-------|
| `MENU` | **A** ✅ | `AppHeader` sticky: icons у `right`; empty center; `data-app-header` toast | **hide** | — | Фаза 4 ✅; logo + CTA у scroll; `HOME_CARD_TOP_GAP_PX` body padding |
| `ENTER_NAME` | **A** ✅ | Той самий `MenuScreen`; `AppHeader` + main `aria-hidden` + `pointer-events-none` | **hide** | — | `EnterNameSheet` overlay; не окремий route component |
| `PROFILE` | **A** ✅ | `AppHeader` (browser back → MENU); hero title у scroll | **show** → MENU | — | Фаза 3a ✅ |
| `PROFILE_SETTINGS` | **A+fixed** ✅ | `AppHeader fixed` + `headerFixed`; title | **show** → PROFILE | `FixedBottomBar island` + `footerFixed` Save | Liquid Glass Session 2 ✅ |
| `LOBBY_SETTINGS` | **A+fixed** ✅ | `AppHeader fixed`; reset у `right` slot | **show** → LOBBY або MENU | `FixedBottomBar island` Save | Liquid Glass Session 2 ✅; browser `onBack` = TMA matrix |
| `MY_WORD_PACKS` | **A** ✅ | `AppHeader` (list / locked / create variants) | **show** → MENU | `FixedBottomBar glass` create CTA | Фаза 3a ✅ |
| `PLAYER_STATS` | **A** ✅ | `AppHeader` + title | **show** → PROFILE або MENU | — | Фаза 3a ✅ |
| `STORE` | **A** ✅ | `AppHeader` + title; tabs у child row; browser back → MENU | **show** → MENU | `FixedBottomBar` Stripe trust | Фаза 3a post-6 ✅ |
| `MY_DECKS` | **A** ✅ | `AppHeader` (list / create) | **show** → MENU | `FixedBottomBar glass` create CTA | Фаза 3a ✅ |
| `RULES` | **A** ✅ | `AppHeader` (browser back → MENU); title у card | **show** → MENU | — | Фаза 3b ✅ |
| `JOIN_INPUT` | **A** ✅ | `AppHeader` + join form у scroll | **show** → MENU | keyboard lift wrapper | Фаза 3b ✅ |
| `LOBBY` | **A** ✅ | `AppHeader` glass: TG spacers / browser X / settings | **show** → `leaveRoom` | `FixedBottomBar glass` + `LobbyStartPanel` | Еталон; фаза 2 — API hardening |
| `SETTINGS` | **A** ✅ | `AppHeader` + title; reset у `right`; `settings-close` test id у browser | **show** → LOBBY | `FixedBottomBar` gradient + Save | Фаза 3b ✅ |
| `TEAMS` | **A** ✅ | `AppHeader` + title | **show** → LOBBY | `FixedBottomBar` shuffle + start | Фаза 3b ✅ |
| `VS_SCREEN` | **D** ✅ | `ScreenShell`; анімація VS; без nav chrome | **show** → `leaveRoom` | `FixedBottomBar` start CTA | Фаза 3b ✅ |
| `PRE_ROUND` | **D** ✅ | `ScreenShell` без header slot; контент only | **show** → `leaveRoom` | `FixedBottomBar` + exit CTA | Фаза 3b ✅ (вже був ScreenShell) |
| `PRE_ROUND` (IMPOSTER) | **E** | `ImposterScreen` + `ImposterMiniHeader`; shell `pt-safe-top` | **show** → `leaveRoom` | phase-specific | Не чіпати layout Playing-like |
| `COUNTDOWN` | **D** ✅ | `ScreenShell`; число по центру; IMPOSTER → `ImposterScreen` | **show** → `leaveRoom` | — | Фаза 3b ✅ (classic only) |
| `PLAYING` | **E** | `pt-env-top pb-env-bottom`; progress `<header>` без safe utility | **show** → `leaveRoom` | mode UI footer | **Свідомий виняток** — не мігрувати |
| `PLAYING` (IMPOSTER) | **E** | `ImposterScreen` phases | **show** → `leaveRoom` | — | Mini-header без `pt-safe-top` |
| `ROUND_SUMMARY` | **D** ✅ | `ScreenShell`; decorative `<header>` (title «Час вийшов») у body | **show** → `leaveRoom` | `FixedBottomBar` continue | Фаза 3b ✅ |
| `SCOREBOARD` | **A** ✅ | `AppHeader` + title | **show** → `leaveRoom` | `FixedBottomBar` next round | Фаза 3b ✅ |
| `GAME_OVER` | **D** ✅ | `ScreenShell`; trophy banner; без nav row | **show** → `leaveRoom` | inline share / menu CTA | Фаза 3b ✅ |

### Поза `GameState` (defer)

| Surface | Pattern | Header | Notes |
|---------|---------|--------|-------|
| `AdminApp` | ad-hoc | `border-b` sticky bar | Defer або trivial glass bar (фаза 3b) |
| `TelegramAuthLoadingScreen` | **D** | Немає chrome | Bootstrap only |
| `LazyRouteFallback` | **D** ✅ | `ScreenShell` skeleton (safe-area padding) | Liquid Glass Session 8 ✅ |

### Grep audit (2026-06-08)

| Метрика | Результат | Файли |
|---------|-----------|-------|
| `ScreenShell` + `AppHeader` | **7** screens | `LobbyScreen.tsx`, `ProfileScreen`, `ProfileSettingsScreen`, `PlayerStatsScreen`, `MyDecksScreen`, `MyWordPacksScreen`, `LobbySettingsScreen` |
| `ScreenShell` без `AppHeader` | **2** screens | `SettingsScreen.tsx`, `PreRoundScreen.tsx` |
| `fixed left-0 right-0 top-0` | **0** | — (MenuScreen migrated Phase 4) |
| `<header … pt-safe-top>` (ad-hoc) | **0** on nav chrome | Scoreboard migrated 3b |
| `pt-env-top` на screen shell | **1** | `PlayingScreen.tsx` |
| `--tma-fixed-header-height` consumers | **0** | removed Phase 4 |
| `data-app-header` (toast offset) | **13+** | `GlassAppHeader` on all `AppHeader` screens incl. Menu |

### Gaps (пріоритет міграції)

1. **Game flow E** — `PlayingScreen` / `ImposterScreen` залишаються винятками.
3. **`useTelegramBackButton`** — ✅ Phase 5 — `resolveTelegramBackAction()` aligned with Header matrix + browser `onBack`; `TELEGRAM_BACK_HIDDEN_STATES` = MENU, ENTER_NAME.

## Constants (TMA header SSOT)

Джерело: `packages/client/src/constants/tmaLayoutConstants.ts`. План: [`TMA_HEADER_UNIFICATION.md`](./TMA_HEADER_UNIFICATION.md).

| Константа | Значення | Призначення |
|-----------|----------|-------------|
| `HEADER_ROW_MIN_PX` | 44 | Мін. висота title row |
| `TG_CHROME_GUTTER_PX` | 80 | L/R clearance під нативні TG кнопки (Phase 2) |
| `APP_HEADER_BAR_PX` | 60 (`3.75rem`) | Legacy constant (історичний fallback); висота header = title row (`content-safe-top`) |
| `TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX` | **104** | Fallback `--tg-content-safe-area-inset-top` / `--tma-content-top-floor` коли SDK не ready (iOS / Android) |
| `TELEGRAM_DESKTOP_CONTENT_TOP_FLOOR_PX` | **0** | Desktop TMA fallback — нативний title bar поза WebView; довіряти SDK `contentSafeAreaInset` |
| `TELEGRAM_DESKTOP_DOCUMENT_FLAG` | `telegramDesktop` | `dataset` key → `data-telegram-desktop` на `<html>` |
| `HOME_CARD_TOP_GAP_PX` | 16 | Зазор home card body padding (`MenuScreen` Phase 4 ✅) |

Helpers: `isTelegramDesktopPlatform(platform)`, `resolveTelegramContentTopFloorPx(platform)` — desktop platforms: `tdesktop`, `macos`, `weba`, `webk`, `web`, `unigram`.

### `--app-home-card-top`

| Джерело | Значення |
|---------|----------|
| **CSS** (`styles.css`) | `calc(var(--tg-content-safe-area-inset-top, 104px) + 16px)` |
| **Runtime usage** | `MenuScreen` main `paddingTop: HOME_CARD_TOP_GAP_PX` below sticky `AppHeader` |

Helper: `appHomeCardTopCss()`.

### `--tma-inset-top` (Phase 5)

| Джерело | Значення |
|---------|----------|
| **CSS** (`styles.css`) | `calc(var(--tg-content-safe-area-inset-top, var(--tma-content-top-floor, 104px)) + device-inset)` |
| **Runtime** | `useTelegramApp` writes `--tma-content-top-floor` from SSOT; SDK insets when >0 (never 0px inline) |
| **Tailwind** | `pt-safe-top` → `max(1.5rem, var(--tma-inset-top))` |

Helper: `tmaInsetTopCss()`.

### `--app-page-header-height`

| Джерело | Значення |
|---------|----------|
| **CSS fallback** (`styles.css`) | `max(contentSafeTop, 44px)` [+ child row] |
| **Runtime** | `GlassAppHeader` → `ResizeObserver` → inline px на `<html>` |
| **Toast** (`data-app-header`) | `--tma-toast-offset-header` і `--tma-toast-top` від measured height |
| **Banner** (`data-app-header`) | `--tma-banner-top` = `--app-page-header-height` (reconnect banner below header) |

Helpers: `titleRowHeightCss()`, `appPageHeaderHeightFallbackCss()`, `appPageHeaderHeightInsetFallbackCss()`.

### Roadmap (TMA header unification)

| Фаза | Статус | Scope |
|------|--------|-------|
| **0 — Audit + matrix** | ✅ 2026-06-08 | Ця секція; без TSX |
| **1 — Constants + `--app-page-header-height`** | ✅ 2026-06-08 | `tmaLayoutConstants.ts`, ResizeObserver, toast sync |
| **2 — AppHeader API** | ✅ 2026-06-08 | TG gutter, `onBack`, child row; Lobby 1:1 |
| **3a — Menu / profile** | ✅ 2026-06-08 | Profile*, MyDecks, MyWordPacks, PlayerStats, LobbySettings |
| **3b — Lobby-adjacent + game non-playing** | ✅ 2026-06-08 | Settings, TeamSetup, JoinInput, PreRound, summaries… |
| **4 — MenuScreen home** | ✅ 2026-06-08 | fixed → `ScreenShell` + sticky `AppHeader`; `--app-home-card-top` |
| **5 — TMA hardening** | ✅ 2026-06-08 | 104px content-safe floor, back matrix, toast/banner offset |
| **6 — Verification** | ✅ 2026-06-11 | grep gates green; client **340/340**; `TMA_LAYOUT.md` floor synced (LAYOUT-001 Phase 7); manual @375px — owner |

---

## Desktop TMA

> **Статус:** ✅ Epic Sessions 0–9 (2026-06-12). Session prompts: [`TMA_DESKTOP_LAYOUT_FIX_PROMPTS.md`](./TMA_DESKTOP_LAYOUT_FIX_PROMPTS.md).  
> **Проблема (до fix):** на `tdesktop` / `macos` / web-клієнтах — header ~150–196px (mobile floor 104px), 80px title gutter, прозорий liquid glass chrome/modals.

### Detection і bootstrap

| Механізм | Де | Поведінка |
|----------|-----|-----------|
| `isTelegramDesktopPlatform(platform)` | `tmaLayoutConstants.ts` | `true` для `tdesktop`, `macos`, `weba`, `webk`, `web`, `unigram` |
| `data-telegram-desktop` на `<html>` | `bootstrapTelegramMiniApp()` у `useTelegramApp.ts` | Встановлюється на desktop; видаляється на mobile |
| `expand` / `requestFullscreen` | `useTelegramApp.ts` | **Пропускаються** на desktop (вікно, не immersive) |
| Content-top floor | `resolveTelegramContentTopFloorPx()` | Mobile **104px**; desktop **0px** (SDK-first) |

**Важливо:** desktop overrides через `html[data-telegram-desktop]` — **не** `@media (min-width: …)` (вікно TG desktop може бути вузьким).

### CSS policy (desktop vs mobile)

| Область | Mobile (`:not([data-telegram-desktop])`) | Desktop (`html[data-telegram-desktop]`) |
|---------|------------------------------------------|----------------------------------------|
| `--tma-content-safe-top` | `max(SDK inset, 104px floor)` | SDK inset або floor `0px` — без 104px clamp (`styles.css`) |
| AppHeader TG gutter | `data-tg-gutter` + 80px inline padding | Gutter **off** — content rail (`GlassAppHeader.tsx`) |
| Modal backdrop `padding-top` | `var(--tma-inset-top)` | `var(--tma-content-safe-top, 0px)` — sheet від верху WebView |
| Header / footer glass | Liquid glass feather + blur (`glass.css`) | Opaque **92%** fill, blur `::before` off, feather **0** |
| Modal glass | Stacked blur + gradient masks | Backdrop tint **85–90%**; panel **96%** `--ui-card`; top bar **92%** |
| `@supports not (backdrop-filter)` | Opaque fallback ≥90% tint | Той самий fallback + desktop opaque rules |

Джерела: `packages/client/src/styles.css`, `packages/client/src/styles/glass.css`.

### Automated coverage (Vitest)

| Файл | Що перевіряє |
|------|--------------|
| `tmaLayoutConstants.test.ts` | `tdesktop` → floor 0; `ios` / `undefined` → 104 |
| `useTelegramApp.test.ts` | Bootstrap floor + `data-telegram-desktop` attr |
| `GlassAppHeader.test.tsx` | Desktop без gutter; mobile з gutter |

Client tests **376/376** (2026-06-12); `pnpm typecheck` green.

### Manual QA checklist (owner)

Перевірити в Telegram Desktop (`tdesktop`) і за наявності — `macos`. Mobile regression — iOS TMA @375px або DevTools mobile emulation + `platform=ios` mock.

| # | Крок | Desktop (`tdesktop` / `macos`) | Mobile @375px |
|---|------|--------------------------------|---------------|
| 1 | **Menu home** — header height | Title band ~**44–60px**, не ~150px | ~**104px** content-safe band OK |
| 2 | **Lobby** — header + footer | Opaque chrome; CTA / room code читабельні | Liquid glass feather OK |
| 3 | **EnterName / Login** modal | Panel і backdrop не просвічують | Glass esthetic OK |
| 4 | **Light + dark** TG theme | Контраст header/footer/modal | Без регресії |
| 5 | **Modal stack** | Nested sheet (QR, add-player) — той самий opaque стиль | z-index над chrome |
| 6 | **Reconnect banner** | Під header, не перекриває back/title | Як раніше |
| 7 | **`@supports` / reduced transparency** | Opaque fallback usable (DevTools: disable backdrop-filter) | CTA читабельний |

**Швидка DevTools перевірка (desktop):**

```js
document.documentElement.getAttribute('data-telegram-desktop'); // "true"
getComputedStyle(document.documentElement).getPropertyValue('--tma-content-top-floor'); // "0px"
getComputedStyle(document.documentElement).getPropertyValue('--tma-content-safe-top');
```

### Anti-patterns (desktop epic)

| Заборонено | Чому |
|------------|------|
| `@media (min-width: 768px)` для TMA desktop | TG desktop window може бути вузьким |
| Зменшити mobile floor 104 → 88 | Регресія iOS Dynamic Island |
| `padding-top: 0` на всіх TMA modals | Зламає mobile modal clearance |
| Прибрати liquid glass на mobile | Out of scope — лише desktop overrides |

---

## Audit (grep 2026-06-07) — resolved (сесія 6/7)

| Файл | Було | Виправлено |
|------|------|------------|
| `SettingsScreen.tsx` | fixed bottom `p-6 md:p-8` | `ScreenShell` + `FixedBottomBar` |
| `PreRoundScreen.tsx` | `pb-8` shell + ручний fixed footer | `ScreenShell` + `FixedBottomBar` |
| `ImposterScreen.tsx` | `pb-8`, `min-h-dvh` без top inset | `pt-safe-top`, `pb-safe-bottom`, `min-h-[var(--tg-viewport-height,100dvh)]` |
| `LobbyScreen.tsx` | `pb-6 md:pb-8` | `pb-safe-bottom` → **Phase 1:** `ScreenShell` + `FixedBottomBar`, avatar strip |
| `TeamSetupScreen.tsx` | `pb-8` | `pb-safe-bottom` |
| `RoundSummaryScreen.tsx` | `pb-8` | `pb-safe-bottom` |
| `VSScreen.tsx` | `pb-8` | `pb-safe-bottom` |
| `GameOverScreen.tsx` | `pt-12` | `pt-safe-top` |
| `ClassicUI.tsx` | fixed footer `pb-env-bottom` | `pb-safe-bottom-sm` |
| `RulesModal.tsx` | sheet footer `pb-8` | `pb-env-bottom` (scroll footer) |

**ModalSheet edge-to-edge (2026-06-07):** backdrop без `padding-bottom`; контент `pb-modal-bottom`; keyboard lift — лише `keyboardPx`.

**Свідомий виняток:** `PlayingScreen` — `pt-env-top pb-env-bottom` (максимум ігрового поля, див. таблицю вище).
