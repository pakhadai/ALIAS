# Стан проєкту (архітектурний знімок)

Цей файл — **стислий, але глибший архітектурний аудит** монорепозиторію: фактичні `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig*`, `docker-compose.yml`, `packages/server/prisma/schema.prisma` та пайплайни **GitHub Actions**. Детальні протоколи Socket.IO, ігрові правила, env і деплой — у канонічному [`README.md`](./README.md).

**Оновлено:** 2026-04-13 (Telegram Mini App + seamless auth + Stars + webhook).

---

## 1. Ідентичність репозиторію та воркспейси

| Елемент | Факт у репо |
|--------|-------------|
| Ім’я пакета (корінь) | `alias-master-monorepo` (`package.json`) |
| Менеджер пакетів | **pnpm 9.0.0** — зафіксовано в `packageManager` кореневого `package.json` |
| Воркспейси | `pnpm-workspace.yaml` — один рядок: `packages/*` → `@alias/shared`, `@alias/client`, `@alias/server`, `@alias/e2e` |
| Оркестрація збірки | **Turbo** `^2.9.3` — `turbo.json`: задачі `build` (з `dependsOn: ["^build"]`, артефакти `dist/**`) та `typecheck` |
| Node (вимоги) | Корінь: `engines.node` **>=18**; **CI** (`.github/workflows/ci.yml`) використовує **Node 20** |
| ESLint | `eslint.config.mjs` у корені + devDeps ESLint 9 / typescript-eslint |

**Кореневі скрипти** (узгоджені з README): `dev` (паралельно client+server), `build` (Turbo), `typecheck`, `verify`, `lint` / `format:*`, `test:server`, `test:e2e`, `build:shared`, `build:pnpm` тощо.

---

## 2. Пакети: роль, збірка, залежності

### `@alias/shared` (`packages/shared`)

- **Призначення:** єдине джерело правди для enum-ів, моделей стану, `GameAction*`, контрактів Socket.IO (`events.ts`), констант.
- **Збірка:** `tsc` → `dist/` з **`module: CommonJS`**, `moduleResolution: node` (`packages/shared/tsconfig.json`).
- **Runtime-залежності:** немає; лише `typescript` (dev).

### `@alias/server` (`packages/server`)

- **Призначення:** Express (HTTP), Socket.IO, Prisma, Redis (знімки кімнат, адаптер, relay, IMPOSTER secret), Stripe, JWT/Google, Web Push, Sentry.
- **Збірка:** `tsc` → `dist/` (CommonJS).
- **Entry:** `src/index.ts` (`dev`: `tsx watch`, `start`: `node dist/index.js`).
- **Prisma:** `postinstall` → `prisma generate`; скрипти `db:migrate` (**`migrate dev`** — для локальної розробки), `db:push`, `db:seed`.
- **Ключові runtime-залежності (діапазони з `package.json`):** `express` ^4.21, `socket.io` ^4.8, `@socket.io/redis-adapter` ^8.3, `ioredis` ^5.4, `prisma` / `@prisma/client` ^6.19, `zod` ^4.3, `stripe` ^20.3, `jsonwebtoken` ^9, `express-rate-limit` ^8.2, `@sentry/node` ^10.47, `google-auth-library` ^10.5, `web-push` ^3.6 тощо.
- **Typecheck:** окремий `tsconfig.typecheck.json` — `noEmit: true` + **`paths`: `@alias/shared` → `../shared/src/index.ts`**, щоб перевіряти типи без попередньої збірки shared.

### `@alias/client` (`packages/client`)

- **Призначення:** React PWA (`"type": "module"`), Vite 7, Tailwind 4, `socket.io-client`, REST, Sentry (runtime + Vite plugin), Stripe Elements.
- **Збірка:** `vite build`; PWA — `vite-plugin-pwa` з `injectManifest`, entry **`src/sw.ts`**.
- **Typecheck:** `paths` у `tsconfig.json` — `@alias/shared` → **`../shared/src/index.ts`** (швидкий цикл у монорепо без обов’язкового `dist` shared).
- **Тести:** Vitest (`packages/client/src/**/*.test.ts(x)` поруч із кодом).
- **Ключові залежності:** `react` / `react-dom` ^19.2, `vite` ^7.3, `socket.io-client` ^4.8, `@sentry/react` ^10.47, `@sentry/vite-plugin` ^5.1, `tailwindcss` ^4.2, `@stripe/*`, workbox ^7.4.

### `@alias/e2e` (`packages/e2e`)

- **Призначення:** Playwright; `test` → `node run-playwright.mjs`; `install:browsers` — Chromium.

---

## 3. Інфраструктура для розробки (Docker)

`docker-compose.yml` (корінь):

