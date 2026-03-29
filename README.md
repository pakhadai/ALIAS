# Alias Master

**Багатокористувацька онлайн-гра у стилі Alias (Taboo) з підтримкою PWA, офлайн-режиму та мультимовності.**

> Speak fast, play bright. / Говори швидко, грай яскраво.

**Додаткова документація:** повний довідник модулів, класів, функцій і залежностей — [`CODE_REFERENCE.md`](./CODE_REFERENCE.md). Лог змін — [`CHANGELOG.md`](./CHANGELOG.md).

---

## Зміст

- [Ідея гри](#ідея-гри)
- [Правила гри](#правила-гри)
- [Технічний стек](#технічний-стек)
- [Структура проекту](#структура-проекту)
- [Архітектура](#архітектура)
- [Ігрова логіка (детально)](#ігрова-логіка-детально)
  - [Стан гри (GameState)](#стан-гри-gamestate)
  - [Ігрові дії (GameAction)](#ігрові-дії-gameaction)
  - [Механіка раунду](#механіка-раунду)
  - [Підрахунок очок](#підрахунок-очок)
  - [Умова перемоги](#умова-перемоги)
  - [Таймер та синхронізація](#таймер-та-синхронізація)
  - [Система слів](#система-слів)
- [Мережевий протокол (Socket.IO)](#мережевий-протокол-socketio)
  - [Client → Server](#client--server)
  - [Server → Client](#server--client)
  - [Reconnection та Grace Period](#reconnection-та-grace-period)
  - [Host Migration](#host-migration)
- [REST API](#rest-api)
- [База даних (Prisma Schema)](#база-даних-prisma-schema)
- [Redis](#redis)
- [Клієнт (React PWA)](#клієнт-react-pwa)
  - [Роутинг (State Machine)](#роутинг-state-machine)
  - [Контексти](#контексти)
  - [Теми та локалізація](#теми-та-локалізація)
  - [Офлайн-режим](#офлайн-режим)
- [Безпека та валідація](#безпека-та-валідація)
- [Запуск проекту](#запуск-проекту)
- [Docker](#docker)
- [Деплой на VPS (GitHub Actions)](#деплой-на-vps-github-actions)
- [Тести](#тести)
- [Конфігурація (env змінні)](#конфігурація-env-змінні)
- [Seed даних](#seed-даних)
- [Важливі файли (Quick Reference)](#важливі-файли-quick-reference)
- [Довідник коду (модулі та API)](./CODE_REFERENCE.md) — окремий файл

---

## Ідея гри

**Alias Master** — це цифрова версія класичної настільної гри **Alias** (також відома як **Taboo**). Це командна "пати-гра", де:

- Один гравець (**пояснювач**) бачить слово на екрані і пояснює його своїй команді **не називаючи саме слово, однокореневі слова, переклади та жести**.
- Інші гравці команди намагаються **вгадати слово** за обмежений час.
- За кожне вгадане слово команда отримує **+1 бал**.
- За пропуск слова команда може отримувати **штраф** (залежить від налаштувань).
- Команди грають **по черзі**. Перша команда, яка набирає потрібну кількість балів — **перемагає**.

### Режими гри

| Режим | Опис |
|-------|------|
| **Онлайн (командний)** | 2-20 гравців зі своїх пристроїв. Код кімнати для приєднання. Пояснювач бачить слово тільки на своєму екрані. |
| **Онлайн (дуель / 1v1)** | 2-3 гравці — кожен за себе. Один пояснює, всі інші вгадують. |
| **Офлайн** | Один телефон на всіх. Перед раундом телефон передається пояснювачу. |

### Мови

Гра підтримує **3 мови** для інтерфейсу та наборів слів:
- **Українська (UA)** — основна мова
- **Англійська (EN)**
- **Німецька (DE)**

---

## Правила гри

1. Гравці розділяються на **2-8 команд** (автоматично або вручну).
2. Кожен раунд один гравець команди стає **пояснювачем**.
3. Пояснювач бачить слово і пояснює його своїй команді.
4. **Заборонено**: називати саме слово, однокореневі, жестикулювати, перекладати.
5. Команда вгадала → натиснути **"Вгадано"** (+1 бал) → наступне слово.
6. Не вдається пояснити → натиснути **"Пропуск"** → наступне слово.
7. Коли таймер спливає → раунд завершується (якщо слово ще в процесі — є шанс дограти).
8. Якщо увімкнено **штраф за пропуск** → `очки = правильні - пропущені` (мінімум 0).
9. Рахунок оновлюється, черга переходить до наступної команди.
10. Всередині команди пояснювачі **ротуються**: спочатку гравець 1, наступного разу гравець 2.
11. Коли **остання команда** в ротації досягає потрібного рахунку → **GAME_OVER**.

---

## Технічний стек

| Шар | Технологія | Версія |
|-----|-----------|--------|
| **Монорепо** | pnpm workspaces | - |
| **Клієнт** | React + TypeScript + Vite | React 19, Vite 7 |
| **Сервер** | Node.js + Express + TypeScript | Express 4 |
| **Реальний час** | Socket.IO | 4.8 |
| **ORM** | Prisma | 6.19 |
| **БД** | PostgreSQL | 16 |
| **Кеш/PubSub** | Redis (ioredis) | 7 |
| **Валідація** | Zod | 4.3 |
| **Auth** | JWT + Google OAuth | jsonwebtoken 9 |
| **Платежі** | Stripe (інтегровано, але проект буде безкоштовним) | 20.x |
| **Push** | Web Push (VAPID) | web-push 3.6 |
| **PWA** | Service Worker + Manifest | - |
| **Тести** | Vitest (unit) + Playwright (e2e) | - |
| **Деплой** | Docker + docker-compose + nginx | - |

---

## Структура проекту

```
ALIAS/                          ← Корінь монорепо
├── package.json                ← Workspace-скрипти (dev, build, test)
├── pnpm-workspace.yaml         ← packages/*
├── tsconfig.base.json          ← Базовий TS конфіг
├── docker-compose.yml          ← Dev: Redis + Postgres + Server
├── docker-compose.prod.yml     ← Production конфіг
├── nginx/nginx.conf            ← Nginx reverse proxy
├── scripts/                    ← Утилітні скрипти
│
├── packages/
│   ├── shared/                 ← @alias/shared — спільні типи, enum, контракти
│   │   └── src/
│   │       ├── enums.ts        ← GameState, Language, Category, AppTheme, SoundPreset
│   │       ├── types.ts        ← Player, Team, GameSettings, RoundStats, GameActionPayload
│   │       ├── events.ts       ← ClientToServerEvents, ServerToClientEvents, GameSyncState
│   │       ├── constants.ts    ← DEFAULT_ROUND_TIME, TEAM_COLORS, MOCK_WORDS (fallback)
│   │       └── index.ts        ← Re-export all
│   │
│   ├── server/                 ← @alias/server — Express + Socket.IO + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma   ← Моделі БД
│   │   │   ├── migrations/     ← SQL міграції
│   │   │   └── seed.ts         ← Seed: 15 паків слів, теми, звуки
│   │   ├── src/
│   │   │   ├── index.ts        ← Entry point: Express + Socket.IO + Redis + Prisma
│   │   │   ├── config.ts       ← Env змінні
│   │   │   ├── handlers/
│   │   │   │   └── socketHandlers.ts  ← Socket.IO обробники подій
│   │   │   ├── services/
│   │   │   │   ├── GameEngine.ts      ← Авторитетна ігрова логіка
│   │   │   │   ├── RoomManager.ts     ← Керування кімнатами та гравцями
│   │   │   │   ├── WordService.ts     ← Побудова колоди слів
│   │   │   │   ├── RedisRoomStore.ts  ← Персистенція кімнат у Redis
│   │   │   │   └── AuthService.ts     ← JWT + Google OAuth
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts            ← POST /api/auth/anonymous, /google, /me
│   │   │   │   ├── admin.ts           ← Admin CRUD для паків, тем, аналітики
│   │   │   │   ├── store.ts           ← GET /api/store — каталог
│   │   │   │   ├── purchases.ts       ← Stripe checkout, webhooks, claim
│   │   │   │   ├── custom-decks.ts    ← Кастомні колоди (JSON, CSV)
│   │   │   │   └── push.ts            ← VAPID push підписки
│   │   │   ├── middleware/
│   │   │   │   ├── socketAuth.ts      ← JWT middleware для Socket.IO
│   │   │   │   ├── rateLimit.ts       ← Per-socket rate limiter
│   │   │   │   └── httpRateLimit.ts   ← express-rate-limit
│   │   │   └── validation/
│   │   │       └── schemas.ts         ← Zod-схеми для валідації подій
│   │   └── test/
│   │
│   ├── client/                 ← @alias/client — React PWA
│   │   ├── public/
│   │   │   ├── manifest.json   ← PWA маніфест
│   │   │   ├── sw.js           ← Service Worker
│   │   │   └── offline.html    ← Offline fallback
│   │   ├── src/
│   │   │   ├── index.tsx       ← React mount + SW реєстрація
│   │   │   ├── App.tsx         ← GoogleOAuth → Auth → Game → Router
│   │   │   ├── context/
│   │   │   │   ├── GameContext.tsx  ← Головний стейт-менеджер гри
│   │   │   │   └── AuthContext.tsx  ← Авторизація (token, profile)
│   │   │   ├── hooks/
│   │   │   │   ├── useSocketConnection.ts  ← Socket.IO клієнт
│   │   │   │   ├── useAudio.ts             ← Звукові ефекти
│   │   │   │   └── ...
│   │   │   ├── screens/
│   │   │   │   ├── MenuFlow.tsx    ← Меню, профіль, магазин, правила
│   │   │   │   ├── LobbyFlow.tsx   ← Лобі, налаштування, команди
│   │   │   │   └── GameFlow.tsx    ← Гра, рахунок, підсумки
│   │   │   ├── components/         ← UI компоненти
│   │   │   ├── services/api.ts     ← REST API клієнт
│   │   │   ├── constants.ts        ← Переклади, конфіг тем
│   │   │   └── types.ts            ← Клієнтські типи
│   │   └── vite.config.ts
│   │
│   └── e2e/                    ← Playwright тести
│       ├── tests/basic.spec.ts
│       └── playwright.config.ts
│
├── README.md                   ← ← ← Цей файл
└── CHANGELOG.md                ← Лог змін
```

---

## Архітектура

```
┌─────────────────────────────────────────────────────┐
│                   React PWA (Client)                 │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ GameCtx  │  │ AuthCtx  │  │ useSocketConn    │  │
│  │ (state)  │  │ (token)  │  │ (socket.io)      │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                  │             │
│       ▼              ▼                  ▼             │
│  ┌─────────────────────────────────────────────┐    │
│  │          REST API (api.ts)                   │    │
│  └─────────────────────────────────────────────┘    │
└───────────────────┬──────────────┬──────────────────┘
                    │ HTTP         │ WebSocket
                    ▼              ▼
┌─────────────────────────────────────────────────────┐
│                  Node.js Server                      │
│                                                      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │  Express   │  │  Socket.IO  │  │  Middleware   │ │
│  │  Routes    │  │  Handlers   │  │  (auth, rate) │ │
│  └─────┬──────┘  └──────┬──────┘  └──────────────┘ │
│        │                │                            │
│        ▼                ▼                            │
│  ┌─────────────────────────────────────────────┐    │
│  │              Services Layer                  │    │
│  │  ┌────────────┐ ┌───────────┐ ┌───────────┐ │   │
│  │  │ GameEngine │ │RoomManager│ │WordService │ │   │
│  │  │ (rules)    │ │ (rooms)   │ │ (words)    │ │   │
│  │  └────────────┘ └───────────┘ └───────────┘ │   │
│  └─────────────────────────────────────────────┘    │
│        │                │                            │
│        ▼                ▼                            │
│  ┌──────────┐    ┌──────────┐                       │
│  │PostgreSQL│    │  Redis   │                       │
│  │ (Prisma) │    │ (rooms,  │                       │
│  │          │    │  adapter)│                       │
│  └──────────┘    └──────────┘                       │
└─────────────────────────────────────────────────────┘
```

### Потік даних

1. **Створення кімнати**: Клієнт → `room:create` → Server створює Room в пам'яті → зберігає в Redis → відповідь `room:created`
2. **Приєднання**: Клієнт → `room:join` → Server додає гравця → `room:joined` + `game:state-sync` всім
3. **Ігрова дія**: Клієнт → `game:action` → Server валідує → `GameEngine.handleAction()` → `game:state-sync` всім
4. **Синхронізація**: Сервер є **авторитетним** — клієнти не обчислюють стан, а лише відображають те, що прийшло від сервера

---

## Ігрова логіка (детально)

### Стан гри (GameState)

Гра — це **стейт-машина**. Перехід між станами контролюється сервером (онлайн) або клієнтом (офлайн).

```
MENU → ENTER_NAME → LOBBY → SETTINGS/TEAMS → VS_SCREEN/PRE_ROUND
       ↓                ↑
   JOIN_INPUT ──────────┘

PRE_ROUND → COUNTDOWN → PLAYING → ROUND_SUMMARY → SCOREBOARD → PRE_ROUND (цикл)
                                                                     ↓
                                                                GAME_OVER → MENU/LOBBY
```

**Повний перелік станів** (`packages/shared/src/enums.ts`):

| Стан | Де відображається | Опис |
|------|-------------------|------|
| `MENU` | MenuFlow | Головне меню |
| `PROFILE` | MenuFlow | Профіль користувача |
| `PROFILE_SETTINGS` | MenuFlow | Редагування профілю |
| `LOBBY_SETTINGS` | MenuFlow | Збережені налаштування лобі |
| `MY_WORD_PACKS` | MenuFlow | Мої набори слів |
| `PLAYER_STATS` | MenuFlow | Статистика гравця |
| `STORE` | MenuFlow | Магазин |
| `MY_DECKS` | MenuFlow | Мої кастомні колоди |
| `RULES` | MenuFlow | Правила гри |
| `ENTER_NAME` | MenuFlow | Введення імені та аватара |
| `JOIN_INPUT` | MenuFlow | Введення коду кімнати |
| `LOBBY` | LobbyFlow | Лобі кімнати (список гравців) |
| `SETTINGS` | LobbyFlow | Налаштування гри |
| `TEAMS` | LobbyFlow | Перегляд/перемішування команд |
| `VS_SCREEN` | GameFlow | Екран "команда vs команда" (дуель) |
| `PRE_ROUND` | GameFlow | Підготовка до раунду (хто пояснює) |
| `COUNTDOWN` | GameFlow | Відлік 3-2-1 |
| `PLAYING` | GameFlow | Активна гра (слово + таймер + кнопки) |
| `ROUND_SUMMARY` | GameFlow | Підсумок раунду (список слів) |
| `SCOREBOARD` | GameFlow | Таблиця рахунку |
| `GAME_OVER` | GameFlow | Екран перемоги |

### Ігрові дії (GameAction)

Всі дії визначені в `packages/shared/src/types.ts` — `GameActionType`.

| Дія | Хто може | Опис |
|-----|---------|------|
| `CORRECT` | Explainer | Слово вгадано (+1 correct) |
| `SKIP` | Explainer | Пропуск слова (+1 skipped) |
| `START_GAME` | Host | Запуск гри (після команд) |
| `START_DUEL` | Host | Запуск дуелі (кожен гравець = команда) |
| `GENERATE_TEAMS` | Host | Автоматичне створення команд |
| `START_ROUND` | Explainer | Запуск раунду (перехід у COUNTDOWN) |
| `START_PLAYING` | Explainer | Старт після відліку (перехід у PLAYING) |
| `NEXT_ROUND` | Host | Наступний раунд (наступна команда) |
| `CONFIRM_ROUND` | Host | Підтвердити результати раунду |
| `PAUSE_GAME` | Host | Пауза/продовження |
| `UPDATE_SETTINGS` | Host | Оновити налаштування гри |
| `RESET_GAME` | Host | Скинути гру (повернення в LOBBY) |
| `REMATCH` | Host | Реванш (ті ж команди, рахунок 0) |
| `KICK_PLAYER` | Host | Видалити гравця з кімнати |
| `TIME_UP` | Server/Client | Час раунду вийшов |
| `ADD_OFFLINE_PLAYER` | Host (offline) | Додати локального гравця |
| `REMOVE_OFFLINE_PLAYER` | Host (offline) | Видалити локального гравця |

### Механіка раунду

**Серверна сторона** (`packages/server/src/services/GameEngine.ts`):

1. **START_ROUND**: Визначається поточна команда та пояснювач за `nextPlayerIndex`. Стан → `COUNTDOWN`. Ініціалізується `currentRoundStats`.
2. **START_PLAYING**: Стан → `PLAYING`. Встановлюється `timeLeft = roundTime`. Запускається серверний таймер. Беруться перше слово з колоди.
3. **CORRECT/SKIP**: Оновлюється `currentRoundStats` (correct/skipped + слово в масив words). Береться наступне слово. Якщо `timeUp === true`, перехід у `ROUND_SUMMARY`.
4. **TIME_UP** (або таймер досягає 0): Зупинка таймера. Стан → `ROUND_SUMMARY`. Пояснювач ще може натиснути CORRECT/SKIP на останнє слово.
5. **CONFIRM_ROUND**: Обчислюються очки. Оновлюється рахунок команди. Ротація пояснювача (`nextPlayerIndex`). Перевірка умови перемоги. Стан → `SCOREBOARD` або `GAME_OVER`.

### Підрахунок очок

```
rawPoints = correct - (skipPenalty ? skipped : 0)
points = Math.max(0, rawPoints)
team.score = Math.max(0, team.score + points)
```

- Якщо `skipPenalty` увімкнено → пропуски віднімаються від правильних.
- Рахунок ніколи не стає негативним.
- Після підрахунку `nextPlayerIndex` ротується: `(current + 1) % team.players.length`.

### Умова перемоги

```
isLastTeam = (currentTeamIndex === teams.length - 1)
hasWinner = teams.some(t => t.score >= settings.scoreToWin)
isGameOver = isLastTeam && hasWinner
```

Гра завершується **тільки** коли **остання команда в ротації** закінчує раунд І є хоча б одна команда з рахунком >= `scoreToWin`. Це дає всім командам рівну кількість раундів.

### Таймер та синхронізація

- **Серверний таймер**: `setInterval` з кроком 1 секунда. Декрементує `timeLeft`.
- **Синхронізація**: Кожні **10 секунд** сервер примусово надсилає `game:state-sync` всім клієнтам (запобігає дрифту через throttling браузерних табів).
- **Пауза**: Коли `isPaused === true`, таймер не декрементується.
- Коли `timeLeft <= 0` → `timeUp = true`, таймер зупиняється, надсилається sync.

### Система слів

**WordService** (`packages/server/src/services/WordService.ts`):

**Пріоритет побудови колоди:**
1. **Custom Deck Code** — якщо задано `customDeckCode`, шукає `CustomDeck` у БД за access code (тільки approved).
2. **Selected Pack IDs** — якщо хост обрав конкретні пакети (`selectedPackIds`), завантажує слова тільки з них.
3. **Default Packs** — якщо пакети не обрані, завантажує слова з пакетів де `isDefault: true`, фільтрує за мовою та категоріями.
4. **Custom Words** — якщо обрана категорія `CUSTOM`, парсить `customWords` через кому.
5. **MOCK_WORDS** — статичний fallback (10-20 слів на мову/категорію, зашиті в `@alias/shared`).
6. **EMERGENCY_WORDS** — останній fallback: 8 українських слів.

**Ротація слів:**
- Колода перемішується (Fisher-Yates shuffle).
- Слова беруться з кінця колоди (`pop()`).
- Масив `usedWords` відстежує показані слова.
- Коли колода порожня → перебудова з виключенням `usedWords`.
- Коли ВСІ слова показані → повний цикл (reset `usedWords`, нотифікація "колода перемішана").

---

## Мережевий протокол (Socket.IO)

Типізовані контракти в `packages/shared/src/events.ts`.

### Client → Server

| Подія | Payload | Опис |
|-------|---------|------|
| `room:create` | `{ playerName, avatar, avatarId? }` | Створити кімнату |
| `room:join` | `{ roomCode, playerName, avatar, avatarId? }` | Приєднатися до кімнати |
| `room:leave` | - | Покинути кімнату |
| `room:rejoin` | `{ roomCode, playerId }` | Перепідключення (auto-rejoin при reconnect) |
| `game:action` | `GameActionPayload` | Будь-яка ігрова дія |

### Server → Client

| Подія | Payload | Опис |
|-------|---------|------|
| `room:created` | `{ roomCode, playerId }` | Кімнату створено |
| `room:joined` | `{ roomCode, playerId }` | Приєднання успішне |
| `room:rejoined` | `{ roomCode, playerId }` | Перепідключення успішне |
| `room:error` | `{ message }` | Помилка |
| `room:player-joined` | `{ player: Player }` | Новий гравець у кімнаті |
| `room:player-left` | `{ playerId }` | Гравець пішов |
| `game:state-sync` | `GameSyncState` | Повний стан гри (після кожної дії) |
| `game:notification` | `{ message, type }` | Нотифікація (deck reshuffled і т.д.) |
| `player:kicked` | - | Вас видалили |

### GameSyncState (повна синхронізація)

```typescript
interface GameSyncState {
  gameState: GameState;
  settings: GameSettings;
  roomCode: string;
  players: Player[];
  teams: Team[];
  currentTeamIndex: number;
  currentWord: string;
  currentRoundStats: RoundStats;
  timeLeft: number;
  isPaused: boolean;
  timeUp?: boolean;
  wordDeck: string[];
}
```

**Важливо**: Сервер надсилає ПОВНИЙ стан після КОЖНОЇ дії. Клієнт просто замінює свій стан (не мерджить дифи).

### Reconnection та Grace Period

- При disconnect сервер **чекає 60 секунд** (`RECONNECT_GRACE_MS`).
- Якщо гравець перепідключається протягом 60 сек → `room:rejoin` → session continues.
- Якщо ні → гравця видаляють із кімнати.
- Клієнт зберігає `roomCode` та `playerId` у `localStorage` для auto-rejoin.

### Host Migration

Коли хост відключається:
1. Перший залишений гравець стає новим хостом.
2. `room.hostSocketId` та `room.hostPlayerId` оновлюються.
3. Прапорець `isHost` оновлюється у `players` та `teams`.
4. Всім надсилається нотифікація "Host disconnected. New host assigned."

---

## REST API

Базовий URL: `http://localhost:3001`

### Auth

| Метод | Шлях | Опис |
|-------|------|------|
| `POST` | `/api/auth/anonymous` | Створити анонімного юзера. Body: `{ deviceId }`. Повертає JWT. |
| `POST` | `/api/auth/google` | Google OAuth. Body: `{ idToken, deviceId? }`. Мерджить анонімні покупки. |
| `GET` | `/api/auth/me` | Профіль поточного юзера (purchases, profile). Потрібен Bearer token. |
| `PATCH` | `/api/auth/profile` | Оновити displayName / avatarId. |
| `GET` | `/api/auth/lobby-settings` | Отримати збережені налаштування лобі. |
| `PUT` | `/api/auth/lobby-settings` | Зберегти налаштування лобі як дефолтні. |

### Store

| Метод | Шлях | Опис |
|-------|------|------|
| `GET` | `/api/store` | Каталог (wordPacks, themes, soundPacks). Опціональний Bearer — помічає owned. |

### Purchases

| Метод | Шлях | Опис |
|-------|------|------|
| `POST` | `/api/purchases/checkout` | Створити Stripe Checkout Session. |
| `POST` | `/api/purchases/payment-intent` | Створити PaymentIntent (in-app). |
| `POST` | `/api/purchases/webhook/stripe` | Stripe webhook (signature verification). |
| `POST` | `/api/purchases/claim` | Безкоштовно отримати free item. |
| `GET` | `/api/purchases/my` | Мої покупки. |

### Custom Decks

| Метод | Шлях | Опис |
|-------|------|------|
| `POST` | `/api/custom-decks` | Створити колоду (JSON). Body: `{ name, words[], branding?, accessCode? }`. |
| `POST` | `/api/custom-decks/upload` | Завантажити CSV/TXT файл. Multipart. |
| `GET` | `/api/custom-decks/my` | Мої колоди. |
| `GET` | `/api/custom-decks/access/:code` | Отримати колоду за access code (public, тільки approved). |
| `DELETE` | `/api/custom-decks/:id` | Видалити свою колоду. |

### Push

| Метод | Шлях | Опис |
|-------|------|------|
| `GET` | `/api/push/vapid-key` | VAPID public key. |
| `POST` | `/api/push/subscribe` | Зберегти push підписку. |
| `DELETE` | `/api/push/unsubscribe` | Видалити підписку. |

### Admin

Потрібен `x-admin-key` header або JWT з `isAdmin: true`.

| Метод | Шлях | Опис |
|-------|------|------|
| `GET` | `/api/admin/packs` | Всі пакети слів |
| `POST` | `/api/admin/packs` | Створити пакет |
| `POST` | `/api/admin/packs/:id/words` | Додати слова (bulk) |
| `GET/PUT/DELETE` | `/api/admin/packs/:id` | CRUD пакету |
| `GET/POST/PUT/DELETE` | `/api/admin/themes/*` | CRUD тем |
| `GET/POST` | `/api/admin/sound-packs/*` | CRUD звукових пакетів |
| `GET/PUT/DELETE` | `/api/admin/custom-decks/*` | Модерація кастомних колод |
| `GET` | `/api/admin/analytics` | Загальна аналітика |
| `GET` | `/api/admin/analytics/daily?days=30` | Денна статистика |
| `POST` | `/api/admin/push/broadcast` | Масова push-нотифікація |

### Health

| Метод | Шлях | Опис |
|-------|------|------|
| `GET` | `/health` | `{ status: "ok", timestamp }` |

---

## База даних (Prisma Schema)

Файл: `packages/server/prisma/schema.prisma`

### User
Гравець з можливістю анонімної або Google авторизації.

| Поле | Тип | Опис |
|------|-----|------|
| `id` | UUID | PK |
| `anonymousId` | String? | Унікальний device ID для анонімних юзерів |
| `email` | String? | Email (Google OAuth) |
| `authProvider` | String | `"anonymous"` або `"google"` |
| `displayName` | String? | Ігрове ім'я |
| `avatarId` | String? | Індекс аватара (0-19) |
| `defaultSettings` | Json? | Збережені налаштування лобі |
| `isAdmin` | Boolean | Адмін-доступ |

### WordPack
Набір слів певної мови та категорії.

| Поле | Тип | Опис |
|------|-----|------|
| `slug` | String | Унікальний ідентифікатор (e.g. `ua-general`) |
| `language` | String | `"UA"`, `"EN"`, `"DE"` |
| `category` | String | `"General"`, `"Food"`, `"Travel"`, `"Science"`, `"Movies"`, `"Feature"` |
| `isDefault` | Boolean | Доступний всім без покупки (зараз: тільки General) |
| `isFree` | Boolean | Безкоштовний |
| `price` | Int | Ціна в центах (0 = free) |
| `wordCount` | Int | Кількість слів |

### Word
Одне слово, належить до WordPack.

| Поле | Тип | Опис |
|------|-----|------|
| `text` | String | Текст слова |
| `packId` | FK → WordPack | До якого пакету належить |
| **Unique**: `(text, packId)` | | Слово унікальне в межах пакету |

### Theme
Візуальна тема гри.

| Поле | Тип | Опис |
|------|-----|------|
| `slug` | String | e.g. `premium-dark`, `cyberpunk` |
| `config` | Json | Кольори, шрифти, CSS-класи |
| `isFree` / `price` | | Безкоштовність / ціна |

### SoundPack
Набір звуків.

| Поле | Тип | Опис |
|------|-----|------|
| `slug` | String | e.g. `fun`, `minimal`, `eight-bit` |
| `config` | Json | Mapping: correct, skip, timer, gameOver |

### Purchase
Запис покупки. Пов'язує User з WordPack/Theme/SoundPack.

| Поле | Тип | Опис |
|------|-----|------|
| `userId` | FK → User | Хто купив |
| `wordPackId` / `themeId` / `soundPackId` | FK? | Що купив |
| `amount` | Int | Сума в центах |
| `paymentProvider` | String | `"stripe"` або `"free"` |
| `status` | String | `"pending"`, `"completed"`, `"refunded"` |

### CustomDeck
Кастомна колода слів від користувача.

| Поле | Тип | Опис |
|------|-----|------|
| `words` | Json | `string[]` — масив слів |
| `accessCode` | String? | 6-символьний код для доступу |
| `status` | String | `"pending"`, `"approved"`, `"rejected"` |
| `branding` | Json? | `{ logoUrl, primaryColor, companyName }` |

### GameSession
Аналітика ігрових сесій.

| Поле | Тип | Опис |
|------|-----|------|
| `roomCode` | String | Код кімнати |
| `playerCount` | Int | Кількість гравців |
| `roundsPlayed` | Int | Зіграно раундів |
| `status` | String | `"active"`, `"completed"`, `"abandoned"` |
| `settings` | Json | Налаштування гри |

### PushSubscription
Web Push підписки.

---

## Redis

Файл: `packages/server/src/services/RedisRoomStore.ts`

**Використання:**

1. **Room State Persistence** — стан кімнати зберігається в Redis з TTL 2 години. Ключі: `alias:room:{roomCode}`. Дозволяє відновити кімнату після рестарту сервера.
2. **Socket-to-Room Mapping** — `alias:socket:{socketId}` → `{ roomCode, playerId }`. Для reconnection.
3. **Socket.IO Redis Adapter** — PubSub для горизонтального масштабування (кілька Node.js інстансів можуть обслуговувати одну кімнату).

**Graceful degradation:** Якщо Redis недоступний — все працює, але без persistence між рестартами.

---

## Клієнт (React PWA)

### Роутинг (State Machine)

Замість URL-based роутингу використовується **state machine** на базі `GameState`. Компонент `GameRouter` (`App.tsx`) рендерить потрібний екран:

```
switch (gameState) {
  case GameState.MENU: → <MenuScreen />
  case GameState.LOBBY: → <LobbyScreen />
  case GameState.PLAYING: → <PlayingScreen />
  ...
}
```

**Три групи екранів:**
- **MenuFlow** (`screens/MenuFlow.tsx`): MENU, PROFILE, STORE, RULES, ENTER_NAME, JOIN_INPUT
- **LobbyFlow** (`screens/LobbyFlow.tsx`): LOBBY, SETTINGS, TEAMS
- **GameFlow** (`screens/GameFlow.tsx`): VS_SCREEN, PRE_ROUND, COUNTDOWN, PLAYING, ROUND_SUMMARY, SCOREBOARD, GAME_OVER

### Контексти

**GameContext** (`context/GameContext.tsx`) — центральний стейт гри:
- `useReducer` з `AppState` — все в одному об'єкті.
- `stateRef` — синхронний ref для доступу в callbacks.
- **Online**: дії надсилаються через Socket.IO → сервер обробляє → `game:state-sync` → `dispatch`.
- **Offline**: дії обробляються локально в `handleGameAction()`.
- **Session persistence**: `localStorage` зберігає стан для rejoin.
- **Preferences**: тема, мова, звук зберігаються окремо в `localStorage`.

**AuthContext** (`context/AuthContext.tsx`) — авторизація:
- Автоматичний anonymous token при старті.
- Google OAuth login.
- Profile management.

### Теми та локалізація

**5 тем** (визначені в `constants.ts` → `THEME_CONFIG`):

| Тема | Опис | Free |
|------|------|------|
| `PREMIUM_DARK` | Елегантна темна з золотими акцентами | Так |
| `PREMIUM_LIGHT` | Чиста світла з класичним серіфом | Так |
| `CYBERPUNK` | Темна з індиго та рожевим | Ні (Stripe) |
| `FOREST` | Глибокий природний стиль | Ні (Stripe) |
| `SLEEK` | Темна про з гострими кутами | Так |

Кожна тема визначає: `bg`, `card`, `textMain`, `textSecondary`, `textAccent`, `button`, `fonts`, `borderRadius`, `progressBar`, `iconColor`.

CSS custom properties встановлюються динамічно: `--font-heading`, `--font-body`, `--theme-radius`.

**Переклади** (`constants.ts` → `TRANSLATIONS`): об'єкт з ключами `UA`, `EN`, `DE`. ~150 ключів на мову.

### Офлайн-режим

В офлайн-режимі:
- Вся ігрова логіка виконується **на клієнті** (в `handleGameAction` у GameContext).
- Слова беруться зі статичних `MOCK_WORDS` (shared).
- Socket.IO не використовується.
- Таймер працює локально через `setInterval` у компоненті.
- Гравці додаються/видаляються локально.

---

## Безпека та валідація

### Socket.IO

1. **JWT Auth Middleware** (`socketAuth.ts`): Перевіряє token з `handshake.auth`. Без токена — анонімне з'єднання.
2. **Rate Limiting** (`rateLimit.ts`): Per-socket, per-event. `game:action` — 15/сек. `room:create` — 3/хв (prod). `room:join` — 5/хв.
3. **Zod Validation** (`schemas.ts`): Всі socket payloads проходять через Zod-схеми.
4. **Authorization**: Host-only дії (START_GAME, KICK_PLAYER і т.д.) перевіряються в `socketHandlers.ts`. Explainer-only дії (CORRECT, SKIP і т.д.) перевіряють `currentRoundStats.explainerId`.
5. **XSS Protection**: Імена гравців та слова проходять через `.replace(/<[^>]*>/g, '')`.

### HTTP

1. **express-rate-limit**: auth — 20/хв, store — 60/хв, push — 10/хв.
2. **Admin auth**: API key (`x-admin-key`) або JWT з `isAdmin: true`.
3. **CORS**: Налаштований список origins.

---

## Запуск проекту

### Вимоги

- **Node.js** 18+
- **pnpm** (рекомендовано v9+)
- **Docker** та **Docker Compose** (для Redis + PostgreSQL)

### Кроки

   ```bash
# 1. Встановити залежності
pnpm install

# 2. Скопіювати env
cp packages/server/.env.example packages/server/.env
# Відредагувати .env: DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID (опційно)

# 3. Запустити Redis + PostgreSQL
   docker-compose up -d redis postgres

# 4. Застосувати міграції та seed
   pnpm --filter @alias/server db:migrate
   pnpm --filter @alias/server db:seed

# 5. Запустити dev-сервер (клієнт + сервер паралельно)
   pnpm run dev
   ```

**Після запуску:**
- Клієнт: `http://localhost:5173`
- Сервер: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

### Скрипти

| Команда | Опис |
|---------|------|
| `pnpm dev` | Запуск client + server паралельно |
| `pnpm dev:client` | Тільки клієнт |
| `pnpm dev:server` | Тільки сервер |
| `pnpm build` | Збірка shared → client + server |
| `pnpm test:server` | Юніт-тести сервера (vitest) |
| `pnpm test:e2e` | E2E тести (playwright) |
| `pnpm --filter @alias/server db:migrate` | Prisma міграції |
| `pnpm --filter @alias/server db:seed` | Seed БД |
| `pnpm --filter @alias/server db:push` | Push schema без міграції |

---

## Docker

### Development

```bash
docker-compose up -d redis postgres   # тільки DB
pnpm run dev                           # локальний dev-сервер
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Production конфіг включає: побудову Docker images для client та server, nginx reverse proxy.

Типовий ручний запуск з env для compose (змінні підставляються з `.env.prod`):

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### Деплой на VPS (GitHub Actions)

Workflow [`.github/workflows/deploy-vps.yml`](./.github/workflows/deploy-vps.yml) запускається **після кожного push у гілку `main`** і за запитом (**Actions → Deploy to VPS → Run workflow**). Він підключається по SSH до сервера, оновлює код (`git fetch` + `reset` на `origin/main`), виконує `docker compose ... up -d --build` і **`npx prisma migrate deploy`** у контейнері сервісу `app`.

**Обов’язкові secrets** (репозиторій GitHub → **Settings → Secrets and variables → Actions**):

| Secret | Опис |
|--------|------|
| `VPS_HOST` | IP або hostname VPS |
| `VPS_USER` | SSH-користувач (наприклад `ubuntu`, `deploy`) |
| `VPS_SSH_PRIVATE_KEY` | Приватний ключ у форматі PEM (повний текст, включно з `-----BEGIN ... KEY-----`) |

**Опційно:** `VPS_SSH_PORT` (якщо SSH не на порту 22), `VPS_SSH_PASSPHRASE` (якщо ключ захищений паролем), **`VPS_DEPLOY_PATH`** — абсолютний шлях до клону. Якщо **не задано**, деплой йде в **`$HOME/ALIAS`** (для `root` це `/root/ALIAS`). Інші проєкти часто теж фіксують один каталог у скрипті замість secret — тут те саме через дефолт.

**Що має бути на VPS до першого деплою:**

1. `git clone` у каталог деплою: за замовчуванням **`~/ALIAS`** (або шлях з `VPS_DEPLOY_PATH`, якщо задав secret). Remote `origin` має дозволяти `git fetch` (наприклад [Deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys#deploy-keys) з правом **read** або HTTPS).
2. У корені клону — файл **`.env.prod`** (заповнений за зразком [`.env.prod.example`](./.env.prod.example)), **не** комітити в git.
3. Встановлені Docker і Docker Compose v2; користувач `VPS_USER` може виконувати `docker compose` без інтерактивного sudo (наприклад група `docker`: `sudo usermod -aG docker $USER` і перелогінитись).
4. SSL і домен — за коментарями у `docker-compose.prod.yml` (certbot тощо), якщо потрібно.

Якщо гілка деплою не `main`, змініть `branches` у workflow або додайте свою гілку.

**Якщо в Actions помилка `ssh: unable to authenticate … no supported methods remain`:** (1) Локально перевір `ssh -i приватний_ключ -p порт VPS_USER@VPS_HOST`. (2) У GitHub secret `VPS_SSH_PRIVATE_KEY` — **цілий** приватний файл (`BEGIN`…`END`), без лапок навколо всього блоку. (3) Публічний ключ з пари має бути в `~VPS_USER/.ssh/authorized_keys` на сервері. (4) Якщо локально вхід ок, а Actions ні — workflow записує ключ у файл і використовує `key_path` (не сирий `key:`), щоб багаторядковий secret не псувався. (5) Для ключа **без** passphrase secret `VPS_SSH_PASSPHRASE` **не створюй** (порожній secret може заважати). Ключ **з** passphrase — зараз у workflow поле passphrase не передається; тоді або ключ без пароля для CI, або доведеться розширити workflow.

---

## Тести

### Серверні (Vitest)

```bash
pnpm test:server
```

Файли тестів: `packages/server/src/services/__tests__/`
- `GameEngine.test.ts` — логіка гри
- `RoomManager.test.ts` — кімнати та гравці
- `WordService.test.ts` — побудова колоди
- `schemas.test.ts` — Zod валідація

### E2E (Playwright)

```bash
pnpm test:e2e         # headless
pnpm test:e2e:ui      # з UI
pnpm test:e2e:report  # відкрити звіт
```

---

## Конфігурація (env змінні)

Файл: `packages/server/.env` (створити з `.env.example`)

| Змінна | Обов'язковість | Опис |
|--------|---------------|------|
| `PORT` | Опційно | Порт сервера (default: 3001) |
| `NODE_ENV` | Опційно | `development` / `production` |
| `DATABASE_URL` | **Так** | PostgreSQL URL |
| `REDIS_URL` | Опційно | Redis URL (default: `redis://localhost:6379`) |
| `JWT_SECRET` | **Так** | Секрет для JWT |
| `CORS_ORIGIN` | Опційно | Дозволені origins (через кому) |
| `GOOGLE_CLIENT_ID` | Опційно | Google OAuth client ID |
| `STRIPE_SECRET_KEY` | Опційно | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Опційно | Stripe webhook secret |
| `STRIPE_SUCCESS_URL` | Опційно | URL перенаправлення після оплати |
| `STRIPE_CANCEL_URL` | Опційно | URL при скасуванні оплати |
| `VAPID_PUBLIC_KEY` | Опційно | VAPID ключ для push |
| `VAPID_PRIVATE_KEY` | Опційно | VAPID private key |
| `VAPID_EMAIL` | Опційно | Email для VAPID |
| `ADMIN_API_KEY` | Опційно | API key для адмін-доступу |

**Клієнтські env** (`packages/client/.env.local`):

| Змінна | Опис |
|--------|------|
| `VITE_SERVER_URL` | URL сервера (default: `http://localhost:3001`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

---

## Seed даних

Файл: `packages/server/prisma/seed.ts`

Seed створює:

### WordPacks (15 штук)
| Slug | Мова | Категорія | Слів | Default |
|------|------|-----------|------|---------|
| `ua-general` | UA | General | ~200 | Так |
| `ua-food` | UA | Food | ~200 | Ні |
| `ua-travel` | UA | Travel | ~200 | Ні |
| `ua-science` | UA | Science | ~200 | Ні |
| `ua-movies` | UA | Movies | ~200 | Ні |
| `en-general` | EN | General | ~200 | Так |
| `en-food` | EN | Food | ~200 | Ні |
| `en-travel` | EN | Travel | ~200 | Ні |
| `en-science` | EN | Science | ~200 | Ні |
| `en-movies` | EN | Movies | ~200 | Ні |
| `de-general` | DE | General | ~200 | Так |
| `de-food` | DE | Food | ~200 | Ні |
| `de-travel` | DE | Travel | ~200 | Ні |
| `de-science` | DE | Science | ~200 | Ні |
| `de-movies` | DE | Movies | ~200 | Ні |

+ `feature-custom-packs` — фіча-пакет (не слова, а покупка для розблокування кастомних паків).

### Themes (5 штук)
`premium-dark` (free), `premium-light` (free), `cyberpunk` ($0.99), `forest` ($0.99), `sleek` (free)

### SoundPacks (3 штуки)
`fun` (free), `minimal` (free), `eight-bit` (free)

### Admin
Seed встановлює `isAdmin: true` для `mrdemianpahaday@gmail.com`.

---

## Важливі файли (Quick Reference)

### Ядро ігрової логіки
| Файл | Що робить |
|------|-----------|
| `packages/shared/src/enums.ts` | GameState, Language, Category, AppTheme, SoundPreset |
| `packages/shared/src/types.ts` | Player, Team, GameSettings, RoundStats, GameActionPayload |
| `packages/shared/src/events.ts` | Socket.IO контракти, GameSyncState |
| `packages/shared/src/constants.ts` | Дефолти, кольори команд, fallback слова |

### Серверна логіка
| Файл | Що робить |
|------|-----------|
| `packages/server/src/index.ts` | Entry point, з'єднання сервісів |
| `packages/server/src/services/GameEngine.ts` | **Авторитетна ігрова логіка** (handleAction) |
| `packages/server/src/services/RoomManager.ts` | Кімнати, гравці, host migration |
| `packages/server/src/services/WordService.ts` | Побудова колоди слів |
| `packages/server/src/services/RedisRoomStore.ts` | Redis persistence |
| `packages/server/src/handlers/socketHandlers.ts` | Socket.IO обробники + авторизація дій |
| `packages/server/src/validation/schemas.ts` | Zod-валідація всіх payloads |

### Клієнтська логіка
| Файл | Що робить |
|------|-----------|
| `packages/client/src/App.tsx` | Root component, GameRouter |
| `packages/client/src/context/GameContext.tsx` | **Центральний стейт**, офлайн логіка |
| `packages/client/src/hooks/useSocketConnection.ts` | Socket.IO клієнт, reconnect, rejoin |
| `packages/client/src/services/api.ts` | REST API клієнт |
| `packages/client/src/constants.ts` | Переклади (UA/EN/DE), конфіг тем |
| `packages/client/src/screens/MenuFlow.tsx` | Меню, профіль, магазин |
| `packages/client/src/screens/LobbyFlow.tsx` | Лобі, налаштування |
| `packages/client/src/screens/GameFlow.tsx` | Ігровий процес |

### Конфігурація
| Файл | Що робить |
|------|-----------|
| `packages/server/prisma/schema.prisma` | Повна схема БД |
| `packages/server/prisma/seed.ts` | Seed даних |
| `packages/server/src/config.ts` | Env-конфігурація |
| `packages/server/.env.example` | Шаблон env |
| `docker-compose.yml` | Docker dev setup |

---

## Примітки для розробки

### Архітектурні рішення

1. **Авторитетний сервер**: Вся ігрова логіка виконується на сервері. Клієнт — thin client, який лише відображає стан. Це запобігає читерству.
2. **State Machine замість Router**: Гра використовує GameState enum замість URL-based роутингу. Це спрощує керування переходами між екранами.
3. **Full State Sync**: Після кожної дії сервер надсилає повний стан. Це простіше за дифи, хоча й трохи більше трафіку.
4. **Graceful Degradation**: Сервер працює без Redis (без persistence) і без PostgreSQL (fallback слова). Це важливо для dev-режиму.
5. **Dual Mode**: Один і той же GameContext підтримує і онлайн, і офлайн режим. Офлайн — логіка в `handleGameAction()`, онлайн — через Socket.IO.

### Правила для ШІ-розробника

1. **Не змінюй GameSyncState** без оновлення і клієнта, і сервера — вони тісно пов'язані.
2. **Не додавай нових GameAction** без додавання їх в `validActions` Set у `schemas.ts` і обробки в `GameEngine.handleAction()`.
3. **Не додавай нових GameState** без оновлення `GameRouter` в `App.tsx` і відповідного screen-компонента.
4. **Завжди перевіряй** host-only та explainer-only авторизацію в `socketHandlers.ts` при додаванні нових дій.
5. **Shared пакет** — single source of truth для типів. Зміни тут вимагають `pnpm build:shared`.
6. **Дивись CHANGELOG.md** перед внесенням змін — там логуються всі попередні зміни.
