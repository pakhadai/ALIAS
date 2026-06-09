# TMA layout — safe area та shared primitives

> Короткий гайд для Telegram Mini App і PWA. Деталі padding-ключів: [`UI_TOKENS.md`](./UI_TOKENS.md#safe-area-utilities-tma--pwa). Правила: [`.cursor/rules/06-tma.mdc`](../.cursor/rules/06-tma.mdc).

## Primitives

| Компонент | Шлях | Призначення |
|-----------|------|-------------|
| `ScreenShell` | `packages/client/src/components/layout/ScreenShell.tsx` | Повноекранна оболонка: scroll-колонка `flex-1 min-h-0 overflow-y-auto`; `header` і `footer` — **sticky всередині scroll** (glass бачить контент при скролі); `contentClassName` лише на body wrapper |
| `AppHeader` / `GlassAppHeader` | `packages/client/src/components/layout/GlassAppHeader.tsx` | Повноширинний flat bar зверху: `pt-safe-top`, `.ui-app-header` |
| `FixedBottomBar` | `packages/client/src/components/layout/FixedBottomBar.tsx` | In-flow footer: `pb-safe-bottom*`; prop `glass` → `.ui-app-footer` (дзеркало header); без `glass` — gradient wash (PreRoundScreen) |
| `ModalSheet` | `packages/client/src/components/ModalSheet.tsx` | Edge-to-edge bottom sheet: панель від фізичного низу екрана; safe area **лише всередині** контенту (`pb-modal-bottom`) |

**Canonical приклад (2026-06-08):** `LobbyScreen` — glass header + scroll + glass footer з `LobbyStartPanel`, invite/add-player sheets, nested QR.

```tsx
import { ScreenShell, FixedBottomBar, AppHeader } from '../components/layout';
import { LobbyStartPanel } from './components/LobbyStartPanel';

<ScreenShell
  className={currentTheme.bg}
  header={<AppHeader left={...} center={...} right={...} />}
  contentClassName="px-4"
  footer={
    <FixedBottomBar glass contentClassName="max-w-sm mx-auto w-full">
      <LobbyStartPanel readiness={...} t={...} theme={...} onStartTap={handleStartTap} />
    </FixedBottomBar>
  }
>
  {/* scrollable content — at scroll=0 starts below header, ends above footer */}
</ScreenShell>
```

## Glass app chrome (header + footer)

> **Статус:** ✅ канон з 2026-06-08 (Lobby host). Токени: [`UI_TOKENS.md` — App chrome](./UI_TOKENS.md#app-chrome-glass-header--footer).

### Чому sticky всередині scroll

`backdrop-filter` бачить лише пікселі **в тому ж scroll-контейнері**. Якщо header/footer — сиблінги scroll-колонки, під blur лише `--ui-bg` shell → «суцільна плита» без frosted glass.

**Канон:**

```
ScreenShell (flex col, fixed h)
└── scroll column (overflow-y-auto, flex flex-col)
    ├── header     → position: sticky; top: 0     (.ui-app-header)
    ├── content    → flex-1 wrapper + contentClassName
    └── footer     → position: sticky; bottom: 0  (.ui-app-footer, FixedBottomBar glass)
```

| Інваріант | Правило |
|-----------|---------|
| scroll=0 | Контент **під** заголовком і **над** footer — без negative margin overlap |
| При скролі | Контент проходить під sticky glass → blur + tint |
| Full-width chrome | `contentClassName` (напр. `px-4`) **не** на header/footer — лише на body wrapper |
| Safe area | Header: title row `min-height: var(--tma-content-safe-top)` на `GlassAppHeader` (без окремого `pt-device-top`); footer: `pb-safe-bottom` на `FixedBottomBar`; scroll **без** `pt/pb-safe-*` коли є header/footer |
| Rounded capsule | **Не** для app chrome — flat edge-to-edge. Окремо лишається `.ui-glass-panel` (bottom sheets, nested panels) |

### CSS-класи (`styles.css`)

| Клас | Роль |
|------|------|
| `.ui-app-header` | Sticky top; `::before` blur + mask feather вниз; `::after` tint `--ui-bg` |
| `.ui-app-footer` | Sticky bottom; дзеркальні gradient/mask (feather **зверху**) |
| `.ui-glass-panel` | **Окремий** патерн — rounded inset panel (ModalSheet-adjacent, **не** app header/footer) |

**Tuning vars:** `--ui-app-header-opacity-top/bottom`, `--ui-app-header-blur`, `--ui-app-footer-*` (footer — ті самі імена з префіксом `footer`).

**Fallback:** `@supports not (backdrop-filter)` і `prefers-reduced-transparency: reduce` → gradient-only wash без blur.

**Toasts:** `GlassAppHeader` виставляє `data-app-header` на `<html>` → `--app-page-header-height` (measured) → `--tma-toast-top` нижче хедера.

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

**Guest + auth footer:** `FixedBottomBar glass`, `contentClassName="max-w-sm mx-auto w-full"`; confirm через `LogoutConfirmBottomSheet` (різні title/labels для guest vs auth).

### Заборони (glass chrome)

| Заборонено | Чому |
|------------|------|
| Header/footer **над/під** scroll як flex-sibling | Blur не бачить контент |
| Negative margin overlap для «штучного» glass | Ламає layout at scroll=0 |
| `--ui-overlay-tint-base` sepia на app header/footer | Занадто «матова підкладка» |
| `disabled` на start CTA | Блокує tap → toast hint |
| Дубль `firstBlockingReason` над кнопкою + toast | Шум; канон — лише toast |

### Manual QA (TMA @375px)

- [ ] Lobby host: scroll teams — контент просвічує крізь header **і** footer
- [ ] scroll=0: «ЛОБІ» відокремлено; room code нижче header; CTA не перекриває перший блок
- [ ] 1 гравець: tap start → toast «мінімум 2 гравці»; lock icon на кнопці
- [ ] Ready: спокійна червона змійка по краю кнопки
- [ ] `prefers-reduced-transparency` / без backdrop-filter: gradient fallback, CTA читабельний

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

## Fixed footer

- Завжди `pb-safe-bottom` або `pb-safe-bottom-8` на bottom bar — ніколи лише `p-6` / `pb-8`.
- Патерн кліків: зовнішній `pointer-events-none`, внутрішній контент `pointer-events-auto` (`FixedBottomBar` за замовчуванням).
- **Gradient wash:** `FixedBottomBar` prop `gradient={true}` (default) — PreRoundScreen, Settings.
- **Glass footer:** `FixedBottomBar glass` — sticky `.ui-app-footer` всередині scroll; еталон — Lobby `LobbyStartPanel`. Див. [Glass app chrome](#glass-app-chrome-header--footer).

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

Bootstrap viewport/safe-area: `useTelegramApp.ts` (`expand`, `safeAreaChanged`, `contentSafeAreaChanged`).

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
| `PROFILE_SETTINGS` | **A** ✅ | `AppHeader` + title | **show** → PROFILE | `FixedBottomBar` Save | Фаза 3a ✅ |
| `LOBBY_SETTINGS` | **A** ✅ | `AppHeader` + title; reset у `right` slot | **show** → LOBBY або MENU | `FixedBottomBar` Save | Фаза 3a ✅; browser `onBack` = TMA matrix |
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
| `LazyRouteFallback` | **D** | Немає chrome | Loading copy |

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
| `TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX` | 88 | Fallback `--tg-content-safe-area-inset-top` / `--tma-content-top-floor` коли SDK не ready |
| `HOME_CARD_TOP_GAP_PX` | 16 | Зазор home card body padding (`MenuScreen` Phase 4 ✅) |

### `--app-home-card-top`

| Джерело | Значення |
|---------|----------|
| **CSS** (`styles.css`) | `calc(var(--tg-content-safe-area-inset-top, 88px) + 16px)` |
| **Runtime usage** | `MenuScreen` main `paddingTop: HOME_CARD_TOP_GAP_PX` below sticky `AppHeader` |

Helper: `appHomeCardTopCss()`.

### `--tma-inset-top` (Phase 5)

| Джерело | Значення |
|---------|----------|
| **CSS** (`styles.css`) | `calc(var(--tg-content-safe-area-inset-top, var(--tma-content-top-floor, 88px)) + device-inset)` |
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
| **5 — TMA hardening** | ✅ 2026-06-08 | 88px floor, back matrix, toast/banner offset |
| **6 — Verification** | pending | grep gates, tests, manual @375px |

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
