# Changelog

Всі значущі зміни проекту документуються тут.

Формат базується на [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## Як заповнювати

Кожна зміна має бути задокументована у відповідній секції:

- **Added** — нова функціональність
- **Changed** — зміни існуючої функціональності
- **Fixed** — виправлення багів
- **Removed** — видалена функціональність
- **Security** — виправлення вразливостей
- **Refactored** — рефакторинг без зміни поведінки

**Шаблон для нового запису:**

```markdown
## [YYYY-MM-DD] — Короткий опис

### Added / Changed / Fixed / Removed
- Що саме зроблено
- Які файли змінено: `path/to/file.ts`
- Чому (контекст, причина)
```

---

## [2026-03-29] — GitHub Actions: деплой на VPS

### Added
- [`.github/workflows/deploy-vps.yml`](./.github/workflows/deploy-vps.yml): при push у `main` (і `workflow_dispatch`) — SSH на VPS, `git reset` на `origin/main`, `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build`, `prisma migrate deploy` у контейнері `app`.
- У [`README.md`](./README.md): секція «Деплой на VPS (GitHub Actions)», таблиця secrets, чекліст підготовки сервера, приклад ручного `docker compose` з `.env.prod`.

---

## [2026-03-29] — Довідник коду CODE_REFERENCE.md

### Fixed
- `GameContextType.handleJoin` у `packages/client/src/types.ts`: додано опційний параметр `avatarId`, як у реалізації `GameContext`.

### Added
- Файл [`CODE_REFERENCE.md`](./CODE_REFERENCE.md): структурований опис пакетів `@alias/shared`, `@alias/server`, `@alias/client`, `@alias/e2e`; таблиці зовнішніх бібліотек; перелік класів і методів (`GameEngine`, `RoomManager`, `WordService`, `RedisRoomStore`, `AuthService`); функції роутів, middleware, валідації, socket handlers; експорти React (екрани, компоненти, хуки, `api.ts`, `audio.ts`); моделі Prisma; покриття існуючими Vitest-файлами; рекомендації для наступних тестів.
- У [`README.md`](./README.md) додано посилання на `CODE_REFERENCE.md` та `CHANGELOG.md` (на початку та в змісті).

---

## [2026-03-29] — Аудит: збірка, тести, claim soundPack, офлайн-гравець

### Fixed
- **Кореневий `pnpm run build`** не запускав збірку клієнта/сервера: `pnpm run --parallel build:client build:server` інтерпретувався як рекурсивний запуск скриптів у workspace і падав з `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`. Замінено на `pnpm --parallel --filter @alias/client --filter @alias/server run build`. Файл: `package.json`.
- **`POST /api/purchases/claim` для `soundPack`**: для `itemType === 'soundPack'` поле `isFree` лишалось `false`, тому завжди поверталось `400 Item is not free`, хоча API дозволяв тип у тілі запиту. Додано завантаження `SoundPack` з Prisma і перевірку `isFree`. Файл: `packages/server/src/routes/purchases.ts`.
- **Офлайн-гравець (`ADD_OFFLINE_PLAYER`)**: об’єкт `Player` створювався з `stats: { explained: 0 }` без `guessed`, що суперечить контракту `Player` у `@alias/shared`. Додано `guessed: 0`. Файл: `packages/client/src/context/GameContext.tsx`.

### Changed
- **Тести `RoomManager.handleDisconnect`**: очікування `null` при відключенні не-хоста не відповідало реалізації та JSDoc (повертається `{ roomCode, removedPlayerId }` для broadcast у `index.ts`). Тест оновлено під фактичну поведінку. Файл: `packages/server/src/services/__tests__/RoomManager.test.ts`.
- **Тест таймера `GameEngine`**: очікувався перехід у `ROUND_SUMMARY` після спливу таймера; насправді сервер лише виставляє `timeUp` і зупиняє інтервал — перехід у підсумок раунду відбувається після дії пояснювача (`CORRECT`/`SKIP`) або `TIME_UP`. Тест вирівняно з реальною логікою. Файл: `packages/server/src/services/__tests__/GameEngine.test.ts`.

---

## [2026-03-29] — Документація проекту

### Added
- Створено детальний `README.md` з повним описом проекту:
  - Ідея та правила гри
  - Технічний стек та архітектура
  - Детальна ігрова логіка (стейт-машина, дії, механіка раунду, підрахунок очок)
  - Мережевий протокол (Socket.IO події, reconnection, host migration)
  - REST API довідник
  - Prisma-схема БД
  - Redis використання
  - Клієнтська архітектура (роутинг, контексти, теми, офлайн-режим)
  - Безпека та валідація
  - Інструкції запуску, Docker, тести, конфігурація
  - Quick reference таблиця важливих файлів
  - Правила для ШІ-розробника
- Створено `CHANGELOG.md` (цей файл) для логування змін

---

## Попередній стан проекту (до документації)

Проект на момент створення документації:
- **Client**: v0.2.3 (@alias/client)
- **Server**: v0.3.0 (@alias/server)
- **Функціональність**: повноцінна онлайн/офлайн гра Alias з 3 мовами, 5 темами, 3 звуковими пакетами, 15 наборами слів (~200 слів кожен), Google OAuth, Stripe інтеграцією, PWA, push-нотифікаціями, адмін-панеллю, кастомними колодами
