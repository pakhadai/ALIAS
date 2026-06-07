# TMA layout — safe area та shared primitives

> Короткий гайд для Telegram Mini App і PWA. Деталі padding-ключів: [`UI_TOKENS.md`](./UI_TOKENS.md#safe-area-utilities-tma--pwa). Правила: [`.cursor/rules/06-tma.mdc`](../.cursor/rules/06-tma.mdc).

## Primitives

| Компонент | Шлях | Призначення |
|-----------|------|-------------|
| `ScreenShell` | `packages/client/src/components/layout/ScreenShell.tsx` | Повноекранна оболонка: `min-h-[var(--tg-viewport-height,100dvh)]`, scroll-колонка з `pt-safe-top` + `pb-safe-bottom` |
| `FixedBottomBar` | `packages/client/src/components/layout/FixedBottomBar.tsx` | Fixed footer з `pb-safe-bottom*` і `pointer-events-none` / `pointer-events-auto` (як PreRoundScreen) |

```tsx
import { ScreenShell, FixedBottomBar } from '../components/layout';

<ScreenShell className={currentTheme.bg} footer={<FixedBottomBar>{/* CTA */}</FixedBottomBar>}>
  {/* scrollable content */}
</ScreenShell>
```

## Коли `pt-safe-top` vs `pt-env-top`

| Utility | Мінімум | Коли |
|---------|---------|------|
| `pt-safe-top` / `pb-safe-bottom` | 1.5rem | Лобі, меню, налаштування, fixed footer — «звичайні» екрани |
| `pt-env-top` / `pb-env-bottom` | немає | **PlayingScreen** — повноекранна гра, максимум контенту; raw inset без `max(1.5rem, …)` |

PlayingScreen навмисно використовує `pt-env-top pb-env-bottom`, щоб не додавати зайвий 1.5rem поверх Telegram UI.

## Fixed footer

- Завжди `pb-safe-bottom` або `pb-safe-bottom-8` на **fixed** bottom bar — ніколи лише `p-6` / `pb-8`.
- Патерн кліків: зовнішній `pointer-events-none`, внутрішній контент `pointer-events-auto` (`FixedBottomBar` робить це за замовчуванням).
- Опційний gradient — `FixedBottomBar` prop `gradient`.

## Клавіатура

`useVisualViewportBottomInset()` + `keyboardAvoidingBottomPadding(inset)` з `hooks/useVisualViewportBottomInset.ts`:

- Повертає inline `paddingBottom: calc(keyboardPx + safe-area)` коли клавіатура перекриває viewport.
- Використовуй на bottom sheet / full-page з інпутами (LobbyScreen, MenuScreen, EnterNameScreen, JoinInputScreen).

## Заборони

| Заборонено | Замість |
|------------|---------|
| `pb-8` / `p-6` на **fixed bottom** без safe | `pb-safe-bottom` / `pb-safe-bottom-8` |
| `pb-8` замість safe на scroll shell (TMA) | `pb-safe-bottom` |
| `pb-env-bottom` на fixed game footer без мінімуму | `pb-safe-bottom` (або свідомий виняток з коментарем) |

Bootstrap viewport/safe-area: `useTelegramApp.ts` (`expand`, `safeAreaChanged`, `contentSafeAreaChanged`).

---

## Audit (grep 2026-06-07) — resolved (сесія 6/7)

| Файл | Було | Виправлено |
|------|------|------------|
| `SettingsScreen.tsx` | fixed bottom `p-6 md:p-8` | `ScreenShell` + `FixedBottomBar` |
| `PreRoundScreen.tsx` | `pb-8` shell + ручний fixed footer | `ScreenShell` + `FixedBottomBar` |
| `ImposterScreen.tsx` | `pb-8`, `min-h-dvh` без top inset | `pt-safe-top`, `pb-safe-bottom`, `min-h-[var(--tg-viewport-height,100dvh)]` |
| `LobbyScreen.tsx` | `pb-6 md:pb-8` | `pb-safe-bottom` |
| `TeamSetupScreen.tsx` | `pb-8` | `pb-safe-bottom` |
| `RoundSummaryScreen.tsx` | `pb-8` | `pb-safe-bottom` |
| `VSScreen.tsx` | `pb-8` | `pb-safe-bottom` |
| `GameOverScreen.tsx` | `pt-12` | `pt-safe-top` |
| `ClassicUI.tsx` | fixed footer `pb-env-bottom` | `pb-safe-bottom-sm` |
| `RulesModal.tsx` | sheet footer `pb-8` | `pb-safe-bottom-8` |

**Перевірено без змін (вже коректно):** `ConnectionStatusBanner` (raw `top` inset), `PwaUpdateBanner` (`pb-safe-bottom-sm`), `ModalSheet` (`pb-safe-bottom-8`), `LogoutConfirmBottomSheet`.

**Свідомий виняток:** `PlayingScreen` — `pt-env-top pb-env-bottom` (максимум ігрового поля, див. таблицю вище).
