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

### 2b) QR-код і copy-link (PWA `?room=`)
- Генерація: хук `packages/client/src/screens/lobby/useLobbyQrCode.ts` (`qrcode` → data URL)
- URL: `buildRoomJoinUrl` у `packages/client/src/utils/roomJoin.ts`
  - За замовчуванням — поточний `window.location` (origin + path, без query/hash) + `?room=<code>`
  - У prod Docker — **`VITE_PUBLIC_APP_URL`** (канонічний `https://DOMAIN`), щоб QR у TMA не вказував на dev/staging origin
- UI:
  - Invite sheet: кнопка QR disabled + spinner під час генерації; при помилці — «Спробувати знову» (`retry`)
  - Модалка QR: retry inline, якщо генерація впала після відкриття
- Стани: `idle` | `loading` | `ready` | `error`; async з cancellation (без stale QR при зміні коду кімнати)
- **Не плутати** з Telegram-інвайтом: QR відкриває браузер/PWA, не Mini App напряму

ENV:
- `VITE_PUBLIC_APP_URL` — опційно; рекомендовано `https://<DOMAIN>` у `.env.prod` / Docker build args
- `VITE_TG_APP_LINK` — базовий URL Mini App (формат `https://t.me/<bot_username>/app`)
- Для monorepo зручно тримати секрети в кореневому **`.env.prod`** — сервер читає його з кореня; Vite підхоплює той самий файл при старті (`vite.config.ts`).

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
1. Додай у кореневий `.env.prod`:
   - `VITE_TG_APP_LINK=https://t.me/<bot_username>/app`
2. Запусти клієнт (`packages/client`) і створи/зайди в online-лоббі.
3. Натисни “💌 Запросити друзів”:
   - має відкритися Telegram share з лінком, який містить `startapp=lobby_<roomCode>`.
4. Відкрий цей лінк у Telegram:
   - після авторизації застосунок має перейти до `ENTER_NAME` для відповідної кімнати.

### QR і copy-link
1. Online-лобі → «Запросити друзів» → кнопка **QR-код**:
   - під час генерації — disabled + spinner;
   - після успіху — відкриває модалку з QR;
   - при помилці — «Спробувати знову» (invite sheet і модалка).
2. Перевір, що QR/copy-link ведуть на `https://<DOMAIN>/?room=<code>` (у prod — через `VITE_PUBLIC_APP_URL`).
3. Відскануй QR з іншого телефону → має відкритися PWA з deep link `?room=`.
