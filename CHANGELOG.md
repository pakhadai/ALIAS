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

## [2026-03-30] — UI: theme-safe базові компоненти, швидкий фідбек

### Fixed
- Світла тема (`PREMIUM_LIGHT`) більше не ламається через хардкод `text-white/bg-white` у базових варіантах кнопок/карток.
- Які файли змінено: `packages/client/src/components/Button.tsx`, `packages/client/src/components/Card.tsx`, `packages/client/src/context/GameContext.tsx`.
- Чому: компоненти мають брати семантичні кольори/токени теми, а не припущення «завжди темно».

### Changed
- Прискорено мікроінтеракції кнопок: `duration-150 ease-out`, збережено `active:scale-95`.
- Які файли змінено: `packages/client/src/components/Button.tsx`.
- Чому: девіз гри про швидкість; 300 мс відчувалось «в’язко».

### Added
- Короткий системний “click” звук, прив’язаний до натискання кнопки (якщо звук увімкнено).
- Які файли змінено: `packages/client/src/utils/audio.ts`, `packages/client/src/hooks/useAudio.ts`, `packages/client/src/components/Button.tsx`.
- Чому: поєднання анімації + звуку дає відчуття матеріальності.

### Changed
- Колір `FloatingParticle` (`+1/-1`) тепер прив’язаний до кольору активної команди (`team.colorHex`).
- Які файли змінено: `packages/client/src/screens/GameFlow.tsx`.
- Чому: підсилює змагальність і візуальний зв’язок з командою.

### Changed
- Уніфіковано press-патерн (`active:scale-95`) для клікабельних store-карток.
- Які файли змінено: `packages/client/src/screens/MenuFlow.tsx`.
- Чому: однакова “фізика” та м’язова пам’ять по всьому застосунку.

### Added
- Haptic feedback (вібрація) з можливістю вимкнути в налаштуваннях (зберігається локально).
- Які файли змінено: `packages/client/src/utils/haptics.ts`, `packages/client/src/screens/LobbyFlow.tsx`, `packages/client/src/screens/GameFlow.tsx`.
- Чому: тактильний відгук критично підсилює фідбек на мобільних (PWA).

### Changed
- Анімація картки зі словом у `PLAYING`: підтвердження дії через fade/slide при `CORRECT`/`SKIP`, поява нового слова — швидко й м’яко.
- Які файли змінено: `packages/client/src/screens/GameFlow.tsx`.
- Чому: гравець периферійним зором бачить, що дія зарахована.

### Changed
- “Стресовий” таймер на останніх 10 секундах: пульсація + червоний колір; tick-звук для останніх 10 сек.
- Які файли змінено: `packages/client/src/screens/GameFlow.tsx`.
- Чому: таймер — головний драйвер напруги, має відчуватись.

### Changed
- `PageTransition`: короткий м’який вхід (opacity + translateY, ~180ms) без “в’язких” затримок.
- Які файли змінено: `packages/client/src/components/Shared.tsx`, `packages/client/src/App.tsx`, `packages/client/index.html`.
- Чому: переходи між станами не повинні смикатись і дратувати гравця.

### Changed
- Scoreboard: прогрес-бар команд анімовано заповнюється при вході на екран.
- Які файли змінено: `packages/client/src/screens/GameFlow.tsx`.
- Чому: додає відчуття “зароблених” очок.

### Fixed
- Узгоджено правила гри з фактичним UI: в `PLAYING` використовуються кнопки `Correct/Skip` (свайпів немає) — згадки про свайпи прибрано/замінено.
- Які файли змінено: `packages/client/src/constants.ts`.
- Чому: уникнення плутанини для гравця (один стандарт взаємодії).

### Changed
- Поліпшено копірайт/локалізації: DE/EN слоган, DE “Skip” як `Überspringen`, уточнено тексти правил та опис категорій.
- Які файли змінено: `packages/client/src/constants.ts`.
- Чому: природніший текст і консистентність термінів.

### Changed
- `takePhone`: замінено “START/ПОЧАТИ” на семантичні “I'M READY / ICH BIN BEREIT / Я ГОТОВИЙ”.
- Які файли змінено: `packages/client/src/constants.ts`.
- Чому: відокремити підготовчу дію від старту гри.