- **Redis:** образ `redis:7-alpine`, AOF.
- **PostgreSQL:** `postgres:16-alpine`, БД/користувач `alias`, пароль dev з compose-файлу.
- Опційний сервіс **`server`** — збірка з `packages/server/Dockerfile`, залежить від redis/postgres.

Це узгоджується з таблицею стеку в README (PostgreSQL 16, Redis 7).

---

## 4. Архітектура шарів (логічна)

```
[Browser: React PWA]
    │  HTTP (REST)          │  WebSocket (Socket.IO)
    ▼                       ▼
[Node: Express + Socket.IO]
    │
    ├─► Handlers / middleware (auth, rate limit, Zod)
    ├─► Services: GameEngine, RoomManager, WordService, RedisRoomStore, RoomActionRelay, черги…
    ├─► PostgreSQL (Prisma) — користувачі, паки слів, покупки, колоди, сесії, push
    └─► Redis (опційно) — persistence кімнат, socket↔room, adapter, writer lock, cross-node relay, IMPOSTER secret
```

**Авторитет сервера:** онлайн-стан гри обчислюється на сервері; клієнт застосовує повні знімки `game:state-sync` (без merge дифів) — див. README.

---

## 5. Потік даних (Data Flow): клієнт ↔ сервер

### 5.1. Підключення

- Клієнт: `socket.io-client` (типово `useSocketConnection` — `packages/client/src/hooks/useSocketConnection.ts`).
- У handshake передається JWT у `auth` (за наявності); інакше — анонімне з’єднання (`socketAuth` на сервері).

### 5.2. Кімнати

Події **`room:create`**, **`room:exists`**, **`room:join`**, **`room:leave`**, **`room:rejoin`** та відповіді **`room:*`**, **`room:error`**, **`room:player-*`** — контракт у `packages/shared/src/events.ts`, обробка в `packages/server/src/handlers/socketHandlers.ts`.

### 5.3. Ігровий цикл

1. Клієнт надсилає **`game:action`** з `GameActionPayload`.
2. Сервер: Zod (`validation/schemas.ts`) → авторизація (`game/authorizeGameAction.ts`) → **`gameActionPipeline`** / **`GameEngine`** / режимні хендлери (`modes/*`). Для Classic / Translation / Synonyms / Hardcore спільні **CORRECT** / **SKIP** зведені в **`modes/explainerModeActions.ts`** (`reduceExplainerAction`); QUIZ і IMPOSTER — власні гілки → збереження стану (in-memory + Redis).
3. Broadcast **`game:state-sync`** (`GameSyncState`) усім у кімнаті; для **IMPOSTER** — додатково точково **`imposter:secret`** на відповідний сокет (секрет не в загальному sync).

### 5.4. Кластер / кілька інстансів

- **Socket.IO Redis adapter** — pub/sub між нодами.
- **Room writer** (`alias:room:writer:{roomCode}`) + **RoomActionRelay** — пересилання **`game:action`**, **`room:join`**, **`room:leave`**, **`room:rejoin`** на ноду-власника стану; помилки relay — `room:error` з кодами на кшталт `RELAY_*` (див. README).
- Вимкнення relay: змінна **`ROOM_ACTION_RELAY`** (`0` / `false` / `no`).

### 5.5. REST (паралельно)

Базовий URL за замовчуванням **`http://localhost:3001`**: `/api/auth/*`, store, purchases, custom-decks, push, **`/health`**, **`/api/admin/*`** — зібрано в `packages/server/src/index.ts` та `routes/*`.

### 5.6. Reconnect

У коді сервера константа **`RECONNECT_GRACE_MS = 60_000`** (`packages/server/src/index.ts`) — 60 с grace period (як у README).

---

## 6. База даних (Prisma / PostgreSQL)

**Файл:** `packages/server/prisma/schema.prisma`. **Datasource:** PostgreSQL, URL з `DATABASE_URL`.

| Модель | Призначення |
|--------|-------------|
| `User` | anonymous/Google, профіль, `defaultSettings` (JSON), агрегована статистика, `isAdmin`, зв’язки |
| `WordPack` | Каталог паків (`slug`, `language`, `category`, ціни, `isDefault`, `wordCount`…) |
| `WordConcept` | Логічна картка (`conceptKey`, складність, NSFW), опційно без `packId` (legacy) |
| `WordTranslation` | Слово та метадані для `Language` enum (UA/EN/DE), unique `(conceptId, language)` |
| `Theme` / `SoundPack` | Магазин, поле `config` (JSON) |
| `Purchase` | Покупка (FK на один з трьох типів контенту), Stripe-ідентифікатори, статус, індекси для аналітики |
| `CustomDeck` | Користувацька колода (`words` JSON, `accessCode`, `status`) |
| `GameSession` | Аналітика сесії (`roomCode`, `hostPlayerId`, лічильники, `settings` JSON, `status`, `completedAt`) |
| `PushSubscription` | Web Push (`endpoint` unique, optional `userId`) |

