# Довідник коду (Code Reference)

Повний перелік модулів, класів, функцій, типів і зовнішніх бібліотек проекту **Alias Master**. Доповнює [`README.md`](./README.md) (архітектура, запуск) і призначений для глибокого навігаційного пошуку під час розробки та написання тестів.

**Оновлено:** з урахуванням рефакторингу **режимів гри** (`GameMode`, `GameTask`, `server/src/modes/`, UI у `GameFlow/modes/`).

---

## Зміст

1. [Як користуватися цим документом](#як-користуватися-цим-документом)
2. [Зовнішні залежності за пакетом](#зовнішні-залежності-за-пакетом)
3. [Пакет `@alias/shared`](#пакет-aliasshared)
4. [Пакет `@alias/server`](#пакет-aliasserver)
5. [Пакет `@alias/client`](#пакет-aliasclient)
6. [Prisma та БД](#prisma-та-бд)
7. [Пакет `@alias/e2e`](#пакет-aliase2e)
8. [Тести сервера (Vitest)](#тести-сервера-vitest)

---

## Як користуватися цим документом

- **Модуль** = файл або логічна одиниця (роутер Express, набір хуків).
- Для **React-компонентів** описано публічний API (props), роль екрана та ключові побічні ефекти; внутрішні локальні функції в великих файлах зведено до ролі компонента.
- Сигнатури наведено у спрощеному вигляді; точні типи — у вихідному коді.
- Після цього довідника планується розширення **автотестів**; для кожного сервісного класу вказано відповідний файл `*.test.ts`, якщо він існує.

---

## Зовнішні залежності за пакетом

### Корінь монорепо (`package.json`)

Скрипти оркестрації; **немає** runtime-залежностей у `dependencies`. Інструмент: **pnpm** workspaces.

### `@alias/shared`

| Бібліотека | Роль |
|------------|------|
| `typescript` | Компіляція в `dist/`, лише типи та константи в runtime (після збірки — чистий JS без зовнішніх runtime deps у проді клієнта/сервера окрім re-export) |

Фактично shared після `tsc` не тягне npm-пакетів у runtime.

### `@alias/server`

| Бібліотека | Роль |
|------------|------|
| `@prisma/client` | ORM, доступ до PostgreSQL |
| `prisma` | CLI міграцій / generate |
| `express` | HTTP API |
| `socket.io` | WebSocket / long-polling, ігровий realtime |
| `@socket.io/redis-adapter` | Pub/Sub між інстансами Node |
| `ioredis` | Клієнт Redis |
| `cors` | CORS middleware |
| `dotenv` | Завантаження `.env` |
| `jsonwebtoken` | JWT створення/перевірка |
| `google-auth-library` | Перевірка Google ID token |
| `stripe` | Оплата, Checkout, webhooks |
| `zod` | Валідація socket payload та `UPDATE_SETTINGS` |
| `multer` | Upload файлів (custom decks) |
| `csv-parse` | Парсинг CSV при upload |
| `uuid` | Генерація `playerId`, room entities |
| `web-push` | Web Push (VAPID) |
| `express-rate-limit` | Ліміти на REST |

Dev: `tsx`, `vitest`, `socket.io-client`, типи для Node/Express тощо.

### `@alias/client`

| Бібліотека | Роль |
|------------|------|
| `react`, `react-dom` | UI |
| `vite`, `@vitejs/plugin-react` | Збірка та dev-сервер |
| `socket.io-client` | З'єднання з сервером |
| `@react-oauth/google` | Google Sign-In у браузері |
| `@stripe/stripe-js`, `@stripe/react-stripe-js` | Оплата в UI |
| `lucide-react` | Іконки |
| `qrcode` | Генерація QR для коду кімнати |

### `@alias/e2e`

| Бібліотека | Роль |
|------------|------|
| `@playwright/test` | E2E тести в Chromium |

---

## Пакет `@alias/shared`

Каталог: `packages/shared/src/`. Публічна точка: `index.ts` — реекспорт усіх підмодулів.

### `index.ts`

| Експорт | Опис |
|---------|------|
| `export * from './enums'` | Усі enum |
| `export * from './types'` | Інтерфейси та union-типи |
| `export * from './constants'` | Числові константи, кольори, MOCK_WORDS |
| `export * from './events'` | Контракти Socket.IO та `GameSyncState` |

### `enums.ts`

| Ім'я | Тип | Значення / призначення |
|------|-----|-------------------------|
| `GameState` | `enum` | Стани UI/гри: `MENU` … `GAME_OVER` (21 варіант) |
| `Language` | `enum` | `UA`, `DE`, `EN` |
| `Category` | `enum` | Категорії слів: `General`, `Food`, `Travel`, `Science`, `Movies`, `Custom` (рядкові значення для БД/схем) |
| `AppTheme` | `enum` | Візуальні теми додатку |
| `SoundPreset` | `enum` | `FUN`, `MINIMAL`, `EIGHT_BIT` |
| `GameMode` | `enum` | Режим слів/завдань: `CLASSIC`, `TRANSLATION`, `SYNONYMS`, `QUIZ` |

### `types.ts`

| Ім'я | Тип | Поля / призначення |
|------|-----|-------------------|
| `Player` | `interface` | `id`, `persistentId?`, `name`, `avatar`, `isHost`, `avatarId?`, `stats: { explained, guessed }` |
| `Team` | `interface` | `id`, `name`, `score`, `color`, `colorHex`, `players`, `nextPlayerIndex` |
| `GameTask` | `interface` | `id`, `prompt` (текст на екрані), `answer?`, `options?` (до 4 рядків для QUIZ) |
| `GameSettings` | `interface` | Як раніше, плюс `gameMode?: GameMode` (дефолт — класика), `targetLanguage?: Language` (зарезервовано для перекладу) |
| `RoundStats` | `interface` | `words[]`: `{ word, taskId?, result: 'correct' \| 'skipped' \| 'guessed' }`; решта без змін |
| `GameActionType` | union type | Усі дії з README, включно з `GUESS_OPTION` (payload: `data.selectedOption`) |
| `GameActionPayload` | `interface` | `{ action, data? }` |
| `NetworkActionType` | union type | Застарілий/допоміжний контракт мережі |
| `NetworkMessage` | `interface` | `{ type, payload }` |

### `events.ts`

| Ім'я | Тип | Опис |
|------|-----|------|
| `ClientToServerEvents` | `interface` | Типізація подій клієнт → сервер: `room:create`, `room:join`, `room:leave`, `room:rejoin`, `game:action` |
| `ServerToClientEvents` | `interface` | Події сервер → клієнт: `room:*`, `game:state-sync`, `game:notification`, `player:kicked: { playerId }` |
| `GameSyncState` | `interface` | Повний знімок кімнати: `currentWord`, **`currentTask: GameTask \| null`**, решта полів як у README |
| `InterServerEvents` | `interface` | Порожній (зарезервовано для кластера) |
| `SocketData` | `interface` | `userId?`, `playerId`, `playerName`, `roomCode` на об'єкті socket |

### `constants.ts`

| Ім'я | Тип | Опис |
|------|-----|------|
| `DEFAULT_ROUND_TIME` | `number` | 60 (секунд), довідкова константа |
| `WINNING_SCORE` | `number` | 30, довідкова |
| `ROOM_CODE_LENGTH` | `number` | 5 цифр |
| `MAX_PLAYERS` | `number` | 20 на кімнату |
| `TEAM_COLORS` | `array` | Об'єкти `{ class, hex }` для Tailwind-класів і кольору команд |
| `MOCK_WORDS` | `Record<Language, Partial<Record<Category, string[]>>>` | Резервні слова, якщо БД недоступна (клієнт офлайн + fallback на сервері через WordService) |

---

## Пакет `@alias/server`

Каталог: `packages/server/src/`.

### `config.ts`

| Експорт | Опис |
|---------|------|
| `config` | Об'єкт конфігурації з `process.env`: `port`, `nodeEnv`, **`serverInstanceId`** (`INSTANCE_ID` або випадковий UUID), **`roomActionRelayEnabled`** (`ROOM_ACTION_RELAY` не `0`/`false`/`no`), `redis.url`, `jwt`, `cors.origin[]`, `adminApiKey`, `google.clientId`, `stripe.*`, `vapid.*` |

**Функції:** немає — лише побічний ефект `dotenv.config()` при імпорті.

### `index.ts` (entry point)

**Відповідальність:** створення `express` app, підключення middleware (CORS, `express.raw` для Stripe webhook шляху, `express.json`), монтування роутів, `http.Server`, `Socket.IO` з типами з shared, ініціалізація `PrismaClient`, `WordService`, `RoomManager`, `RedisRoomStore`, `PerRoomQueue`, `RoomActionRelay`, `GameEngine`, Redis adapter, `socketAuthMiddleware`, обробка `connection` / `disconnect` / `room:rejoin`, graceful `SIGTERM`.

**Локальні змінні / замикання:** `pendingDisconnects`, `RECONNECT_GRACE_MS`, колбеки `gameEngine.setTimerBroadcast`, `setNotificationBroadcast`.

**Експортів немає** (скрипт запуску).

### `services/AuthService.ts`

Клас **`AuthService`**

| Метод | Параметри | Повертає | Опис |
|-------|-----------|----------|------|
| `createToken` | `payload: TokenPayload` | `string` | JWT з терміном 7 діб |
| `createAnonymousToken` | `userId: string` | `string` | Обгортка `createToken` з `type: 'anonymous'` |
| `verifyToken` | `token: string` | `TokenPayload \| null` | Верифікація JWT |
| `verifyGoogleToken` | `idToken: string` | `Promise<... \| null>` | Перевірка Google token через `OAuth2Client` |

**Тип:** `TokenPayload` — експортується: `sub`, `type`, `email?`, `isAdmin?`.

**Зовнішні API:** `jsonwebtoken`, `google-auth-library`, внутрішній `config`.

### `services/GameEngine.ts`

Клас **`GameEngine`**

| Метод | Опис |
|-------|------|
| `persistNewGameSession` / `persistAbandonSession` / `persistRoundProgress` | `private async` — запис `GameSession` у Prisma з `await` та `console.warn` при помилці |
| `constructor(roomManager, wordService)` | Зберігає посилання на сервіси |
| `setTimerBroadcast(fn)` | Колбек `(room) => void` — викликається при тіку таймера (sync) |
| `setNotificationBroadcast(fn)` | Колбек для `game:notification` |
| `setPrisma(prisma)` | Опційно для `GameSession` create/update |
| `handleAction(room, payload, senderId?)` | `async` — головний диспетчер `GameActionPayload`; для `CORRECT` / `SKIP` / `GUESS_OPTION` делегує активному **режимному хендлеру** (`getHandler(room.settings.gameMode)`) |
| `private getActiveHandler(room)` | Повертає `IGameModeHandler` через `ModeFactory` |
| `private transitionToRoundSummary(room)` | `ROUND_SUMMARY`, зупинка таймера |
| `private nextWord(room)` | `async` — `WordService.nextWord`, потім `handler.generateTask` → `room.currentTask`, `room.currentWord = task.prompt`, скидання `currentTaskAnswered` |
| `private startTimer(room)` | `setInterval` 1 с, `timeUp`, broadcast кожні 10 с |
| `private stopTimer(room)` | `clearInterval` |
| `private shuffleArray<T>(array)` | Fisher–Yates |

**Тести:** `services/__tests__/GameEngine.test.ts`.

### `modes/` (патерн Стратегія)

Каталог: `packages/server/src/modes/`. Barrel: `index.ts` реекспортує типи та фабрику.

#### `modes/IGameModeHandler.ts`

| Ім'я | Тип | Опис |
|------|-----|------|
| `ActionContext` | `interface` | `room`, `senderId?` — хто надіслав дію (для QUIZ) |
| `ActionResult` | `interface` | `isCorrect`, `points`, `nextWord`, `endTurn` |
| `IGameModeHandler` | `interface` | `generateTask(deck, settings): GameTask`; `handleAction(payload, currentTask, context): ActionResult` |

#### `modes/ClassicModeHandler.ts`

Клас **`ClassicModeHandler`**: `generateTask` — `deck.pop()` → `{ id: uuid, prompt: word }`; `CORRECT` / `SKIP` як у класичному Alias; інші дії — без ефекту.

#### `modes/TranslationModeHandler.ts`

Клас **`TranslationModeHandler`**: рядок колоди `Підказка\|Відповідь` → `prompt` / `answer`; ходи як у класиці (`CORRECT` / `SKIP`).

#### `modes/QuizModeHandler.ts`

Клас **`QuizModeHandler`**: `generateTask` — одне правильне слово з колоди + 3 дистрактори з решти колоди, перемішані `options`; `handleAction` для `GUESS_OPTION` порівнює `data.selectedOption` з `currentTask.answer`; при першій коректній відповіді виставляє `room.currentTaskAnswered = senderId` (ідемпотентність для інших).

#### `modes/ModeFactory.ts`

| Експорт | Опис |
|---------|------|
| `getHandler(mode?: GameMode)` | Повертає новий екземпляр хендлера; `SYNONYMS` → тимчасово `ClassicModeHandler`; `undefined` → класика |

### `services/RoomManager.ts`

**Інтерфейс `Room`:** повний стан кімнати в пам'яті (гравці, команди, таймер, `socketToPlayer`, `usedWords`, **`currentTask: GameTask \| null`**, **`currentTaskAnswered?`** для QUIZ, тощо).

Клас **`RoomManager`**

| Метод | Опис |
|-------|------|
| `constructor()` | Карта кімнат + інтервал очищення порожніх кімнат (2 год idle) |
| `setRedisStore(store)` | Підключення RedisRoomStore |
| `persistRoom(room)` | Fire-and-forget збереження `GameSyncState` у Redis |
| `private persistSocket(socketId, roomCode, playerId)` | Мапінг socket → кімната в Redis |
| `generateRoomCode()` | 5-значний унікальний код |
| `createRoom(hostSocketId)` | Нова кімната з дефолтними `GameSettings` |
| `getRoom(code)` | З `Map` |
| `restoreRoomFromRedis(code)` | `async` — відновлення після рестарту |
| `addPlayer(...)` | Новий `Player`, ліміт `MAX_PLAYERS`, санітизація імені |
| `removePlayer(roomCode, socketId)` | Видалення з гравців і команд |
| `handleDisconnect(socketId)` | Host migration, видалення порожньої кімнати; повертає метадані для broadcast |
| `getPlayerSocketId(room, playerId)` | Пошук socketId |
| `getSyncState(room)` | Побудова `GameSyncState` (`currentWord` узгоджується з `currentTask?.prompt`) |
| `deleteRoom(code)` | Повне видалення |

**Тести:** `services/__tests__/RoomManager.test.ts`.

### `services/WordService.ts`

Клас **`WordService`**

| Метод | Опис |
|-------|------|
| `setPrisma(prisma)` | Підключення БД |
| `private shuffleArray<T>(array)` | Fisher–Yates |
| `buildDeck(settings)` | `async` — колода з custom deck / pack IDs / default packs / MOCK_WORDS / emergency |
| `nextWord(deck, settings, usedWords?)` | `async` — `pop`, перебудова колоди, прапорець `deckReshuffled` |

**Тести:** `services/__tests__/WordService.test.ts`.

### `services/RedisRoomStore.ts`

Клас **`RedisRoomStore`**

| Метод | Опис |
|-------|------|
| `connect(url)` | `async` — `ioredis`, ping |
| `get isConnected` | getter |
| `saveRoomState(roomCode, state, writerInstanceId?)` | JSON у Redis, TTL 2 год; опційно ключ writer `alias:room:writer:{roomCode}` |
| `getRoomState(roomCode)` | `async` |
| `getRoomWriter(roomCode)` | `async` — останній `INSTANCE_ID`, що зберіг кімнату |
| `deleteRoom(roomCode)` | |
| `roomExists(roomCode)` | `async` |
| `setSocketRoom` / `getSocketRoom` / `removeSocket` | Мапінг socket ↔ кімната (`alias:socket:{id}`) |
| `getLiveStats()` | `async` — SCAN: кімнати `alias:room:*` без `alias:room:writer:*`; кількість ключів `alias:socket:*` |
| `disconnect()` | `async` — graceful |

**Константи модуля:** `ROOM_TTL`, `ROOM_PREFIX`, `ROOM_WRITER_PREFIX`, `SOCKET_KEY_PREFIX`.

### `services/PerRoomQueue.ts`

| Клас | Опис |
|------|------|
| `PerRoomQueue` | Черга на `roomCode`: серіалізує async-обробники (`room:join`, `room:leave`, `game:action`, `room:rejoin`), щоб мутації in-memory `Room` не перетинались між `await`. |

### `services/RoomActionRelay.ts`

| Клас / експорт | Опис |
|----------------|------|
| `RPC_CHANNEL_PREFIX` | Префікс каналу `alias:rpc:to:` |
| `RoomActionRelay` | Підписка на `alias:rpc:to:{serverInstanceId}`; RPC: `gameAction`, `roomJoin`, `roomLeave`, `roomRejoin` (відповідь з `roomJoinOk` / `roomLeaveOk` / `roomRejoinOk`), `roomDisconnect` (без відповіді); `registerPending` / таймаут → `RELAY_TIMEOUT` |

### `handlers/socketHandlers.ts`

| Функція | Параметри | Опис |
|---------|-----------|------|
| `registerSocketHandlers` | `io`, `socket`, `roomManager`, `gameEngine`, `roomQueue`, `relayDeps?` (`redisStore`, `relay`) | Реєструє `socket.on`; `room:join` / `room:leave` / `room:rejoin` / `game:action` за потреби пересилаються на Redis writer |

**Події всередині `registerSocketHandlers`:** `room:create`, `room:join`, `room:leave`, `room:rejoin` (`roomRejoinSchema`), `game:action`; тихі відмови замінені на `room:error` де доречно (`PLAYER_NOT_IN_ROOM`, `ROOM_NOT_FOUND`). Kick → `player:kicked` з `{ playerId }`. **`GUESS_OPTION`** — будь-який гравець у кімнаті (квіз).

### `socket/disconnectFlow.ts`

| Функція | Опис |
|---------|------|
| `wireGraceAfterMarkDisconnected` | Після `markSocketDisconnected`: `game:state-sync`, нотифікація міграції хоста, `scheduleGraceRemoval` → `finalizeGraceRemoval` |

### `validation/schemas.ts`

| Експорт | Тип | Опис |
|---------|-----|------|
| `roomCreateSchema` | `z.ZodObject` | `playerName`, `avatar`, `avatarId?` |
| `roomJoinSchema` | `z.ZodObject` | `roomCode` regex 5 цифр, ім'я, аватар |
| `gameSettingsPartialSchema` | (внутрішній) | Часткові `GameSettings` з обмеженнями; поля **`gameMode`** (`nativeEnum(GameMode)`), **`targetLanguage`** |
| `validateGameAction` | `function` | `(raw: unknown) => GameActionPayload \| null`; гілка **`GUESS_OPTION`**: непорожній `data.selectedOption` (рядок ≤ 200 симв.) |
| `validatePayload` | `function` | `<T>(schema, data) => T \| null` |

**Тести:** `validation/__tests__/schemas.test.ts`.

### `middleware/socketAuth.ts`

| Функція | Опис |
|---------|------|
| `socketAuthMiddleware` | Читає `handshake.auth.token`, верифікує JWT, пише `socket.data.userId` |

### `middleware/rateLimit.ts`

| Функція | Опис |
|---------|------|
| `isRateLimited` | (приватна) лічильник у `Map` |
| `applyRateLimit` | `socket.use` для `game:action`, `room:create`, `room:join` |

### `middleware/httpRateLimit.ts`

| Експорт | Опис |
|---------|------|
| `authLimiter` | express-rate-limit на `/api/auth` |
| `storeLimiter` | на store + purchases |
| `pushLimiter` | на push |

### `routes/auth.ts`

**Фабрика:** `createAuthRoutes(prisma: PrismaClient): IRouter`

| Метод | Шлях | Handler логіка (коротко) |
|-------|------|---------------------------|
| POST | `/anonymous` | upsert User за `deviceId`, JWT |
| POST | `/google` | Google login; merge purchases/customDecks + **stats** з anonymous за `deviceId` |
| POST | `/player-stats/delta` | Prisma `increment` лічильників + `statsLastPlayedAt` |
| POST | `/player-stats/merge-local` | Імпорт легасі-лічильників на акаунт |
| PATCH | `/profile` | `displayName`, `avatarId` |
| GET/PUT | `/lobby-settings` | JSON `defaultSettings` у User |
| GET | `/me` | Профіль + purchases + **`playerStats`** |

**Допоміжно:** `playerStatsJson()` — мапінг колонок User у camelCase для API.

### `utils/playerStats.ts`

| Функція | Опис |
|---------|------|
| `parseNonNegInt` | Валідація невід’ємного int для delta/merge |
| `maxDate` | Дві дати → новіша |

### `routes/store.ts`

**Фабрика:** `createStoreRoutes(prisma)`

| Метод | Шлях | Опис |
|-------|------|------|
| GET | `/` | `wordPacks`, `themes`, `soundPacks` + прапорець `owned` |

### `routes/purchases.ts`

**Допоміжна функція:** `requireAuth(req, res): string | null` — Bearer JWT.

**Фабрика:** `createPurchaseRoutes(prisma)`

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/checkout` | Stripe Checkout Session |
| POST | `/payment-intent` | Stripe PaymentIntent |
| POST | `/webhook/stripe` | Підпис Stripe, оновлення Purchase |
| POST | `/claim` | Безкоштовне отримання item (wordPack / theme / soundPack) |
| GET | `/my` | Список покупок |

### `routes/custom-decks.ts`

**Допоміжні функції:** `requireAuth`, `generateAccessCode()`, `parseWordList(raw: string): string[]`.

**Фабрика:** `createCustomDeckRoutes(prisma)` + `multer` upload.

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/` | JSON створення колоди |
| POST | `/upload` | CSV/текст |
| GET | `/my` | Список колод користувача |
| GET | `/access/:code` | Публічне читання approved колоди |
| DELETE | `/:id` | Видалення своєї колоди |

### `routes/push.ts`

| Експорт | Опис |
|---------|------|
| `createPushRoutes(prisma)` | Router: `GET /vapid-key`, `POST /subscribe`, `DELETE /unsubscribe` |
| `broadcastPush(prisma, payload)` | `async` — масова розсилка, видалення мертвих підписок (410/404) |

**Бібліотека:** `web-push`.

### `routes/admin.ts`

**Внутрішня функція:** `adminAuth` (async) — `x-admin-key` якщо збігається з `config.adminApiKey`, **або** Bearer JWT → `verifyToken` → **`prisma.user.findUnique` з `isAdmin: true`** (права з БД, не лише claim у токені).

**Фабрика:** `createAdminRoutes(prisma, redisStore?)` — CRUD для packs, words, themes, sound-packs, custom-decks (модерація), `GET /analytics`, `GET /analytics/daily`, **`GET /live`** (Redis через `redisStore.getLiveStats()`), `POST /push/broadcast`.

---

## Пакет `@alias/client`

Каталог: `packages/client/src/`.

### `index.tsx`

- Реєстрація Service Worker `/sw.js`.
- `ReactDOM.createRoot` → `<App />` у `StrictMode`.
- **Функцій/експортів** окрім default mount — немає.

### `admin.tsx`

- Окрема точка входу для `admin.html`: `createRoot` → `<AdminPanel />`.

### `App.tsx`

**Компоненти:** `GameRouter`, `AppContent`, default `App`.

- Обгортає `ErrorBoundary`, `GoogleOAuthProvider`, `AuthProvider`, `GameProvider`.
- `GameRouter`: `switch (gameState)` по екранах з `MenuFlow`, `LobbyFlow`, `GameFlow`.

### `types.ts`

- Реекспорт enum/type з `@alias/shared`.
- **`ThemeConfig`** — повна конфігурація теми для UI (класи Tailwind, шрифти).
- **`AppState`** — клієнтський стан гри: **`currentTask: GameTask \| null`**, `currentWord`, решта полів для офлайн/connection.
- **`GameContextType`** — `AppState` + методи контексту (`setGameState`, `sendAction`, **`sendGuessOption(selectedOption)`**, …).

**Примітка:** `handleJoin` у `GameContextType` включає опційний `avatarId` (синхронізовано з `GameContext`).

### `constants.ts`

| Експорт | Опис |
|---------|------|
| `ACTION_DEBOUNCE_MS` | 250 (дебаунс дій UI) |
| `TRANSLATIONS` | Великий об'єкт перекладів `Record<Language, Record<string, unknown>>` |
| `THEME_CONFIG` | `Record<AppTheme, ThemeConfig>` — стилі для кожної теми |

Реекспорт з shared: `DEFAULT_ROUND_TIME`, `WINNING_SCORE`, `ROOM_CODE_LENGTH`, `MAX_PLAYERS`, `TEAM_COLORS`, `MOCK_WORDS`.

### `context/GameContext.tsx`

| Експорт | Опис |
|---------|------|
| `AVATARS` | Масив emoji для вибору аватара |
| `GameProvider` | Провайдер стану гри + socket |
| `useGame` | Хук доступу до контексту (кидає, якщо поза Provider) |

**Внутрішні функції:**

| Ім'я | Опис |
|------|------|
| `buildOfflineTask` | (модульний хелпер) Будує `GameTask` з сирого рядка колоди залежно від `settings.gameMode` (класика, `A\|B`, квіз з `options`) |
| `gameReducer` | `SET_STATE`, `UPDATE_PLAYERS`, `SHOW_NOTIF` |
| `restoreSession` | `initialState` initializer — localStorage сесія хоста + PREFS |
| `shuffleArray` | Fisher–Yates для офлайн колоди |
| `handleGameAction` | Локальна імітація сервера для `gameMode === 'OFFLINE'`; обробка **`GUESS_OPTION`** у режимі `QUIZ` з блоком повторного зарахування за `task.id` (`offlineQuizLockTaskIdRef`) |
| `nextWordLogic` | Офлайн: наступне слово з MOCK_WORDS / custom → **`buildOfflineTask`** → `currentTask` + `currentWord` |

**Синхронізація онлайн:** у колбеці `onStateSync` диспатчиться **`currentTask`** з `GameSyncState`.

**Методи контексту (публічні через `contextValue`):** `setGameState`, `createNewRoom`, `handleJoin`, `sendAction`, `playSound`, `showNotification`, `setSettings`, `startOfflineGame`, `handleCorrect`, `handleSkip`, **`sendGuessOption`**, `handleStartRound`, `startGameplay`, `handleNextRound`, `togglePause`, `setTimeLeft`, `setTeams`, `resetGame`, `rematch`, `leaveRoom`, `setRoomCode`, `addOfflinePlayer`, `removeOfflinePlayer`.

### `context/AuthContext.tsx`

| Експорт | Опис |
|---------|------|
| `AuthProvider` | Обгортка над `useAuth()` |
| `useAuthContext` | Доступ до `authState`, login/logout, `profile`, `refreshProfile` |

### `hooks/useSocketConnection.ts`

**Інтерфейс опцій:** `onStateSync`, `onPlayerJoined`, `onPlayerLeft`, `onKicked`, `onError`, `onNotification`, `onRejoined?`.

| Експорт | Опис |
|---------|------|
| `useSocketConnection(options)` | Повертає `{ isConnected, myPlayerId, myPlayerIdRef, roomCode, connect, disconnect, createRoom, joinRoom, leaveRoom, sendGameAction }` |

**Внутрішня логіка:** `io(SERVER_URL)`, listeners, `localStorage` `ROOM_CODE_KEY` / `PLAYER_ID_KEY`, auto `room:rejoin` на connect. Перед `connect` / `room:create` / `room:join` оновлюється **`socket.auth`** з `getAuthToken()`; при вже активному з’єднанні перед `room:create`/`join` виконується `disconnect` для коректного handshake після зміни JWT (наприклад після Google login).

### `hooks/useAuth.ts`

| Експорт | Опис |
|---------|------|
| `AuthState` | Discriminated union статусів авторизації |
| `useAuth()` | `initialize`, `loginWithGoogle`, `loginWithApple` (заглушка), `logout`, `refreshProfile`, похідні `isAuthenticated`, `userId`, `profile`; після успішного `fetchProfile` — **`hydratePlayerStats`** (sync + міграція легасі) |

### `hooks/useAudio.ts`

| Експорт | Опис |
|---------|------|
| `useAudio(settings)` | Повертає `{ play(type) }` — делегує в `playSoundEffect` якщо `soundEnabled` |

### `utils/haptics.ts`

| Експорт | Опис |
|---------|------|
| `VibratePattern` | Тип: `number \| number[]` |
| `vibrate(pattern)` | Безпечний wrapper над `navigator.vibrate` з урахуванням user preference `hapticsEnabled` у `localStorage` |
| `HAPTIC` | Пресети: `nav`, `correct`, `skip`, `timeUp`, **`quizCorrect`**, **`quizWrong`** |

### `hooks/useHapticFeedback.ts`

| Експорт | Опис |
|---------|------|
| `useHapticFeedback()` | Повертає стабільний `useCallback((pattern) => vibrate(pattern))` для компонентів |

### `hooks/useInstallPrompt.ts`

| Експорт | Опис |
|---------|------|
| `useInstallPrompt()` | PWA: `beforeinstallprompt`, `canInstall`, `install()`, `dismiss()` |

### `hooks/usePlayerStats.ts`

| Експорт | Опис |
|---------|------|
| `PlayerStats` | Інтерфейс лічильників + `lastPlayed` (ISO) |
| `syncPlayerStatsFromProfile(profile)` | Оновлює серверний baseline після `fetchProfile` |
| `migrateLegacyPlayerStatsOnce()` | Одноразовий `merge-local` + очищення `alias_player_stats_v1` / прапорець міграції |
| `flushPlayerStats()` | Негайний flush pending-дельт на API |
| `usePlayerStats()` | `get()` (baseline + pending), `increment`, `reset`, **`flush`**; debounce flush; підписка на оновлення для ре-рендеру |

Дані зберігаються на сервері (`User` + `POST .../delta`); легасі localStorage імпортується при завантаженні профілю.

### `hooks/usePushNotifications.ts`

| Функція | Опис |
|---------|------|
| `urlBase64ToUint8Array` | (приватна) конвертація VAPID ключа |

| Експорт | Опис |
|---------|------|
| `PushPermission` | Тип рядка |
| `usePushNotifications()` | `subscribe`, `unsubscribe`, `permission`, `supported`, `loading` |

### `services/api.ts`

**Константи ключів:** `AUTH_TOKEN_KEY`, `DEVICE_ID_KEY`, `PLAYER_ID_KEY`, `ROOM_CODE_KEY`.

| Функція | Опис |
|---------|------|
| `getDeviceId` | Створює/читає стабільний device id |
| `getAuthToken` / `setAuthToken` / `clearAuthToken` | JWT у localStorage |
| `apiFetch` | (приватна) fetch з Authorization |
| `updateProfile` | PATCH профілю |
| `fetchLobbySettings` / `invalidateLobbySettingsCache` / `saveLobbySettings` | Кеш 30 с |
| `fetchAnonymousToken` | POST anonymous |
| `signInWithGoogle` | POST google |
| `fetchProfile` | GET me (включно з `playerStats`) |
| `postPlayerStatsDelta` / `mergeLocalPlayerStats` | Синхронізація статистики з БД |
| `fetchStore` | GET store |
| `createCheckout` | Stripe checkout URL |
| `createPaymentIntent` | Stripe PI |
| `claimFreeItem` | POST claim |
| `fetchMyDecks` / `createCustomDeck` / `uploadCustomDeckFile` / `fetchDeckByCode` / `deleteCustomDeck` | Custom decks |
| `fetchVapidPublicKey` / `savePushSubscription` / `removePushSubscription` | Push |

**Інтерфейси:** `AuthResponse`, `UserProfile` (+ `playerStats` / `PlayerStatsPayload`), `StoreItem`, `WordPackItem`, `ThemeItem`, `SoundPackItem`, `StoreData`, `CheckoutResponse`, `PaymentIntentResponse`, `CustomDeckSummary`, `CustomDeckDetail`.

### `utils/audio.ts`

| Функція | Опис |
|---------|------|
| `getAudioContext` | Singleton `AudioContext` |
| `createOsc` | (приватна) осцилятор + gain + envelope |
| `playSoundEffect(type, preset?)` | Публічна: синтез звуків за пресетом |

### `components/Button.tsx`

**Експорт:** `Button` — універсальна кнопка з варіантами (props див. файл). На `pointerdown` (якщо не `disabled`) — коротка вібрація `HAPTIC.nav`; варіанти стилів опираються на CSS-змінні `--ui-*` де застосовно.

### `components/Card.tsx`

**Експорт:** `Card` — контейнер картки з темою.

### `components/AvatarDisplay.tsx`

| Експорт | Опис |
|---------|------|
| `PRESET_AVATARS` | Шляхи/ід пресетів для відображення |
| `AvatarDisplay` | Рендер аватара за `avatarId` та `size` |

### `components/Shared.tsx`

| Експорт | Тип | Опис |
|---------|-----|------|
| `ErrorBoundary` | class | Ловить помилки React-дерева |
| `PageTransition` | FC | Обгортка анімації переходу між екранами (короткий м’який вхід) |
| `Confetti` | FC | Ефект конфеті |
| `ToastNotification` | FC | Тост повідомлення |
| `ConfirmationModal` | FC | Модалка підтвердження |
| `FloatingParticle` | FC | Частинка +1/-1 на екрані гри |
| `MilestoneNotification` | FC | Досягнення рахунку |
| `Logo` | FC | Логотип залежно від теми |

### `components/Auth/LoginModal.tsx`

**Експорт:** `LoginModal({ onClose, onSuccess })` — Google (та заглушка Apple через контекст).

### `components/Auth/ProfileModal.tsx`

**Експорт:** `ProfileModal({ onClose })` — профіль, вихід, перехід у налаштування.

### `components/Store/StoreModal.tsx`

**Експорт:** `StoreModal({ onClose })` — каталог, claim, відкриття оплати.

### `components/Store/QuickBuyModal.tsx`

**Експорт:** `QuickBuyModal({ itemType, itemId, isDark, onClose, onSuccess })` — Stripe Elements.

### `components/CustomDeck/CustomDeckModal.tsx`

**Експорт:** `CustomDeckModal({ onClose, onSelectDeck })` — створення/вибір колоди.

### `screens/MenuFlow.tsx`

Експортовані **екрани-компоненти** (кожен — функціональний компонент без іменованого експорту типу "function name" окрім const):

| Компонент | Призначення |
|-----------|-------------|
| `RulesScreen` | Правила гри |
| `MenuScreen` | Головне меню, навігація |
| `EnterNameScreen` | Ім'я + аватар перед кімнатою |
| `JoinInputScreen` | Введення коду кімнати |
| `ProfileScreen` | Профіль користувача |
| `ProfileSettingsScreen` | Редагування профілю |
| `LobbySettingsScreen` | Збережені налаштування лобі |
| `MyWordPacksScreen` | Вибір наборів слів |
| `MyDecksScreen` | Кастомні колоди |
| `StoreScreen` | Магазин |
| `PlayerStatsScreen` | Локальна статистика |

Усередині файлу — допоміжні підкомпоненти та обробники (не експортуються).

### `screens/LobbyFlow.tsx`

| Компонент | Призначення |
|-----------|-------------|
| `LobbyScreen` | Список гравців, код кімнати, QR; **модальне вікно QR** (клік по прев’ю) — велике біле полотно для зручного сканування |
| `TeamSetupScreen` | Команди, shuffle, старт |
| `SettingsScreen` | Налаштування раунду, категорії, тема |

### `screens/GameFlow.tsx`

| Компонент | Призначення |
|-----------|-------------|
| `VSScreen` | Екран дуелі |
| `PreRoundScreen` | Хто пояснює, старт раунду |
| `CountdownScreen` | 3-2-1 |
| `PlayingScreen` | Оболонка: таймер, рахунок, пауза, хаптики; **`settings.gameMode === QUIZ`** → `QuizUI`; інакше картка **`ClassicWordCard`** + **`ClassicActionFooter`** для пояснювача або `GuesserFeedback` для відгадувачів |
| `RoundSummaryScreen` | Підсумок слів раунду |
| `ScoreboardScreen` | Таблиця очок |
| `GameOverScreen` | Перемога, реванш, вихід |

### `screens/GameFlow/modes/`

| Файл | Експорт | Опис |
|------|---------|------|
| `ClassicUI.tsx` | `ClassicWordCard`, `ClassicActionFooter` | Картка слова (семантичні border) + фіксований футер «Пропуск» / «Вгадано» |
| `QuizUI.tsx` | `QuizUI` | Підказка + сітка 2×2 варіантів; `onAction({ GUESS_OPTION })`; локальний фідбек помилки / успіху + хаптики |
| `index.ts` | re-export | Публічна точка імпорту для `GameFlow.tsx` |

### `screens/AdminPanel.tsx`

**Експорт:** `AdminPanel()` — повна адмін-UI: packs, themes, analytics, **live Redis** (poll `GET /api/admin/live` кожні 15 с на вкладці stats), custom decks, push (використовує `fetch` з admin key / JWT).

---

## Prisma та БД

Файл: `packages/server/prisma/schema.prisma`.

| Модель | Призначення |
|--------|-------------|
| `User` | Користувач (anonymous / google), профіль, налаштування |
| `WordPack` | Метадані набору слів |
| `Word` | Окреме слово в пакеті |
| `Theme` | Тема UI (JSON config) |
| `SoundPack` | Звуковий пресет (JSON) |
| `Purchase` | Покупка / free claim |
| `CustomDeck` | Користувацька колода |
| `GameSession` | Аналітика сесій |
| `PushSubscription` | Web Push endpoint |

**Seed:** `prisma/seed.ts` — функція `main()`, наповнення паків, тем, звуків.

---

## Пакет `@alias/e2e`

- `playwright.config.ts` — конфіг Playwright.
- `tests/basic.spec.ts` — e2e сценарії (див. файл для конкретних `test()`).

Скрипти: `test`, `test:ui`, `test:report`, `install:browsers`.

---

## Тести сервера (Vitest)

| Файл | Що покриває |
|------|-------------|
| `GameEngine.test.ts` | Дії гри, таймер, очки, rematch, kick; `CORRECT`/`SKIP` з `currentTask` |
| `RoomManager.test.ts` | Кімнати, гравці, disconnect, host migration |
| `WordService.test.ts` | Колода, custom deck, fallback |
| `schemas.test.ts` | Zod-схеми socket payload |

Запуск: `pnpm test:server` з кореня монорепо.

---

## Подальші кроки (за планом користувача)

1. Розширити **unit/integration** тести за цим довідником (пріоритет: роути з багатою логікою — `purchases`, `custom-decks`, `auth` merge). Окремо варто додати тести **`modes/*`** (`generateTask` / `handleAction` для QUIZ і перекладу).
2. Додати **клієнтські** тести (React Testing Library / Vitest browser) для критичних хуків (`useSocketConnection` з моком socket, `GameContext` reducer).
3. Оновлювати **цей файл** при додаванні нових публічних функцій або зміні контрактів — разом із записом у `CHANGELOG.md`.