### Fixed
- Розширено `MOCK_WORDS` для EN/DE, щоб офлайн-раунд не вичерпував колоду надто швидко.
- Які файли змінено: `packages/shared/src/constants.ts`.
- Чому: стабільніший офлайн-режим; виконано `pnpm --filter @alias/shared build`.

### Changed
- `PLAYING`: підвищено читабельність головного слова (font-sans/font-black, більший розмір); прогрес-бар таймера став товстішим, використовує `currentTheme.progressBar`, і переходить у “danger” при <20% часу.
- Які файли змінено: `packages/client/src/screens/GameFlow.tsx`.
- Чому: швидше зчитування слова під стресом + периферійне відчуття таймера.

### Changed
- `COUNTDOWN`: кінематографічний відлік (scale-in + fade-out для кожної цифри).
- Які файли змінено: `packages/client/src/screens/GameFlow.tsx`, `packages/client/index.html`.
- Чому: сильніший ритм/адреналін перед стартом раунду.

### Fixed
- PWA safe areas (notch/home indicator): додано `env(safe-area-inset-top/bottom)` для `PLAYING`, включно з нижнім футером кнопок.
- Які файли змінено: `packages/client/src/screens/GameFlow.tsx`.
- Чому: елементи не перекриваються системними зонами на iOS.

### Changed
- Командні кольори як делікатний акцент: у списку команд використано ліву кольорову смугу замість “заливки” кольором.
- Які файли змінено: `packages/client/src/screens/LobbyFlow.tsx`.
- Чому: менше візуального шуму при насичених темах (FOREST/CYBERPUNK).

### Added
- Лобі: модальне збільшення QR-коду (білий фон для кращого сканування) + підказка “Scan to join”.
- Лобі: копіювання коду кімнати в 1 клік (Clipboard API) + toast.
- Лобі: підтвердження кіку гравця (захист від випадкового натискання).
- Які файли змінено: `packages/client/src/screens/LobbyFlow.tsx`, `packages/client/src/constants.ts`.
- Чому: швидше приєднання, менше помилок, кращий мобільний UX.

### Changed
- Лобі: для гостей додано read-only прев’ю налаштувань (пігулки: час/ціль/категорії) та стан очікування зі спінером; для хоста CTA пульсує коли можна стартувати.
- Які файли змінено: `packages/client/src/screens/LobbyFlow.tsx`.
- Чому: чіткий розподіл ролей хост/гість і менше питань “за якими правилами граємо?”.

## [2026-03-29] — VPS: NPM compose у репо, dockerignore, Actions

### Added
- [`docker-compose.npm.yml`](./docker-compose.npm.yml) — стек за Nginx Proxy Manager (gateway на localhost:9080).
- [`nginx/npm-edge.conf`](./nginx/npm-edge.conf) — HTTP edge: `/api`, `/socket.io`, SPA.

### Fixed
- [`.dockerignore`](./.dockerignore): прибрано `packages/client`, інакше збірка client-образа в Docker падає.
- [`packages/client/Dockerfile`](./packages/client/Dockerfile): healthcheck на `/health`, `127.0.0.1`, довший `start-period`.

### Changed
- [`.github/workflows/deploy-vps.yml`](./.github/workflows/deploy-vps.yml): опційний secret `VPS_COMPOSE_PROJECT` для `docker compose -p`.

### Docs
- [`.env.prod.example`](./.env.prod.example): підказки для `CORS_ORIGIN`, `VITE_SERVER_URL`, `GATEWAY_PUBLISH` (NPM).

---

## [2026-03-29] — Лобі: відключення, вихід, кік

### Added
- Поле `Player.isConnected` у [`packages/shared/src/types.ts`](./packages/shared/src/types.ts): сервер одразу позначає гравця як офлайн при розриві сокета (grace period лишається для видалення з кімнати).
- [`packages/server/src/services/disconnectGrace.ts`](./packages/server/src/services/disconnectGrace.ts): таймери grace + скасування при `room:rejoin`, `room:leave`, `KICK_PLAYER`.
- Локалізації `playerDisconnected`, `playerOnlineHint`, `kickPlayerTitle` (UA/DE/EN) у [`packages/client/src/constants.ts`](./packages/client/src/constants.ts).