Індекси в схемі підтримують фільтрацію паків, аналітику покупок/сесій та адмінські вибірки за датою.

**Продакшен-міграції:** у контейнері / VPS застосовується **`prisma migrate deploy`** (див. README → Docker / GitHub Actions). Локальний скрипт **`pnpm --filter @alias/server db:migrate`** викликає **`prisma migrate dev`**.

---

## 7. CI / якість (GitHub Actions)

Файл **`.github/workflows/ci.yml`** (скорочено):

1. **quality** — `pnpm install --frozen-lockfile` → `prisma generate` (server) → **`pnpm typecheck`** → **`pnpm lint`** → **`pnpm format:check`** → **`pnpm --filter @alias/server test:coverage`** → **`pnpm --filter @alias/client test`**.
2. **e2e_smoke** / **e2e_core** — збірка **`@alias/shared`**, Playwright з фільтрами **`@smoke`** та **`@core`** (окремі `--project=chromium` / `mobile-chrome` у `e2e_core` — див. workflow).

Також у репозиторії: **`deploy-vps.yml`**, **`secret-scan.yml`** — згадані в README у структурі каталогів.

---

## 8. Ключові залежності (зведення)

Точні резолвнуті версії — у **`pnpm-lock.yaml`**; тут — діапазони з `package.json` воркспейсів.

| Шар | Пакети (орієнтир) |
|-----|-------------------|
| Корінь | `turbo` ^2.9, `typescript` ~5.8, ESLint 9, Prettier 3, Husky 9 |
| Shared | лише TypeScript (dev) |
| Server | Express 4, Socket.IO 4.8.x, Redis adapter 8.x, ioredis 5.x, Prisma 6.19.x, Zod 4.3.x, Stripe 20.x, Vitest 3.x |
| Client | React 19.x, Vite 7.x, Socket.IO client 4.8.x, Sentry 10.x / plugin 5.x, Tailwind 4.x, Vitest 3.x |
| E2E | `@playwright/test` ^1.50 |

---

## 9. Узгодженість документації з конфігами (аудит)

Перевірено на відповідність **README** ↔ фактичні файли:

- Версії стеку (React 19, Vite 7, Prisma 6.19, Zod 4.3, Socket.IO 4.8, PostgreSQL 16, Redis 7) — відповідають `package.json` / `docker-compose.yml`.
- **pnpm:** у README додано явне посилання на **`packageManager: pnpm@9.0.0`** та на **Node 20 у CI**.
- **Тести:** у README відображено **клієнтські Vitest** та посилання на `ci.yml` (раніше акцент був лише на сервері).
- **`db:migrate`:** у таблиці скриптів README уточнено, що це **`prisma migrate dev`** (не `deploy`).

---

## 10. Зв’язок з іншою документацією

- [`README.md`](./README.md) — повний опис протоколів, станів гри, REST, Redis, безпеки, запуску, Docker, VPS.
- [`docs/PRISMA_WORD_DATA.md`](./docs/PRISMA_WORD_DATA.md), [`docs/LOBBY_TEAM_BUILDER.md`](./docs/LOBBY_TEAM_BUILDER.md), [`docs/TESTING_ACCEPTANCE.md`](./docs/TESTING_ACCEPTANCE.md), [`docs/ROOM_MANAGEMENT_FIXES.md`](./docs/ROOM_MANAGEMENT_FIXES.md).
- [`CHANGELOG.md`](./CHANGELOG.md) — історія змін.

---

## 11. Точки розширення (навігація без зміни коду тут)

- Нові події Socket.IO — `packages/shared/src/events.ts` + `socketHandlers` + клієнтський хук.
- Нові поля синхронізації — `GameSyncState` + серверний рендер + клієнтський reducer.
- Зміни БД — міграції в `packages/server/prisma/migrations`.
- Нові explainer-режими з CORRECT/SKIP — розширити **`modes/explainerModeActions.ts`** і відповідний `*ModeHandler`, або винести окремий handler (як QUIZ).
- Клієнт: глобальні банери та оболонка — `App.tsx` (**`ConnectionStatusBanner`**, **`PwaUpdateBanner`**); екран **`TEAMS`** — `TeamSetupScreen` + `screens/lobby/components/*` (див. `docs/LOBBY_TEAM_BUILDER.md`).

---

## 12. Підхід до архітектурної документації

Канонічний опис протоколів, станів, REST і деплою — **[`README.md`](./README.md)**. Цей файл — знімок монорепо та узгодженість з конфігами; при зміні стеку або CI варто оновлювати обидва документи узгоджено.
