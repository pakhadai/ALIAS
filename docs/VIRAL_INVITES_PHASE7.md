# Фаза 7 — Віральні запрошення в лоббі (Telegram Mini App deep linking)

## Що реалізовано

### 1) Парсинг `start_param` (Telegram Mini App)
- Джерело: `window.Telegram.WebApp.initDataUnsafe.start_param`
- Де: `packages/client/src/hooks/useTelegramApp.ts`
- Результат: хук повертає `startParam: string | null`, який можна читати в будь-якому місці фронтенду.

### 2) Кнопка “💌 Запросити друзів” у лоббі
- Де: `packages/client/src/screens/lobby/components/OnlineLobbyIntro.tsx`
- Логіка кліку: `packages/client/src/screens/lobby/LobbyScreen.tsx`
- Формується deep link до Mini App з параметром:
  - `startapp=lobby_<roomCode>`
- Викликається нативний share Telegram:
  - `window.Telegram.WebApp.openTelegramLink("https://t.me/share/url?...")`

ENV:
- `VITE_TG_APP_LINK` — базовий URL Mini App (формат `https://t.me/<bot_username>/app`)
- Для monorepo зручно зберігати в root `.env` — `packages/client` завантажує env через `envDir` у `packages/client/vite.config.ts`.

### 3) Автоматичний вхід у кімнату по запрошенню
- Де: `packages/client/src/App.tsx`
- Умова:
  - користувач авторизований
  - `startParam` починається з `lobby_`
  - поточний екран `GameState.MENU`
- Дії:
  - дістаємо `roomCode`
  - перевіряємо валідність (довжина + тільки цифри)
  - `checkRoomExists(roomCode)` → якщо ок, то `setRoomCode(roomCode)` і `setGameState(GameState.ENTER_NAME)`
- Захист від зациклення:
  - параметр обробляється одноразово через `consumedStartParamRef`

## Як протестувати

### Локально
1. Додай у root `.env`:
   - `VITE_TG_APP_LINK=https://t.me/<bot_username>/app`
2. Запусти клієнт (`packages/client`) і створи/зайди в online-лоббі.
3. Натисни “💌 Запросити друзів”:
   - має відкритися Telegram share з лінком, який містить `startapp=lobby_<roomCode>`.
4. Відкрий цей лінк у Telegram:
   - після авторизації застосунок має перейти до `ENTER_NAME` для відповідної кімнати.

