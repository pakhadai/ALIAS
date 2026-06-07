# TMA layout — safe area та shared primitives

> Короткий гайд для Telegram Mini App і PWA. Деталі padding-ключів: [`UI_TOKENS.md`](./UI_TOKENS.md#safe-area-utilities-tma--pwa). Правила: [`.cursor/rules/06-tma.mdc`](../.cursor/rules/06-tma.mdc).

## Primitives

| Компонент | Шлях | Призначення |
|-----------|------|-------------|
| `ScreenShell` | `packages/client/src/components/layout/ScreenShell.tsx` | Повноекранна оболонка: **фіксована** `h/max-h-[var(--tg-viewport-height,100dvh)]`, scroll-колонка `flex-1 min-h-0 overflow-y-auto` + `pt-safe-top` / `pb-safe-bottom` |
| `FixedBottomBar` | `packages/client/src/components/layout/FixedBottomBar.tsx` | Fixed footer з `pb-safe-bottom*` і `pointer-events-none` / `pointer-events-auto` (як PreRoundScreen) |
| `ModalSheet` | `packages/client/src/components/ModalSheet.tsx` | Edge-to-edge bottom sheet: панель від фізичного низу екрана; safe area **лише всередині** контенту (`pb-modal-bottom`) |

**Canonical приклад (2026-06-07):** `LobbyScreen` — `ScreenShell` + scroll main + `FixedBottomBar` (Start CTA / guest waiting), invite/add-player sheets з `useVisualViewportBottomInset`, nested QR через `ModalSheet` (`zLayer="modalNested"`).

```tsx
import { ScreenShell, FixedBottomBar } from '../components/layout';

<ScreenShell className={currentTheme.bg} footer={<FixedBottomBar>{/* CTA */}</FixedBottomBar>}>
  {/* scrollable content */}
</ScreenShell>
```

## Bottom sheets (`ModalSheet`)

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

Inset формула (канон): **`--tma-inset-*` = content (Telegram UI) + device (notch / `env()`)** — не `max()`.  
Визначення: `packages/client/src/styles.css` (`--tma-inset-top` …); Tailwind `env-*` / `safe-*` посилаються на ці змінні.

| Utility | Мінімум | Коли |
|---------|---------|------|
| `pt-safe-top` / `pb-safe-bottom` | 1.5rem | Лобі, меню, налаштування, fixed footer — «звичайні» екрани |
| `pt-env-top` / `pb-env-bottom` | немає | **PlayingScreen**, fixed TMA headers — raw inset без `max(1.5rem, …)` |
| `pb-modal-bottom` | 1rem | **ModalSheet** контент і footer з кнопками |
| `pl-env-left` / `pr-env-right` | немає | Fixed header з іконками справа (MenuScreen) — уникати колізії з Telegram «⋯» |

PlayingScreen навмисно використовує `pt-env-top pb-env-bottom`, щоб не додавати зайвий 1.5rem поверх Telegram UI.

**MenuScreen fixed header:** `pt-env-top pl-env-left pr-env-right`; spacer `calc(var(--tma-inset-top) + 3.5rem)`.

## Fixed footer

- Завжди `pb-safe-bottom` або `pb-safe-bottom-8` на **fixed** bottom bar — ніколи лише `p-6` / `pb-8`.
- Патерн кліків: зовнішній `pointer-events-none`, внутрішній контент `pointer-events-auto` (`FixedBottomBar` робить це за замовчуванням).
- Опційний gradient — `FixedBottomBar` prop `gradient`.

## Клавіатура

`useVisualViewportBottomInset()` + `keyboardAvoidingBottomPadding(inset)` з `hooks/useVisualViewportBottomInset.ts`:

- Повертає inline `paddingBottom: Npx` (висота клавіатури) коли клавіатура перекриває viewport.
- Використовуй на bottom sheet / full-page з інпутами (LobbyScreen, MenuScreen, EnterNameSheet, JoinInputScreen).
- **Не** викликай `scrollIntoView({ block: "center" })` на інпутах у bottom sheet — `ModalSheet` має `data-bottom-sheet-backdrop`; padding вже піднімає панель, scroll backdrop зсуває її занадто високо.
- Під час відкритої клавіатури backdrop не скролиться (`overflow: hidden` + reset `scrollTop` при зміні inset).

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
