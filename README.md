# Alias Master

**Багатокористувацька онлайн-гра у стилі Alias (Taboo) з підтримкою PWA, офлайн-режиму та мультимовності.**

> Speak fast, play bright. / Говори швидко, грай яскраво.

**Документація:** цей **README** — єдиний обов’язковий огляд архітектури, протоколів і структури репозиторію (узгоджений із кодом). Стислий архітектурний знімок монорепо (пакети, потік даних, Prisma) — [`PROJECT_STATE.md`](./PROJECT_STATE.md). Додаткові матеріали за вузькими темами: [`docs/PRISMA_WORD_DATA.md`](./docs/PRISMA_WORD_DATA.md), [`docs/LOBBY_TEAM_BUILDER.md`](./docs/LOBBY_TEAM_BUILDER.md), [`docs/TESTING_ACCEPTANCE.md`](./docs/TESTING_ACCEPTANCE.md), [`docs/ROOM_MANAGEMENT_FIXES.md`](./docs/ROOM_MANAGEMENT_FIXES.md) (журнал виправлень кімнат / мобільного sync). Лог змін — [`CHANGELOG.md`](./CHANGELOG.md). Файл `CODE_REFERENCE.md` **видалено**; його зміст перенесено сюди (розділ [Довідник модулів](#довідник-модулів-код)).

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
  - [Режими слів (GameMode), GameTask та патерн Стратегія](#режими-слів-gamemode-gametask-та-патерн-стратегія)
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
- [Шаблон локальних нотаток VPS](./docs/VPS-INFRASTRUCTURE.md.example) (`VPS-INFRASTRUCTURE.md` — у `.gitignore`)
- [Тести](#тести)
- [Конфігурація (env змінні)](#конфігурація-env-змінні)
- [Seed даних](#seed-даних) · [Дані слів і Prisma (детально)](./docs/PRISMA_WORD_DATA.md)
- [Важливі файли (Quick Reference)](#важливі-файли-quick-reference)
- [Довідник модулів (код)](#довідник-модулів-код)

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
| **Монорепо** | pnpm workspaces + Turbo | pnpm **9.0.0** (`packageManager`), Turbo **^2.9** |
| **Клієнт** | React + TypeScript + Vite | React 19, Vite 7 |
| **Сервер** | Node.js + Express + TypeScript | Express 4 |
| **Telegram** | Mini App SDK + Telegraf | Bot API 9.6 (квітень 2026), Telegraf 4 |
| **Реальний час** | Socket.IO | 4.8 |
| **ORM** | Prisma | 6.19 |
| **БД** | PostgreSQL | 16 |
| **Кеш/PubSub** | Redis server **7** (образ у Docker) + клієнт **ioredis ^5** | окремо |
| **Валідація** | Zod | 4.3 |
| **Auth** | JWT + Google OAuth | jsonwebtoken 9 |
| **Платежі** | Stripe (інтегровано, але проект буде безкоштовним) | 20.x |
| **Push** | Web Push (VAPID) | web-push 3.6 |
| **PWA** | Service Worker + Manifest | - |
| **Спостереження** | Sentry (`@sentry/node`, `@sentry/react` ~10.x; `@sentry/vite-plugin` ~5.x у збірці Vite) | 10.x / 5.x |
| **Тести** | Vitest (unit: **server** + **client**) + Playwright (e2e) | див. [`ci.yml`](./.github/workflows/ci.yml) |
| **Деплой** | Docker + docker-compose + nginx | - |

---

## Структура проекту

```
ALIAS/                          ← Корінь монорепо
├── package.json                ← Workspace-скрипти (dev, build, test); `packageManager: pnpm@9.0.0`
├── pnpm-workspace.yaml         ← packages/*
├── tsconfig.base.json          ← Базовий TS конфіг
├── eslint.config.mjs           ← ESLint 9 (flat config)
├── turbo.json                  ← Turbo (build / typecheck)
├── .github/workflows/          ← CI (Node 20), E2E (@smoke / @core), deploy VPS, secret scan
├── docker-compose.yml          ← Dev: Redis + Postgres (+ опційно сервіси)
├── docker-compose.prod.yml     ← Production
├── docker-compose.npm.yml      ← Стек за Nginx Proxy Manager
├── nginx/                      ← nginx.conf, npm-edge.conf
├── scripts/                    ← Утилітні скрипти
├── docs/                       ← Тематичні доповнення (Prisma-дані, лобі, acceptance)
│
├── packages/
│   ├── shared/                 ← @alias/shared — контракти та типи
│   │   └── src/
│   │       ├── enums.ts        ← GameState, Language, Category, AppTheme, SoundPreset, GameMode
│   │       ├── models.ts       ← Player, Team, GameSettings (general + mode), GameTask, RoundStats …
│   │       ├── actions.ts      ← GameActionPayload, GameActionType, GameSettingsUpdate
│   │       ├── events.ts       ← Socket.IO + GameSyncState
│   │       ├── network.ts      ← Допоміжні мережеві типи
│   │       ├── constants.ts    ← DEFAULT_ROUND_TIME, TEAM_COLORS, MOCK_WORDS
│   │       └── index.ts        ← Re-export
│   │
│   ├── server/                 ← @alias/server
│   │   ├── prisma/             ← schema, migrations, seed.ts, data/*.json
│   │   ├── src/
│   │   │   ├── index.ts        ← Express + Socket.IO + Sentry init
│   │   │   ├── config.ts
│   │   │   ├── sentry/bootstrap.ts
│   │   │   ├── game/           ← authorizeGameAction, gameActionPipeline (sync + IMPOSTER secret)
│   │   │   ├── socket/disconnectFlow.ts
│   │   │   ├── handlers/socketHandlers.ts
│   │   │   ├── modes/          ← Classic, Translation, Quiz, Hardcore; explainerModeActions; SYNONYMS → Classic
│   │   │   ├── services/     ← GameEngine, RoomManager, WordService, Redis, Relay, Queue …
│   │   │   ├── routes/
│   │   │   ├── middleware/   ← socketAuth, rateLimit, httpRateLimit, ipWhitelist
│   │   │   └── validation/schemas.ts
│   │   └── test/e2e-game-flow.ts   ← окремий tsx-сценарій; Vitest: `src/**/__tests__/**/*.test.ts`
│   │
│   ├── client/                 ← @alias/client — React PWA
│   │   ├── public/
│   │   ├── vite.config.ts      ← Vite + PWA + Sentry plugin
│   │   ├── src/
│   │   │   ├── sw.ts, index.tsx, App.tsx
│   │   │   ├── context/        ← GameContext, AuthContext
│   │   │   ├── hooks/
│   │   │   ├── screens/
│   │   │   │   ├── MenuFlow.tsx      ← barrel → screens/menu/*
│   │   │   │   ├── LobbyFlow.tsx     ← barrel → screens/lobby/* (+ TeamSetupScreen)
│   │   │   │   ├── GameFlow.tsx      ← VS…GAME_OVER; barrel `GameFlow/screens/index.ts`
│   │   │   │   ├── GameFlow/screens/*, modes/  ← Countdown, Playing (+ overlays), Imposter…
│   │   │   │   └── admin/            ← AdminApp (окрема збірка за потреби)
│   │   │   ├── components/
│   │   │   │   ├── Auth/             ← LoginModal, ProfileModal
│   │   │   │   ├── Settings/         ← AppSettingsModal
│   │   │   │   ├── CustomDeck/       ← CustomDeckModal
│   │   │   │   ├── Store/            ← QuickBuyModal
│   │   │   │   ├── Button, Shared, AvatarDisplay, …
│   │   │   │   ├── ConnectionStatusBanner, PwaUpdateBanner, SentryErrorFallback
│   │   │   ├── services/api.ts
│   │   │   ├── constants.ts, types.ts
│   │   │   └── styles.css, tailwind …
│   │
│   └── e2e/                    ← Playwright
│       ├── tests/basic.spec.ts, multiplayer.spec.ts, flows.spec.ts
│       └── playwright.config.ts
│
├── README.md                   ← Цей файл (канонічна документація)
└── CHANGELOG.md
```

---

## Архітектура

```
┌─────────────────────────────────────────────────────┐
│                   React PWA (Client)                 │
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │  GameCtx   │  │  AuthCtx   │  │ useSocketConnection  │  │
│  │  (state)   │  │  (token)   │  │    (socket.io)       │  │
│  └──────┬─────┘  └──────┬─────┘  └──────────┬───────────┘  │
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
│  │  │ + modes/   │ │ (rooms)   │ │ (words)    │ │   │
│  │  │ (strategy) │ │           │ │            │ │   │
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
| `TEAMS` | LobbyFlow | **`TeamSetupScreen`**: збір команд, drag/sheets, lock/shuffle (деталі — [`docs/LOBBY_TEAM_BUILDER.md`](./docs/LOBBY_TEAM_BUILDER.md)) |
| `VS_SCREEN` | GameFlow | Екран "команда vs команда" (дуель) |
| `PRE_ROUND` | GameFlow | Підготовка до раунду (хто пояснює) |
| `COUNTDOWN` | GameFlow | Відлік 3-2-1 |
| `PLAYING` | GameFlow | Активна гра (таймер + UI залежно від **`settings.mode.gameMode`**) |
| `ROUND_SUMMARY` | GameFlow | Підсумок раунду (список слів) |
| `SCOREBOARD` | GameFlow | Таблиця рахунку |
| `GAME_OVER` | GameFlow | Екран перемоги |

### Ігрові дії (GameAction)

Усі дії та тип payload — **`packages/shared/src/actions.ts`** (`GameActionType`, `GameActionPayload`). Авторизація «хто може» — `packages/server/src/game/authorizeGameAction.ts` + перевірки в `socketHandlers` / `GameEngine` (деталі в коді).

| Дія | Типовий дозвол | Опис |
|-----|----------------|------|
| `CORRECT` | Explainer | Слово вгадано (+1 correct) |
| `SKIP` | Explainer | Пропуск слова (+1 skipped); у **HARDCORE** логіка суворіша (завершення раунду при skip — див. `HardcoreModeHandler`) |
| `GUESS_OPTION` | Будь-який гравець у кімнаті | **QUIZ**: `{ selectedOption: string }`; лише **перша** коректна відповідь на поточний `currentTask` |
| `START_GAME` | Host | Старт гри після команд (у **SOLO** сервер будує по одній «команді» на гравця) |
| `START_DUEL` | Host | Дуель (кожен гравець = команда) |
| `GENERATE_TEAMS` | Host | Авто-команди |
| `START_ROUND` | Explainer | Перехід у COUNTDOWN |
| `START_PLAYING` | Explainer | Перехід у PLAYING |
| `NEXT_ROUND` | Host | Наступний раунд |
| `CONFIRM_ROUND` | Host | Підсумок раунду → очки |
| `PAUSE_GAME` | Host | Пауза / продовження |
| `UPDATE_SETTINGS` | Host | Частковий патч `GameSettingsUpdate` (`general` / `mode`) |
| `RESET_GAME` | Host | Скидання в LOBBY |
| `REMATCH` | Host | Реванш |
| `KICK_PLAYER` | Host | Payload: `playerId` (рядок) |
| `TIME_UP` | Server / клієнт (offline) | Кінець часу |
| `ADD_OFFLINE_PLAYER` | Host (offline) | Опційно `{ name?, avatar? }` |
| `REMOVE_OFFLINE_PLAYER` | Host (offline) | Payload: id гравця |
| `TEAM_JOIN` | Гравець / хост | `{ teamId, playerId? }` — якщо `playerId`, призначає хост |
| `TEAM_LEAVE` | Гравець / хост | Опційно `{ playerId? }` |
| `TEAM_SHUFFLE_UNASSIGNED` | Host | Перемішати нерозподілених |
| `TEAM_SHUFFLE_ALL` | Host | Перемішати всіх (з підтвердженням у UI) |
| `TEAM_LOCK` | Host | `{ locked: boolean }` — `teamsLocked` у стані |
| `TEAM_RENAME` | Host | `{ teamId, name }` |
| `IMPOSTER_READY` | Будь-який гравець | Фаза IMPOSTER: готовність після reveal |
| `IMPOSTER_END_GAME` | Будь-який гравець | Завершення обговорення IMPOSTER |

### Режими слів (GameMode), GameTask та патерн Стратегія

Режим зберігається в **`settings.mode.gameMode`** (див. **`ModeSettings`** у `packages/shared/src/models.ts`). Загальні поля (мова, колода, тема, **`teamMode`**: `TEAMS` | `SOLO`) — у **`settings.general`**.

| Режим | Опис |
|-------|------|
| `CLASSIC` | Дефолт, якщо режим не заданий некоректно. `CORRECT` / `SKIP`. |
| `TRANSLATION` | Рядок колоди `Підказка\|Відповідь`; на екрані — перша частина. **`targetLanguage`** у `general` — для майбутніх фільтрів/UI. |
| `SYNONYMS` | На сервері **`ModeFactory`** мапить на **`ClassicModeHandler`** (тимчасово той самий потік, що класика). |
| `QUIZ` | `GameTask` з `options` (до 4), `GUESS_OPTION`; **`currentTaskAnswered`** у стані кімнати. Додаткові поля режиму: `quizTimerMode`, `quizRoundTime`, `quizQuestionTime`, `quizTypes`, `quizWrongPenaltyEnabled`. |
| `HARDCORE` | **`HardcoreModeHandler`**: суворіші правила щодо skip (раунд може завершуватися одразу — див. код хендлера). |
| `IMPOSTER` | **Не** через `IGameModeHandler`: окремі фази в **`GameEngine`**, секретне слово в **Redis** (`RedisRoomStore.saveImposterWord` / окремий префікс ключа), персональна подія **`imposter:secret`** (див. нижче). UI: **`ImposterScreen`**. |

**Модель завдання** — `GameTask` у **`packages/shared/src/models.ts`**:

```typescript
interface GameTask {
  id: string;
  prompt: string;
  answer?: string;
  options?: string[];
  kind?: string; // опційно, наприклад для підписів у QUIZ
}
```

**Синхронізація:** у `GameSyncState` — `currentTask`, `currentWord` (зазвичай = `currentTask.prompt`), для QUIZ також `currentTaskAnswered?`.

**Сервер (патерн Стратегія для «словесних» режимів):** `packages/server/src/modes/`

- `IGameModeHandler`: `generateTask(deck, settings)`, `handleAction(action, currentTask, context)`.
- **`explainerModeActions.ts`**: спільна логіка **CORRECT** / **SKIP** для Classic, Translation, Synonyms і Hardcore (`reduceExplainerAction`; у Hardcore `skipEndsTurn` завершує раунд замість наступного слова).
- **`getHandler(room.settings.mode.gameMode)`** (або еквівалент у коді): `CLASSIC`, `TRANSLATION`, `SYNONYMS`→classic, `QUIZ`, `HARDCORE`. **`IMPOSTER`** обробляється в **`GameEngine`** / **`gameActionPipeline`** окремо.
- Після `WordService` рушій викликає `generateTask` і зберігає `room.currentTask` (крім випадків IMPOSTER, де домінує власний потік).

**Клієнт:** `PlayingScreen` — оболонка (таймер, пауза). **`QuizUI.tsx`** для QUIZ; **`ClassicUI.tsx`** експортує **`ClassicWordCard`** та **`ClassicActionFooter`**; для IMPOSTER у **`GameFlow.tsx`** рендериться **`ImposterScreen`**. Офлайн: `GameContext` — `buildOfflineTask`, локальний lock для квізу за `task.id`.

**Додатково (UX):** хаптики — `packages/client/src/utils/haptics.ts` (`quizCorrect` / `quizWrong`), хук `useHapticFeedback`, легка вібрація на `Button`; модальне вікно QR у лобі — збільшене біле полотно для сканування; у грі використовуються семантичні CSS-змінні `--ui-*` там, де раніше був жорсткий `text-white` / `border-white`.

### Механіка раунду

**Серверна сторона** (`packages/server/src/services/GameEngine.ts`):

1. **START_ROUND**: Визначається поточна команда та пояснювач за `nextPlayerIndex`. Стан → `COUNTDOWN`. Ініціалізується `currentRoundStats`.
2. **START_PLAYING**: Стан → `PLAYING`. Встановлюється `timeLeft = roundTime`. Запускається серверний таймер. З колоди береться наступне «сире» слово, після чого активний **режимний хендлер** будує `currentTask` (`generateTask`).
3. **CORRECT / SKIP / GUESS_OPTION**: Обробка делегується `IGameModeHandler.handleAction`. Оновлюється `currentRoundStats` (у т.ч. `words[]` з `taskId` та `result`: `correct` | `skipped` | `guessed`). За потреби викликається наступне завдання. Якщо `timeUp === true`, перехід у `ROUND_SUMMARY`.
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
hasWinner = teams.some(t => t.score >= settings.general.scoreToWin)
isGameOver = isLastTeam && hasWinner
```

Гра завершується **тільки** коли **остання команда в ротації** закінчує раунд І є хоча б одна команда з рахунком >= **`settings.general.scoreToWin`**. Це дає всім командам рівну кількість раундів.

### Таймер та синхронізація

- **Серверний таймер**: `setInterval` з кроком 1 секунда. Декрементує `timeLeft`.
- **Синхронізація**: Кожні **10 секунд** сервер примусово надсилає `game:state-sync` всім клієнтам (запобігає дрифту через throttling браузерних табів).
- **Пауза**: Коли `isPaused === true`, таймер не декрементується.
- Коли `timeLeft <= 0` → `timeUp = true`, таймер зупиняється, надсилається sync.

### Система слів

**WordService** (`packages/server/src/services/WordService.ts`):

**Пріоритет побудови колоди:**
1. **Custom Deck Code** — якщо задано **`settings.general.customDeckCode`**, шукає `CustomDeck` у БД за access code (тільки approved).
2. **Selected Pack IDs** — **`settings.general.selectedPackIds`**: слова лише з обраних паків.
3. **Default Packs** — якщо пакети не обрані: паки з `isDefault: true`, фільтр за **`general.language`** та **`general.categories`**.
4. **Custom Words** — категорія **`CUSTOM`**: парсить **`general.customWords`** через кому.
5. **MOCK_WORDS** — статичний fallback у `@alias/shared` (`packages/shared/src/constants.ts`). Для **української** категорії **GENERAL** — набір **~520+** слів (довгі сесії без БД не вичерпують пул за кілька хвилин). Інші мови/категорії можуть мати менший набір.
6. **EMERGENCY_WORDS** — останній fallback: **8** українських слів (хардкод у `packages/server/src/services/WordService.ts`), якщо колоду зібрати не вдалося.

**Ротація слів:**
- Колода перемішується (Fisher-Yates shuffle).
- Слова беруться з кінця колоди (`pop()`).
- Масив `usedWords` відстежує вже показані слова в межах поточного «циклу» колоди.
- У межах одного повного обходу пулу **слово не повторюється**, доки не вичерпано доступні слова (логіка в `WordService.nextWord`).
- Коли колода порожня → перебудова з виключенням `usedWords`.
- Коли показано всі доступні слова циклу → reset `usedWords`, нова перетасовка (нотифікація «колода перемішана», якщо застосовується в раунді).

---

## Мережевий протокол (Socket.IO)

Типізовані контракти в `packages/shared/src/events.ts`.

### Client → Server

| Подія | Payload | Опис |
|-------|---------|------|
| `room:create` | `{ playerName, avatar, avatarId? }` | Створити кімнату |
| `room:exists` | `{ roomCode }`, ack `({ exists: boolean })` | Перевірка коду кімнати без join |
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
| `room:error` | `{ code, message }` | Помилка (`code` — стабільний ідентифікатор, див. `ROOM_ERROR_CODES` у shared) |
| `room:player-joined` | `{ player: Player }` | Новий гравець у кімнаті |
| `room:player-left` | `{ playerId }` | Гравець пішов |
| `game:state-sync` | `GameSyncState` | Повний публічний стан (після кожної дії) |
| `imposter:secret` | `{ isImposter, word: string \| null }` | Лише **IMPOSTER**: персонально сокету; слово ніколи не входить у `game:state-sync` |
| `game:notification` | `{ message, type: 'info' \| 'error' \| 'success' }` | Нотифікації |
| `player:kicked` | `{ playerId }` | Кік у кімнаті (усім у room); клієнт скидає сесію лише якщо `playerId` збігається з локальним |

### GameSyncState (повна синхронізація)

```typescript
interface GameSyncState {
  gameState: GameState;
  settings: GameSettings;       // { general, mode } — див. models.ts
  roomCode: string;
  players: Player[];           // Player: див. models.ts (у т.ч. isConnected?)
  teams: Team[];
  currentTeamIndex: number;
  currentWord: string;
  currentTask: GameTask | null;
  currentTaskAnswered?: string; // QUIZ: playerId першого правильного
  currentRoundStats: RoundStats;
  timeLeft: number;
  isPaused: boolean;
  timeUp?: boolean;
  wordDeck: string[];
  imposterPhase?: 'REVEAL' | 'DISCUSSION' | 'RESULTS';
  imposterPlayerId?: string;
  revealedPlayerIds?: string[];
  teamsLocked?: boolean;        // лобі: заборона self-switch команд
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
| `POST` | `/api/auth/google` | Google OAuth. Body: `{ idToken, deviceId? }`. Мерджить анонімні покупки, колоди та **агреговану статистику** з пристрою. |
| `POST` | `/api/auth/telegram` | Telegram Mini App auth. Приймає `initData` (body або `X-Init-Data`), валідує HMAC, створює/знаходить `User.telegramId`, повертає JWT. |
| `GET` | `/api/auth/me` | Профіль + `purchases` + **`playerStats`** (ігри, вгадано, пропущено, `lastPlayed`). Bearer token. |
| `POST` | `/api/auth/player-stats/delta` | Атомарні інкременти лічильників. Body: `{ gamesPlayed?, wordsGuessed?, wordsSkipped? }` (≥0). |
| `POST` | `/api/auth/player-stats/merge-local` | Одноразовий імпорт легасі-об’єкта з клієнта (сума до профілю). |
| `PATCH` | `/api/auth/profile` | Оновити displayName / avatarId. |
| `GET` | `/api/auth/lobby-settings` | Отримати збережені налаштування лобі. |
| `PUT` | `/api/auth/lobby-settings` | Зберегти налаштування лобі як дефолтні. |

### Store

| Метод | Шлях | Опис |
|-------|------|------|
| `GET` | `/api/store` | Каталог (wordPacks, themes, soundPacks). Опціональний Bearer — помічає owned. |
| `POST` | `/api/store/buy-stars` | Telegram Stars: створює invoice link (XTR) для itemType/itemId, повертає `invoiceUrl` для `openInvoice`. |

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

Доступ контролюється **`packages/server/src/routes/admin.ts`** (після **`ipWhitelist`**):

1. Якщо в **`.env`** задано **`ADMIN_API_KEY`**, можна викликати API з заголовком **`x-admin-key: <той самий ключ>`** без JWT (зручно для скриптів). Якщо заголовок передано, але значення не збігається — **403**.
2. Інакше потрібен **`Authorization: Bearer <JWT>`** (не anonymous). Далі:
   - якщо задано **`ADMIN_ALLOWED_EMAILS`** — email користувача має бути в списку;
   - інакше — **`User.isAdmin === true`** у БД;
   - у **production**, якщо whitelist порожній і `isAdmin` false — **403**;
   - у **development** без whitelist і без `isAdmin` — дозволений fallback для зручності.
3. Опційно **`ADMIN_ALLOWED_IPS`**: якщо не порожньо, спочатку перевіряється IP/CIDR (`middleware/ipWhitelist.ts`).

| Метод | Шлях | Опис |
|-------|------|------|
| `GET` | `/api/admin/live` | Live-метрики Redis: активні кімнати (ключі `alias:room:*` без writer), «гравці онлайн» (кількість `alias:socket:*`). |
| `GET` | `/api/admin/packs` | Всі пакети слів |
| `POST` | `/api/admin/packs` | Створити пакет |
| `POST` | `/api/admin/packs/:id/words` | Додати слова (bulk) |
| `POST` | `/api/admin/upload-csv` | Multipart: поле `file` (CSV), body `packId` — імпорт концептів/перекладів (див. `admin.ts`) |
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
| `GET` | `/health` | `{ status: "ok", timestamp, instanceId, redis }` — `instanceId` з `INSTANCE_ID` або випадковий UUID; `redis` — чи підключений Redis |

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
| `statsGamesPlayed` / `statsWordsGuessed` / `statsWordsSkipped` | Int | Агрегована статистика на акаунті |
| `statsLastPlayedAt` | DateTime? | Час останньої зафіксованої активності в іграх |
| `isAdmin` | Boolean | Адмін-доступ (перевіряється в БД для `/api/admin/*`) |

### WordPack
Набір слів певної мови та категорії.

| Поле | Тип | Опис |
|------|-----|------|
| `slug` | String | Унікальний ідентифікатор (e.g. `ua-general`) |
| `language` | String | `"UA"`, `"EN"`, `"DE"` |
| `category` | String | Рядок: `"General"`, `"Food"`, … або **`"Feature"`** для службового паку `feature-custom-packs` (не плутати з `Category.CUSTOM` у enum для кастомних *слів*) |
| `isDefault` | Boolean | Доступний без покупки (зазвичай General-паки) |
| `isFree` | Boolean | Безкоштовний |
| `price` | Int | Ціна в центах (0 = free) |
| `wordCount` | Int | Денормалізована кількість (оновлюється seed/імпортом) |
| `difficulty` / `version` / `name` / `description` | | Див. `schema.prisma` |

### WordConcept

Одна **логічна картка** в пакеті (може бути без `packId` у legacy). Поле **`conceptKey`** — стабільний ключ разом з `packId` (`@@unique`).

| Поле | Тип | Опис |
|------|-----|------|
| `packId` | FK? → WordPack | Пакет |
| `conceptKey` | String? | Відповідає `conceptId` у JSON seed |
| `difficulty` | Int | Складність |
| `isNsfw` | Boolean | Прапорець 18+ |

### WordTranslation

Переклад / форма слова для конкретної мови (**enum** `Language` у Prisma: UA, EN, DE).

| Поле | Тип | Опис |
|------|-----|------|
| `conceptId` | FK → WordConcept | Зв’язок з концептом |
| `language` | Language | UA \| EN \| DE |
| `word` | String | Основне слово для гри |
| `synonyms` / `antonyms` / `tabooWords` | String[] | Метадані для QUIZ / Taboo |
| `hint` | String? | Підказка |
| **Unique** | | `(conceptId, language)` |

### Theme
Візуальна тема гри.

| Поле | Тип | Опис |
|------|-----|------|
| `slug` | String | У seed — значення з [`prisma/data/themes.json`](./packages/server/prisma/data/themes.json) (напр. `premium-dark`, `cyberpunk`, …) |
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
| `paymentProvider` | String | У коді переважно **`stripe`** або **`free`** (у схемі коментар також згадує `liqpay` — резерв, без реалізації в TS) |
| `status` | String | `"pending"`, `"completed"`, `"refunded"`, `"abandoned"` (див. схему) |

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
| `id` | UUID | PK |
| `roomCode` | String | Код кімнати |
| `hostPlayerId` | String | Ідентифікатор хоста на момент запису |
| `playerCount` | Int | Кількість гравців |
| `roundsPlayed` | Int | Зіграно раундів |
| `status` | String | `"active"`, `"completed"`, `"abandoned"` |
| `settings` | Json | Налаштування гри |
| `completedAt` | DateTime? | Час завершення (якщо зафіксовано) |
| `createdAt` | DateTime | Створення запису |

### PushSubscription
Web Push підписки.

---

## Redis

Файл: `packages/server/src/services/RedisRoomStore.ts`

**Використання:**

1. **Room State Persistence** — стан кімнати зберігається в Redis з TTL 2 години. Ключі: `alias:room:{roomCode}`. Дозволяє відновити кімнату після рестарту сервера.
2. **Socket-to-Room Mapping** — `alias:socket:{socketId}` → `{ roomCode, playerId }`. Для reconnection.
3. **Socket.IO Redis Adapter** — PubSub для горизонтального масштабування (кілька Node.js інстансів можуть обслуговувати одну кімнату).
4. **Room writer** — ключ `alias:room:writer:{roomCode}` зберігає `INSTANCE_ID` інстансу, який останнім зберіг знімок кімнати. Використовується для пересилання `game:action` на «власника» стану, якщо сокет потрапив на іншу ноду.
5. **RoomActionRelay** — Redis pub/sub канали `alias:rpc:to:{INSTANCE_ID}`: якщо подія не на writer-ноді, вона пересилається туди — **`game:action`**, **`room:join`**, **`room:leave`**, **`room:rejoin`**; відповідь/помилка повертається клієнту (`room:error` з кодами `RELAY_UNAVAILABLE`, `RELAY_TIMEOUT`). **`roomDisconnect`** (без відповіді) — коли сокет відвалився на іншій ноді, а кімната живе на writer. Вимкнути relay: `ROOM_ACTION_RELAY=0` (або `false` / `no`).
6. **IMPOSTER secret word** — окремий ключ у Redis (префікс `alias:imposter:`), щоб секрет не потрапляв у серіалізований `GameSyncState`.

**Graceful degradation:** Якщо Redis недоступний — онлайн-гра працює в пам’яті, але без persistence між рестартами та без збереження IMPOSTER-секрету між рестартами Redis.

---

## Клієнт (React PWA)

### Роутинг (State Machine)

Замість URL-based роутингу використовується **state machine** на базі `GameState`. Компонент `GameRouter` (`App.tsx`) рендерить потрібний екран:

```
switch (gameState) {
  case GameState.MENU: → <MenuScreen />
  case GameState.PROFILE: → <ProfileScreen />
  … /* усі стани з таблиці GameState вище — див. App.tsx / GameRouter */
  case GameState.LOBBY: → <LobbyScreen />
  case GameState.PLAYING | … : → <GameFlow />
}
```

**Три групи екранів** (реалізація в `screens/menu/*`, `screens/lobby/*`, `screens/GameFlow*`):

- **MenuFlow** (barrel `MenuFlow.tsx`): **усі** стани з таблиці [Стан гри](#стан-гри-gamestate), де в колонці «Де відображається» вказано **MenuFlow** (MENU, PROFILE, …, JOIN_INPUT).
- **LobbyFlow**: LOBBY, SETTINGS, TEAMS (`TeamSetupScreen` + `screens/lobby/components/*`).
- **GameFlow**: VS_SCREEN … GAME_OVER. Для **IMPOSTER** стани PRE_ROUND / COUNTDOWN / PLAYING рендерять **`ImposterScreen`** замість класичних підекранів (див. `GameFlow.tsx`). Інакше: `CountdownScreen`, `PlayingScreen` (внутрішньо — пауза, **GuesserFeedback** тощо).

### Контексти

**GameContext** (`context/GameContext.tsx`) — центральний стейт гри:
- `useReducer` з `AppState` — у т.ч. `currentTask`, `currentWord`, **`settings.general` / `settings.mode`**, imposter UI state, `teamsLocked`.
- `stateRef` — синхронний ref для доступу в callbacks.
- **Online**: дії надсилаються через Socket.IO → сервер обробляє → `game:state-sync` → `dispatch` (у т.ч. синхронізація `currentTask`).
- **Offline**: дії обробляються локально в `handleGameAction()` (у т.ч. `GUESS_OPTION` для квізу).
- **Session persistence**: `localStorage` зберігає стан для rejoin.
- **Preferences**: тема, мова, звук зберігаються окремо в `localStorage`.

**AuthContext** (`context/AuthContext.tsx`) — авторизація:
- Автоматичний anonymous token при старті.
- Google OAuth login.
- Profile management.

### Теми та локалізація

**Теми** (`AppTheme` у `constants.ts` → `THEME_CONFIG`; у виборі UI без дубліката `PREMIUM_LIGHT`):

| Тема | Опис | Free |
|------|------|------|
| `PREMIUM_DARK` (Midnight Ruby) | OLED «шоколадно-чорний» фон, перлинний текст, рубінові акценти (default) | Так |
| `CYBERPUNK` (Earthy Dark) | Темна “земляна” | Так* |
| `FOREST` (Luminous Aero) | Світла «киснева» палітра, індиго / ціан / корал | Так* |
| `SLEEK` (Dark Ruby) | Окремий винний / ruby варіант (преміум) | Так* |
| `VOID_LUXE` (Void Luxe) | OLED black, холодний синій + теплий акцент | Так* |
| `QUANTUM_ECLIPSE` (Quantum Eclipse) | OLED-чорний, фіолетовий + ціан + неоновий помаранч | Так* |

`PREMIUM_LIGHT` — застарілий ідентифікатор теми; у клієнті він зіставлений з тією ж палітрою, що й `PREMIUM_DARK`, і **не** показується окремо у виборі (`UI_THEME_IDS` його фільтрує).

Кожна тема визначає: `bg`, `card`, `textMain`, `textSecondary`, `textAccent`, `button`, `fonts`, `borderRadius`, `progressBar`, `iconColor`.

CSS custom properties встановлюються динамічно: `--font-heading`, `--font-body`, `--theme-radius`.

\* Для гостей (неавторизованих) теми, окрім **`PREMIUM_DARK`** (дефолтна безкоштовна), показуються як **locked** і пропонують логін для розблокування (вибір доступний після авторизації).

Додатково клієнт встановлює **семантичні UI-токени** (theme-aware), які варто використовувати в компонентах замість хардкоду `text-white/bg-white`:

- **Фон і поверхні:** `--ui-bg`, `--ui-surface`, `--ui-elevated`, `--ui-surface-hover`, `--ui-card`
- **Текст:** `--ui-fg`, `--ui-fg-muted`, `--ui-fg-subtle`, `--ui-fg-disabled`
- **Рамки:** `--ui-border`, `--ui-border-subtle`, `--ui-divider`
- **Акцент:** `--ui-accent`, `--ui-accent-contrast`, `--ui-accent-hover`, `--ui-accent-pressed`, `--ui-accent-muted`, `--ui-accent-ring`, `--ui-accent-soft`, `--ui-accent-alt`, `--ui-accent-warm`, `--ui-accent-warm-soft`
- **Статуси:** `--ui-danger`, `--ui-success`, `--ui-warning`

Частина змінних для тем без явних значень **обчислюється** у `GameContext` (наприклад змішування `accent` з `surface` / білим / чорним). Повний явний набір задається в `ThemeConfig.tokens` у `THEME_CONFIG` (див. **Midnight Ruby** нижче та теми на кшталт **Void Luxe** / **Quantum Eclipse**).

Джерело: `packages/client/src/context/GameContext.tsx`, конфіг: `packages/client/src/constants.ts`, типи токенів: `packages/client/src/types.ts`.

#### Палітра за замовчуванням: Midnight Ruby (`PREMIUM_DARK`)

Орієнтовна відповідність HEX → роль → CSS-змінна (як у продакшен-темі):

| HEX | Роль | Змінна |
|-----|------|--------|
| `#0A0809` | Найглибший фон екрану | `--ui-bg` |
| `#141012` | Картки, панелі, базові контейнери | `--ui-surface` |
| `#1F181C` | Підняті поверхні (модалки, меню) | `--ui-elevated` |
| `#281E23` | Hover для інтерактивних карток / рядків | `--ui-surface-hover` |
| `#2A2025` | Делікатні розділювачі | `--ui-border-subtle`, `--ui-divider` |
| `#382A31` | Звичайні рамки, контури інпутів | `--ui-border` |
| `#F4EFF1` | Основний текст | `--ui-fg` |
| `#B5A8AE` | Вторинний текст | `--ui-fg-muted` |
| `#82757B` | Підписи, плейсхолдери | `--ui-fg-subtle` |
| `#594F54` | Disabled | `--ui-fg-disabled` |
| `#E11D48` | Primary акцент | `--ui-accent` |
| `#F43F5E` | Hover primary | `--ui-accent-hover` |
| `#BE123C` | Натиснутий стан | `--ui-accent-pressed` |
| `#3D1520` | Тлі бейджів / soft-кнопок | `--ui-accent-muted` |
| `#F43F5E66` | Focus ring (рубін з ~40% альфою) | `--ui-accent-ring` |
| `#34D399` | Успіх | `--ui-success` |
| `#FBBF24` | Попередження | `--ui-warning` |
| `#FF5252` | Небезпека (відділена від рубінового акценту) | `--ui-danger` |

**Переклади** (`constants.ts` → `TRANSLATIONS`): об'єкт з ключами `UA`, `EN`, `DE`. ~150 ключів на мову.

### Офлайн-режим

В офлайн-режимі:
- Вся ігрова логіка виконується **на клієнті** (в `handleGameAction` у GameContext).
- Слова беруться зі статичних `MOCK_WORDS` (shared).
- Режим **`settings.mode.gameMode`** враховується при формуванні наступного `GameTask` (переклад, квіз, IMPOSTER тощо).
- Socket.IO не використовується.
- Таймер працює локально через `setInterval` у компоненті.
- Гравці додаються/видаляються локально.

---

## Безпека та валідація

### Socket.IO

1. **JWT Auth Middleware** (`socketAuth.ts`): Перевіряє token з `handshake.auth`. Без токена — анонімне з'єднання.
2. **Rate Limiting** (`rateLimit.ts`): Per-socket, per-event. `game:action` — 15/сек. `room:create` — 3/хв (prod). `room:join` — 5/хв.
3. **Zod Validation** (`schemas.ts`): Всі socket payloads проходять через Zod-схеми.
4. **Authorization**: Host-only дії (START_GAME, KICK_PLAYER і т.д.) перевіряються в `socketHandlers.ts`. Explainer-only дії (CORRECT, SKIP, TIME_UP тощо) перевіряють `currentRoundStats.explainerId`. Дія **`GUESS_OPTION`** (режим QUIZ) **не** обмежена пояснювачем — її може надіслати будь-який гравець у кімнаті.
5. **XSS Protection**: Імена гравців та слова проходять через `.replace(/<[^>]*>/g, '')`.

### HTTP

1. **`httpRateLimit.ts`** (`express-rate-limit`): **`authLimiter`** — 20/хв (prod), **1000/хв** (dev, щоб React StrictMode не блокував); **`storeLimiter`** — 60/хв (auth + store + purchases у `index.ts` згруповані за шляхами — див. монтування); **`pushLimiter`** — 10/хв; **`adminLimiter`** — 30/хв (prod), 1000/хв (dev); **`customDecksLimiter`** — 30/хв (prod), 1000/хв (dev).
2. **Admin `/api/admin/*`**: див. розділ [REST API → Admin](#admin); коротко — **`x-admin-key`** лише якщо задано **`ADMIN_API_KEY`**, інакше JWT + whitelist email / `isAdmin`; перед цим спрацьовує **`ADMIN_ALLOWED_IPS`** (якщо налаштовано).
3. **CORS**: Налаштований список origins.
4. **`trust proxy`**: увімкнено в `index.ts` для коректних IP за reverse proxy (rate limit).

---

## Запуск проекту

### Вимоги

- **Node.js** 18+ (`engines.node` у кореневому `package.json`). У **GitHub Actions** для CI зафіксовано **Node 20** (`.github/workflows/ci.yml`).
- **pnpm** 9.x — версія **9.0.0** зафіксована полем **`packageManager`** у кореневому `package.json` (Corepack підхопить її автоматично).
- **Docker** та **Docker Compose** (для Redis + PostgreSQL)

### Кроки

   ```bash
# 1. Встановити залежності
pnpm install

# 2. Скопіювати env
cp .env.example .env
# Відредагувати .env: DATABASE_URL (якщо потрібна своя), JWT_SECRET, GOOGLE_CLIENT_ID (опційно),
# а також VITE_* змінні для клієнта за потреби.

# 3. Запустити Redis + PostgreSQL
   docker-compose up -d redis postgres

# 4. Застосувати міграції та seed
   pnpm --filter @alias/server db:migrate
   pnpm --filter @alias/server db:seed

# 5. Запустити dev-сервер (клієнт + сервер паралельно)
   pnpm run dev
   ```

**Windows (PowerShell) еквівалент:**

```powershell
# 1. Встановити залежності
pnpm install

# 2. Скопіювати env
Copy-Item .env.example .env
# Відредагувати .env

# 3. Запустити Redis + PostgreSQL
docker compose up -d redis postgres

# 4. Застосувати міграції та seed
pnpm --filter @alias/server db:migrate
pnpm --filter @alias/server db:seed

# 5. Запустити dev-сервер (клієнт + сервер паралельно)
pnpm dev
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
| `pnpm --filter @alias/client test` | Юніт-тести клієнта (vitest; також у CI) |
| `pnpm test:e2e` | E2E тести (playwright) |
| `pnpm --filter @alias/server db:migrate` | Prisma **`migrate dev`** (інтерактивні міграції для локальної розробки) |
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

### Troubleshooting: `502 Bad Gateway` (openresty/Nginx Proxy Manager) + Telegram auth

Якщо зовні домен віддає **502** на `/health` і `/api/*`, але SPA (статичні файли) відкривається, це майже завжди означає:

- бекенд-контейнер `app` **падає / рестартується**, або
- reverse proxy не може підʼєднатись до `app:3001` (upstream недоступний).

Найчастіша причина “падає одразу” — **розʼїзд build/run entrypoint** (контейнер стартує з `dist/index.js`, а збірка поклала результат в інший шлях).

У цьому репо бекенд у Docker стартує з:

- `packages/server/dist/server/src/index.js` (див. `packages/server/Dockerfile` і `docker-compose.*.yml`)

Швидка діагностика на VPS:

```bash
docker compose -p alias --env-file .env.prod -f docker-compose.npm.yml ps
docker compose -p alias --env-file .env.prod -f docker-compose.npm.yml logs --tail=200 app
docker compose -p alias --env-file .env.prod -f docker-compose.npm.yml logs --tail=200 gateway
curl -sS -D - https://<DOMAIN>/health -o /dev/null
```

Для Telegram Mini App auth в контейнер `app` мають потрапляти env:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_URL` (production)
- `TELEGRAM_WEBHOOK_SECRET` (production)
- `FRONTEND_URL` (кнопка web_app / посилання)

Перевірка, що бекенд сконфігурований (без справжнього initData):

- без `initData` → **400**
- з фейковим `initData` → **401** (сервер живий, підпис невалідний)

### Деплой на VPS (GitHub Actions)

Workflow [`.github/workflows/deploy-vps.yml`](./.github/workflows/deploy-vps.yml) запускається **після кожного push у гілку `main`** і за запитом (**Actions → Deploy to VPS → Run workflow**). Він підключається по SSH до сервера, оновлює код (`git fetch` + `reset` на `origin/main`), виконує `docker compose ... up -d --build` і **`npx prisma migrate deploy`** у контейнері сервісу `app`.

**Обов’язкові secrets** (репозиторій GitHub → **Settings → Secrets and variables → Actions**):

| Secret | Опис |
|--------|------|
| `VPS_HOST` | IP або hostname VPS |
| `VPS_USER` | SSH-користувач (наприклад `ubuntu`, `deploy`) |
| `VPS_SSH_PRIVATE_KEY` | Приватний ключ у форматі PEM (повний текст, включно з `-----BEGIN ... KEY-----`) |

**Опційно:** `VPS_SSH_PORT`, `VPS_SSH_PASSPHRASE` (якщо ключ з паролем), **`VPS_DEPLOY_PATH`** — абсолютний шлях до клону **як на диску** (на Linux **`alias` ≠ `ALIAS`**). Завершальний `/` не обов’язковий. Якщо secret **не задано**, використовується **`$HOME/apps/ALIAS`** (`/root/apps/ALIAS` для root). **`VPS_COMPOSE_FILE`** — для стеку за Nginx Proxy Manager на хості: **`docker-compose.npm.yml`** (файл у репо разом із `nginx/npm-edge.conf`). **`VPS_COMPOSE_PROJECT`** — наприклад **`alias`**, щоб збігалося з `docker compose -p alias` на сервері. **`VPS_ENV_FILE`** — наприклад `.env`, якщо не `.env.prod`. Локальні нотатки про сервер — `docs/VPS-INFRASTRUCTURE.md` (gitignore), шаблон — [`docs/VPS-INFRASTRUCTURE.md.example`](./docs/VPS-INFRASTRUCTURE.md.example).

**Що має бути на VPS до першого деплою:**

1. Каталог деплою: за замовчуванням **`~/apps/ALIAS`**. Перший запуск без теки — автоматичний `git clone` (див. вище про публічний repo / credentials). Шлях у **`VPS_DEPLOY_PATH`** має **точно** збігатися з реальною текою (регістр літер).
2. У корені клону — файл **`.env.prod`** (заповнений за зразком [`.env.prod.example`](./.env.prod.example)), **не** комітити в git.
3. Встановлені Docker і Docker Compose v2; користувач `VPS_USER` може виконувати `docker compose` без інтерактивного sudo (наприклад група `docker`: `sudo usermod -aG docker $USER` і перелогінитись).
4. SSL і домен — за коментарями у `docker-compose.prod.yml` (certbot тощо), якщо потрібно.

**Примітка для Nginx Proxy Manager (NPM):** якщо NPM працює у зовнішній docker-мережі `proxy`, сервіс `gateway` (з `docker-compose.npm.yml`) також має бути підключений до цієї мережі, інакше NPM не резолвить хост `gateway` та віддає `502 Bad Gateway`. У репо це зафіксовано як `networks.proxy.name: proxy` + `gateway.networks: [default, proxy]`.

Якщо гілка деплою не `main`, змініть `branches` у workflow або додайте свою гілку.

**Якщо в Actions помилка `ssh: unable to authenticate … no supported methods remain`:** (1) Локально перевір `ssh -i приватний_ключ -p порт VPS_USER@VPS_HOST`. (2) У GitHub secret `VPS_SSH_PRIVATE_KEY` — **цілий** приватний файл (`BEGIN`…`END`), без лапок навколо всього блоку. (3) Публічний ключ з пари має бути в `~VPS_USER/.ssh/authorized_keys` на сервері. (4) Якщо локально вхід ок, а Actions ні — workflow записує ключ у файл і використовує `key_path` (не сирий `key:`), щоб багаторядковий secret не псувався. (5) Для ключа **без** passphrase secret `VPS_SSH_PASSPHRASE` **не створюй** (порожній secret може заважати). Ключ **з** passphrase — зараз у workflow поле passphrase не передається; тоді або ключ без пароля для CI, або доведеться розширити workflow.

---

## Тести

Критичні сценарії (must-not-break) зафіксовані в [`docs/TESTING_ACCEPTANCE.md`](./docs/TESTING_ACCEPTANCE.md).

### Серверні (Vitest)

```bash
pnpm test:server
```

Coverage (risk-based, з порогами для core-модулів `services/validation/modes`):

```bash
pnpm --filter @alias/server test:coverage
```

Файли тестів (сервер): `packages/server/src/services/__tests__/`
- `GameEngine.test.ts` — логіка гри
- `RoomManager.test.ts` — кімнати та гравці
- `WordService.test.ts` — побудова колоди
- `schemas.test.ts` — Zod валідація

### Клієнтські (Vitest)

```bash
pnpm --filter @alias/client test
```

Той самий скрипт виконується в job **Client tests** у `.github/workflows/ci.yml`. Тести лежать поруч із кодом (наприклад `*.test.ts` / `*.test.tsx` у `packages/client/src/`).

### E2E (Playwright)

```bash
pnpm test:e2e         # headless
pnpm test:e2e:ui      # з UI
pnpm test:e2e:report  # відкрити звіт
```

Запуск за тегами (рекомендовано для CI):

```bash
pnpm --filter @alias/e2e run test -- --grep "@smoke"
pnpm --filter @alias/e2e run test -- --grep "@core"
pnpm --filter @alias/e2e run test -- --grep "@extended"
```

---

## Конфігурація (env змінні)

Єдиний канонічний файл конфігурації: **кореневий** `.env` (створити з [`.env.example`](./.env.example)).

| Змінна | Обов'язковість | Опис |
|--------|---------------|------|
| `PORT` | Опційно | Порт сервера (default: 3001) |
| `NODE_ENV` | Опційно | `development` / `production` |
| `DATABASE_URL` | **Так** | PostgreSQL URL |
| `REDIS_URL` | Опційно | Redis URL (default: `redis://localhost:6379`) |
| `INSTANCE_ID` | Опційно | Стабільний ідентифікатор репліки при горизонтальному масштабуванні (показується в `/health`, пишеться як room writer у Redis) |
| `ROOM_ACTION_RELAY` | Опційно | Крос-нодовий relay для `game:action` (default: увімкнено). Значення `0`, `false` або `no` — вимикає relay |
| `JWT_SECRET` | **Так** | Секрет для JWT |
| `CORS_ORIGIN` | Опційно | Дозволені origins (через кому) |
| `GOOGLE_CLIENT_ID` | Опційно | Google OAuth client ID (у Cloud Console додайте **Authorized JavaScript origins** для кожного продакшен-URL і для dev, напр. `http://localhost:5173`) |
| `STRIPE_SECRET_KEY` | Опційно | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Опційно | Stripe webhook secret |
| `STRIPE_SUCCESS_URL` | Опційно | URL перенаправлення після оплати |
| `STRIPE_CANCEL_URL` | Опційно | URL при скасуванні оплати |
| `TELEGRAM_BOT_TOKEN` | Опційно | Токен бота (вимагатиметься для Telegram Mini App auth, Stars і webhook). |
| `TELEGRAM_WEBHOOK_URL` | Prod | Публічний HTTPS URL для webhook, напр. `https://alias.example.com/api/bot/webhook`. |
| `TELEGRAM_WEBHOOK_SECRET` | Prod | Secret token для заголовка `X-Telegram-Bot-Api-Secret-Token` (обов’язковий у webhook-режимі). |
| `VAPID_PUBLIC_KEY` | Опційно | VAPID ключ для push |
| `VAPID_PRIVATE_KEY` | Опційно | VAPID private key |
| `VAPID_EMAIL` | Опційно | Email для VAPID |
| `ADMIN_API_KEY` | Опційно | Якщо задано — доступ до `/api/admin/*` з заголовком **`x-admin-key`** з тим самим значенням (без JWT). Див. [Admin](#admin) |
| `ADMIN_ALLOWED_EMAILS` | Опційно | Список email через кому — доступ до адмінки без `isAdmin` у БД (див. `routes/admin.ts`) |
| `ADMIN_ALLOWED_IPS` | Опційно | IP / CIDR через кому — обмеження доступу до адмін-маршрутів (`ipWhitelist`) |
| `TRUST_PROXY_HOPS` | Опційно | Кількість проксі для `express.set('trust proxy')` (prod default **1** у коді, якщо змінна не задана) |
| `SENTRY_DSN` | Опційно | Якщо задано — увімкнено **Sentry** на сервері (`sentry/bootstrap.ts`) |

**Клієнтські env** (також у кореневому `.env`, але з префіксом `VITE_`):

| Змінна | Опис |
|--------|------|
| `VITE_SERVER_URL` | URL сервера (default: `http://localhost:3001`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_SENTRY_DSN` / `VITE_SENTRY_RELEASE` | Опційно: клієнтський Sentry (`src/sentry.ts`) |

---

## Seed даних

Файл: `packages/server/prisma/seed.ts`.

**Детальна документація** (формати JSON у `prisma/data/`, поле `conceptKey`, ієрархія `WordPack` → `WordConcept` → `WordTranslation`): [`docs/PRISMA_WORD_DATA.md`](./docs/PRISMA_WORD_DATA.md).

Словники категорій лежать у **`packages/server/prisma/data/*.json`**. Підтримуються два формати:

- **Масив концептів** — `conceptId`, `difficulty`, `translations.UA|EN|DE` з `word`, `synonyms`, `antonyms`, `tabooWords`, `hint` (рекомендовано).
- **Legacy** — об’єкт `{ "UA": ["..."], "EN": [...], "DE": [...] }` (тільки слова без метаданих).

Після оновлень схеми з міграціями спочатку **`db:migrate`**, потім за потреби **`db:seed`**.

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

### Themes (7 записів у `prisma/data/themes.json`)

| slug | name (seed) | Free |
|------|-------------|------|
| `premium-dark` | Midnight Ruby | Так |
| `premium-light` | Premium Light | Так |
| `cyberpunk` | Indigo | Ні (paid у seed) |
| `forest` | Luminous Aero | Ні |
| `sleek` | Sleek | Так |
| `void-luxe` | Void Luxe | Ні |
| `quantum-eclipse` | Quantum Eclipse | Ні |

Поле `config.id` всередині JSON відповідає enum **`AppTheme`** у клієнті (`PREMIUM_DARK`, `CYBERPUNK`, …). Деталі відображення — `packages/client/src/constants.ts` (**`THEME_CONFIG`**).

### SoundPacks (3 штуки)
`fun` (free), `minimal` (free), `eight-bit` (free)

### Admin
Seed **не** повинен “вшивати” адмінів (це ризик безпеки). Якщо для локальної розробки треба швидко дати комусь адмінку — використовуйте:

- `ADMIN_ALLOWED_EMAILS` (рекомендовано; не вимагає змін у БД)
- або (лише dev) `SEED_ADMIN_EMAILS` при запуску seed, щоб опційно проставити `User.isAdmin=true` для вказаних email

---

## Важливі файли (Quick Reference)

### Ядро ігрової логіки
| Файл | Що робить |
|------|-----------|
| `packages/shared/src/enums.ts` | GameState, Language, Category, AppTheme, SoundPreset, **GameMode** |
| `packages/shared/src/models.ts` | Player, Team, **GameSettings** (`general` + `mode`), **GameTask**, RoundStats |
| `packages/shared/src/actions.ts` | **GameActionPayload**, **GameActionType**, оновлення налаштувань |
| `packages/shared/src/events.ts` | Socket.IO контракти, **GameSyncState** |
| `packages/shared/src/constants.ts` | Дефолти, кольори команд, **MOCK_WORDS** |

### Серверна логіка
| Файл | Що робить |
|------|-----------|
| `packages/server/src/index.ts` | HTTP + Socket.IO + Redis adapter + Sentry |
| `packages/server/src/game/authorizeGameAction.ts` | Хто може надіслати яку `game:action` |
| `packages/server/src/game/gameActionPipeline.ts` | Пайплайн після валідації: sync стану, **IMPOSTER** `imposter:secret` |
| `packages/server/src/socket/disconnectFlow.ts` | Grace period після disconnect |
| `packages/server/src/services/GameEngine.ts` | **Авторитетна логіка**: режими + **IMPOSTER** |
| `packages/server/src/modes/*` | **Classic**, **Translation**, **Quiz**, **Hardcore**; SYNONYMS → Classic |
| `packages/server/src/modes/ModeFactory.ts` | `getHandler`, `registerGameMode` (тести) |
| `packages/server/src/services/RoomManager.ts` | Кімнати, гравці, host migration, IMPOSTER seed |
| `packages/server/src/services/WordService.ts` | Колода з Prisma / custom / MOCK / emergency |
| `packages/server/src/services/RedisRoomStore.ts` | Кімната, сокети, writer, **IMPOSTER word** |
| `packages/server/src/handlers/socketHandlers.ts` | Усі `socket.on`, включно з **`room:exists`** |
| `packages/server/src/validation/schemas.ts` | Zod для сокетів і PATCH налаштувань |

### Клієнтська логіка
| Файл | Що робить |
|------|-----------|
| `packages/client/src/App.tsx` | `GameRouter`, провайдери; глобальні **`ConnectionStatusBanner`**, **`PwaUpdateBanner`** |
| `packages/client/src/context/GameContext.tsx` | Стан, офлайн, **imposterSecret** |
| `packages/client/src/hooks/useSocketConnection.ts` | Socket + **`onImposterSecret`** |
| `packages/client/src/services/api.ts` | REST |
| `packages/client/src/constants.ts` | Переклади, **THEME_CONFIG** |
| `packages/client/src/screens/MenuFlow.tsx` | Barrel → `screens/menu/*` |
| `packages/client/src/screens/LobbyFlow.tsx` | Barrel → `screens/lobby/*` |
| `packages/client/src/screens/GameFlow.tsx` | Маршрутизація VS…GAME_OVER; **IMPOSTER** — окремі гілки для PRE_ROUND / COUNTDOWN / PLAYING |
| `packages/client/src/screens/lobby/TeamSetupScreen.tsx` | Екран `TEAMS` (командний білдер) |
| `packages/client/src/screens/GameFlow/screens/CountdownScreen.tsx` | Відлік перед PLAYING (не-IMPOSTER) |
| `packages/client/src/screens/GameFlow/modes/ClassicUI.tsx` | **ClassicWordCard**, **ClassicActionFooter** |
| `packages/client/src/screens/GameFlow/modes/QuizUI.tsx` | Квіз 2×2 |
| `packages/client/src/screens/GameFlow/screens/ImposterScreen.tsx` | Режим IMPOSTER |
| `packages/client/src/screens/GameFlow/screens/PlayingPauseOverlay.tsx`, `GuesserFeedback.tsx` | UX у `PlayingScreen` (пауза, зворотний зв’язок вгадувача) |
| `packages/client/src/hooks/useHapticFeedback.ts`, `utils/haptics.ts` | Вібрація |

### Конфігурація
| Файл | Що робить |
|------|-----------|
| `packages/server/prisma/schema.prisma` | Повна схема БД |
| `packages/server/prisma/seed.ts` | Seed |
| `packages/server/src/config.ts` | Env |
| `.env.example` | Шаблон env |
| `docker-compose.yml` | Dev |

---

## Довідник модулів (код)

Цей розділ замінює колишній **`CODE_REFERENCE.md`**: короткий навігаційний опис пакетів і точок входу. Деталі seed — [`docs/PRISMA_WORD_DATA.md`](./docs/PRISMA_WORD_DATA.md); лобі — [`docs/LOBBY_TEAM_BUILDER.md`](./docs/LOBBY_TEAM_BUILDER.md); журнал виправлень кімнат — [`docs/ROOM_MANAGEMENT_FIXES.md`](./docs/ROOM_MANAGEMENT_FIXES.md).

### Зовнішні залежності (узагальнено)

| Пакет | Ключові runtime-бібліотеки |
|-------|----------------------------|
| **Корінь** | pnpm, turbo, eslint, prettier, typescript |
| **@alias/shared** | лише `typescript` (після `tsc` — чистий JS) |
| **@alias/server** | express, socket.io, @socket.io/redis-adapter, ioredis, prisma/@prisma/client, zod, stripe, jsonwebtoken, google-auth-library, cors, dotenv, multer, csv-parse, uuid, web-push, express-rate-limit (~8.x), **@sentry/node**, ipaddr.js |
| **@alias/client** | react 19, socket.io-client, vite, @vitejs/plugin-react, vite-plugin-pwa, workbox*, tailwindcss, @stripe/*, @react-oauth/google, lucide-react, qrcode, **@sentry/react** (~10.x) + **@sentry/vite-plugin** (~5.x) |
| **@alias/e2e** | @playwright/test |

### `packages/shared/src`

| Файл | Зміст |
|------|--------|
| `enums.ts` | Усі публічні переліки, включно з **GameMode** (CLASSIC … IMPOSTER) |
| `models.ts` | **GeneralSettings**, **ModeSettings** (discriminated union), **GameSettings**, Player (**isConnected?**), Team, GameTask (**kind?**), RoundStats |
| `actions.ts` | Дії гри + **`GameSettingsUpdate`** для `UPDATE_SETTINGS` |
| `events.ts` | `ClientToServerEvents`, `ServerToClientEvents`, **ROOM_ERROR_CODES**, **GameSyncState** |
| `network.ts` | Допоміжні типи мережі (за наявності) |
| `constants.ts` | `MOCK_WORDS`, `TEAM_COLORS`, числові константи |
| `index.ts` | Re-export |

### `packages/server/src`

| Шлях | Роль |
|------|------|
| `index.ts` | Створення app, лімітери на `/api/*`, `registerSocketHandlers`, Prisma, WordService, RoomManager, GameEngine, Redis adapter, **Sentry** |
| `config.ts` | `dotenv`, порт, CORS, JWT, Stripe, VAPID, **serverInstanceId**, **roomActionRelayEnabled**, **adminAllowedEmails**, **trustProxyHops** |
| `sentry/bootstrap.ts` | Ініціалізація та Express error handler |
| `game/authorizeGameAction.ts` | Матриця дозволів для `GameActionPayload` |
| `game/gameActionPipeline.ts` | Виконання дії, broadcast, **per-socket imposter:secret** |
| `socket/disconnectFlow.ts` | `wireGraceAfterMarkDisconnected` |
| `handlers/socketHandlers.ts` | `room:create`, **`room:exists`**, join/leave/rejoin, `game:action`, relay |
| `services/GameEngine.ts` | Стейт-машина раунду, таймер, **IMPOSTER** фази, делегування в **modes** |
| `services/RoomManager.ts` | CRUD кімнат, **teamsLocked**, IMPOSTER assign, persist |
| `services/WordService.ts` | `buildDeck(settings: GameSettings)` — читає **`settings.general`** |
| `services/RedisRoomStore.ts` | Стан кімнати, сокети, writer, live stats, **saveImposterWord** / **getImposterWord** |
| `services/RoomActionRelay.ts`, `PerRoomQueue.ts`, `disconnectGrace.ts` | Кластер + серіалізація + grace |
| `services/AuthService.ts` | JWT, Google |
| `modes/IGameModeHandler.ts` | Контракт **generateTask** / **handleAction** |
| `modes/ClassicModeHandler.ts` | CLASSIC + SYNONYMS (через фабрику) |
| `modes/explainerModeActions.ts` | Спільний reducer **CORRECT** / **SKIP** для explainer-режимів |
| `modes/TranslationModeHandler.ts`, `QuizModeHandler.ts`, `HardcoreModeHandler.ts` | Режими |
| `modes/ModeFactory.ts` | `getHandler`, `registerGameMode` |
| `routes/admin.ts` | `/api/admin/*`: `ipWhitelist` → **`x-admin-key`** (якщо `ADMIN_API_KEY`) або **JWT** + email whitelist / `isAdmin` |
| `routes/*.ts` | REST: auth, store, purchases, custom-decks, push |
| `middleware/socketAuth.ts`, `rateLimit.ts`, `httpRateLimit.ts`, `ipWhitelist.ts` | Безпека / ліміти |
| `validation/schemas.ts` | Zod: кімнати, **validateGameAction**, часткові налаштування |

**Vitest** (вибірково): `services/__tests__/GameEngine.test.ts`, `RoomManager.test.ts`, `WordService.test.ts`, `RedisRoomStore.test.ts`, `RoomActionRelay.test.ts`, `PerRoomQueue.test.ts`, `validation/__tests__/schemas.test.ts`, `modes/__tests__/*`, `handlers/__tests__/socketHandlers.int.test.ts`, `socket/__tests__/disconnectFlow.test.ts`, `routes/__tests__/auth.routes.test.ts`.

### `packages/client/src`

| Шлях | Роль |
|------|------|
| `index.tsx` | Mount, PWA registration |
| `App.tsx` | `GameRouter` за **GameState**; **`ConnectionStatusBanner`**, **`PwaUpdateBanner`** |
| `context/GameContext.tsx` | Редucer, socket sync, офлайн, **IMPOSTER** / квіз locks |
| `context/AuthContext.tsx` | Токен, профіль |
| `hooks/useSocketConnection.ts` | Підписки на події, **imposter:secret** |
| `screens/GameFlow.tsx` | Маршрутизація VS…GAME_OVER; для IMPOSTER — **ImposterScreen** на PRE_ROUND / COUNTDOWN / PLAYING |
| `screens/menu/*`, `screens/lobby/*` | Реалізація екранів (barrel у MenuFlow / LobbyFlow) |
| `screens/GameFlow/screens/*` | Barrel `index.ts`; **CountdownScreen**, PreRound, Playing (+ overlays), **ImposterScreen**, підсумки, game over |
| `components/Auth/*`, `Settings/*`, `CustomDeck/*`, `Store/QuickBuyModal.tsx` | Модалки логіну/профілю, налаштувань додатку, кастомної колоди, швидка покупка |
| `screens/GameFlow/modes/ClassicUI.tsx` | Експорт **ClassicWordCard**, **ClassicActionFooter** |
| `screens/GameFlow/modes/QuizUI.tsx` | Квіз |
| `screens/admin/*` | Адмін-панель (окремий entry за збіркою) |
| `services/api.ts` | REST-клієнт |

### `packages/e2e`

- `tests/basic.spec.ts`, `multiplayer.spec.ts`, `flows.spec.ts` — Playwright-сценарії; скрипти див. `packages/e2e/package.json`.

---

## Примітки для розробки

### Архітектурні рішення

1. **Авторитетний сервер**: Вся ігрова логіка виконується на сервері. Клієнт — thin client, який лише відображає стан. Це запобігає читерству.
2. **State Machine замість Router**: Гра використовує GameState enum замість URL-based роутингу. Це спрощує керування переходами між екранами.
3. **Full State Sync**: Після кожної дії сервер надсилає повний стан. Це простіше за дифи, хоча й трохи більше трафіку.
4. **Graceful Degradation**: Сервер працює без Redis (без persistence кімнати та без стійкого IMPOSTER-секрету) і без PostgreSQL (fallback **MOCK_WORDS** / emergency). Важливо для dev.
5. **Dual Mode**: Один і той же GameContext підтримує і онлайн, і офлайн режим. Офлайн — логіка в `handleGameAction()`, онлайн — через Socket.IO.

### Правила для ШІ-розробника

1. **Не змінюй GameSyncState** без оновлення і клієнта, і сервера — вони тісно пов'язані.
2. **Не додавай нових GameAction** без оновлення **`validateGameAction` / Zod** у `schemas.ts`, гілки в **`GameEngine.handleAction()`**, за потреби **`authorizeGameAction.ts`**, **`gameActionPipeline.ts`**, і для «словесних» режимів — **`modes/*`** (IMPOSTER та TEAM_* мають власні гілки, не завжди в modes).
3. **Не додавай нових GameState** без оновлення **`GameRouter`** у `App.tsx` і відповідного екрана.
4. **Завжди перевіряй** дозволи: host / explainer / «будь-хто в кімнаті» — див. **`authorizeGameAction.ts`** (наприклад **`GUESS_OPTION`**, **`IMPOSTER_READY`**, **`TEAM_JOIN`**).
5. **Shared пакет** — single source of truth для типів. Зміни тут вимагають `pnpm build:shared`.
6. **Дивись CHANGELOG.md** перед внесенням змін — там логуються всі попередні зміни.