### Changed
- [`RoomManager`](./packages/server/src/services/RoomManager.ts): `markSocketDisconnected` / `finalizeGraceRemoval` / `markPlayerReconnected` / `detachSocketsForPlayer`; відновлення з Redis — усі гравці `isConnected: false` до rejoin.
- [`index.ts`](./packages/server/src/index.ts): при `disconnect` одразу `game:state-sync` з офлайн-станом; через 60 с — фінальне видалення як раніше.
- [`socketHandlers.ts`](./packages/server/src/handlers/socketHandlers.ts): `room:leave` очищає `socket.data`, скасовує grace; кік — скасування grace, `detachSockets`, очищення `socket.data` у вигнаного.
- [`LobbyFlow.tsx`](./packages/client/src/screens/LobbyFlow.tsx): підтвердження виходу з лобі в онлайні викликає `leaveRoom()` (раніше лише перехід у меню без `room:leave`); індикація «Відключено», стилі рядка, кнопка кіку з перекладеним `title`; QR-блок з ring під світлу/темну тему; екран команд — мітка для відключених.

### Fixed
- Гість, який сам виходить з лобі, одразу зникає в інших клієнтів (без очікування grace).

---

## [2026-03-29] — Deploy: alias vs ALIAS, compose/npm, trim шляху

### Fixed
- Регістр шляху на Linux: дефолт **`~/apps/alias`**; обрізання завершального `/` у `VPS_DEPLOY_PATH`.

### Added
- Опційні secrets **`VPS_COMPOSE_FILE`**, **`VPS_ENV_FILE`** (наприклад `docker-compose.npm.yml` та `.env` на VPS за NPM).

---

## [2026-03-29] — Deploy: auto-clone якщо ~/apps/ALIAS немає

### Changed
- [`.github/workflows/deploy-vps.yml`](./.github/workflows/deploy-vps.yml): якщо каталог `DEPLOY_PATH` відсутній — `mkdir -p` батьківської теки та `git clone` (branch `main`, shallow). Для **приватного** репозиторію клон на сервері треба налаштувати вручну або через deploy key.
- [`README.md`](./README.md): перший запуск і вимога `.env.prod` перед `docker compose`.

---

## [2026-03-29] — VPS-нотатки лише локально + дефолт ~/apps/ALIAS

### Security
- [`docs/VPS-INFRASTRUCTURE.md`](./docs/VPS-INFRASTRUCTURE.md) додано в [`.gitignore`](./.gitignore) — реальні IP, домени та топологія не комітяться.

### Added
- [`docs/VPS-INFRASTRUCTURE.md.example`](./docs/VPS-INFRASTRUCTURE.md.example): шаблон для копії в локальний `VPS-INFRASTRUCTURE.md`.

### Changed
- [`.github/workflows/deploy-vps.yml`](./.github/workflows/deploy-vps.yml): дефолтний каталог деплою **`$HOME/apps/ALIAS`**.
- [`README.md`](./README.md): деплой, secrets, посилання на `.example` замість чутливого файлу.

---

## [2026-03-29] — Deploy: key_path без тильди (~)

### Fixed
- [`.github/workflows/deploy-vps.yml`](./.github/workflows/deploy-vps.yml): `key_path` → `${{ github.workspace }}/.gha_deploy_key` (drone-ssh не розпізнає `~/.ssh/...`). Ключ пишеться в workspace, не в `~/.ssh`.

---

## [2026-03-29] — Deploy: SSH ключ через key_path

### Fixed
- [`.github/workflows/deploy-vps.yml`](./.github/workflows/deploy-vps.yml): крок «Prepare SSH key» — запис `VPS_SSH_PRIVATE_KEY` у `~/.ssh/gha_deploy_key`, підключення через `key_path` замість `key:` (стабільніше для багаторядкового secret). Прибрано `passphrase` з кроку ssh-action (уникнення порожнього passphrase для ключів без пароля).

### Changed
- [`README.md`](./README.md): оновлено підказки для `unable to authenticate` / passphrase.

---

## [2026-03-29] — Deploy workflow: прибрано script_stop

### Fixed
- [`.github/workflows/deploy-vps.yml`](./.github/workflows/deploy-vps.yml): видалено `script_stop` (у `appleboy/ssh-action@v1.2.2` не підтримується — попередження в логах). Зупинка на першій помилці лишається через `set -euo pipefail` у `script`.

### Changed
- [`README.md`](./README.md): підказки для помилки SSH `unable to authenticate` / ключі та `VPS_SSH_PASSPHRASE`.

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
