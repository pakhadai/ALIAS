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

## [2026-04-07] — Admin panel fixes and API key authentication

### Added
- **Admin button in profile:** додано умовну кнопку "Адмін-панель" у профіль користувача, яка відображається тільки для користувачів з `isAdmin: true`. Файл: `packages/client/src/screens/MenuFlow.tsx`.

- **API key authentication for admin:** додано підтримку статичного API-ключа для доступу до адмін-функцій як альтернатива JWT-токенам. Це дозволяє входити в адмінку без авторизації через Google/Apple. Файли: `packages/server/src/config.ts` (нова змінна `adminApiKey`), `packages/server/src/routes/admin.ts` (оновлена функція `adminAuth`), `packages/server/.env` (нова змінна `ADMIN_API_KEY`).

- **CSS variables for admin panel:** додано базові CSS-змінні для темної теми безпосередньо в admin.html, щоб адмін-панель виглядала як решта додатку. Файл: `packages/client/admin.html`.

### Fixed
- **"Admin access is not configured" error:** виправлено помилку, що виникала при спробі доступу до адмінки в продакшені без налаштованих дозволених email. Тепер система правильно перевіряє конфігурацію та дозволяє доступ через API-ключ. Файли: `packages/server/src/routes/admin.ts`, `packages/server/.env` (додано `ADMIN_ALLOWED_EMAILS`).

- **TypeScript typing in CSV upload:** виправлено використання `as any` при призначенні мови словам у CSV завантаженні. Замінено на правильну типізацію `as Language` з імпортом типу. Файл: `packages/server/src/routes/admin.ts`.

### Fixed
- **Slider settings flood:** повзунки часу раунду, очок для перемоги і кількості команд тепер використовують локальний стан у `packages/client/src/screens/LobbyFlow.tsx` і відправляють `UPDATE_SETTINGS` тільки після `onMouseUp` / `onTouchEnd`.

- **Room leave race condition:** `room:leave` тепер синхронно очищує `socket.data` перед асинхронним видаленням з черги, щоб уникнути помилки `ALREADY_IN_ROOM`, якщо користувач швидко створює нову кімнату. Файл: `packages/server/src/handlers/socketHandlers.ts`.

- **Zombie room cleanup:** якщо `addPlayer` після `createRoom` не вдалося, новостворена кімната видаляється через `roomManager.deleteRoom(room.code)`. Файл: `packages/server/src/handlers/socketHandlers.ts`.

- **Pack language fallback fix:** вибір мови пака тепер fallback-иться на `settings.general.language`, а не на `EN`. Файл: `packages/client/src/screens/LobbyFlow.tsx`.

### Changed
- **Admin authentication flow:** оновлено логіку аутентифікації адмін-маршрутів — тепер спочатку перевіряється API-ключ у заголовку `x-admin-key`, а потім JWT-токен. Це дозволяє гнучкіший доступ для адміністраторів. Файл: `packages/server/src/routes/admin.ts`.

---

## [2026-04-07] — Database migration for multilingual words & CSV upload

### Added
- **Multilingual word support:** повністю переписана структура бази даних для підтримки багатомовних слів. Замість простої моделі `Word` тепер використовується `WordConcept` (концепт слова) з `WordTranslation` (переклади на різні мови). Це дозволяє одному концепту мати переклади на українську, англійську, німецьку тощо з окремими синонімами, антонімами та забороненими словами для кожної мови. Файл: `packages/server/prisma/schema.prisma`.

- **CSV upload for word packs:** додано функціонал завантаження слів через CSV файли в адмін-панелі. Адмін може завантажити CSV з колонками `difficulty, word_ua, synonyms_ua, taboo_ua, word_en, synonyms_en, taboo_en` для створення концептів з перекладами. Файли: `packages/server/src/routes/admin.ts` (новий ендпоінт `POST /api/admin/upload-csv`), `packages/client/src/services/api.ts` (функція `uploadCsvToPack`), `packages/client/src/screens/AdminPanel.tsx` (UI для завантаження).

### Changed
- **WordService.buildDeck():** оновлено логіку вибору слів з бази даних — тепер вибирає з `wordTranslation` замість `word`, фільтруючи за мовою гри. Файл: `packages/server/src/services/WordService.ts`.

- **Admin routes:** адаптовано всі адмін-ендпоінти для роботи з новою структурою слів (концепти + переклади замість прямих слів). Файл: `packages/server/src/routes/admin.ts`.

- **Seed script:** оновлено для створення концептів та перекладів замість прямих слів. Файл: `packages/server/prisma/seed.ts`.

- **WordService tests:** оновлено моки та перевірки для роботи з `wordTranslation` замість `word`. Файл: `packages/server/src/services/__tests__/WordService.test.ts`.

### Fixed
- **REMATCH word deck preservation:** виправлено логіку ревіншу — тепер при ревінші зберігається поточна колода слів замість скидання на порожній масив. Це запобігає повторному появі тих самих слів у другій грі. Файли: `packages/client/src/context/GameContext.tsx` (клієнт), `packages/server/src/services/GameEngine.ts` (сервер).

---

## [2026-04-07] — Pause overlay UX, auto-login race condition, & unified modal animations

### Fixed
- **Auto-login race condition:** виправлена проблема, де `stateRef.current` у `GameContext.handleJoin()` містив застарілі значення `isHost` і `roomCode` під час автоматичного входу на EnterNameScreen. Тепер замість `stateRef.current` використовується актуальний `state` із замикання `useMemo`, що гарантує консистентність даних при швидких переходах (створення гри → введення імені → auto-login). Результат: авто-вхід як для хостів, так і для гравців, які приєднуються, може надійно відбутися без затримок. Файл: `packages/client/src/context/GameContext.tsx:handleJoin()`.

### Changed
- **PlayingPauseOverlay:** поліпшена UX паузи під час гри:
  - Додано `onResume` prop для прямого callback на натиск
  - Весь оверлей тепер клікабельний (фон + панель)
  - Збільшено візуальну масштабність: `py-16` замість `py-12`, іконка `text-[80px]` замість `text-6xl`
  - Замінено іконку з `pause_circle` на `play_circle` (інтуїтивніше для resume)
  - Додано масштабний transition: `active:scale-[0.98]`
  - Вміст детальніше описаний для ясної взаємодії
  - Файл: `packages/client/src/screens/GameFlow/screens/PlayingPauseOverlay.tsx`.

- **Unified bottom-sheet modal animations:** стандартизовано анімацію появи/зникнення для всіх bottom-sheet модалок:
  - Оновлено `bottomSheetBackdropClass()` та `bottomSheetPanelClass()` у `Shared.tsx` для генерування однорідних CSS-класів
  - Фон тепер має `bg-transparent opacity-0 pointer-events-none` при закритті (замість лише `bg-transparent`)
  - Панель слідує `translate-y-full` (вниз) при закритті без анімованого повороту
  - Всі модалки (`ProfileModal`, `LoginModal`, `CustomDeckModal`, `StoreModal`, `QuickBuyModal`, `RulesModal`, QR-sheet, AddPlayer-sheet) тепер використовують одні й ті ж класи
  - Особливо `ProfileModal` було перероблено на єдині функції замість жорстко прописаних класів
  - Результат: плавна, зв'язна анімація по всьому додатку при появі та закритті модалок
  - Файли: `packages/client/src/components/Shared.tsx`, `packages/client/src/components/Auth/ProfileModal.tsx`, `packages/client/src/screens/GameFlow/screens/PlayingPauseOverlay.tsx`.

---

## [2026-04-07] — Critical room management & mobile state sync fixes

### Fixed
- **Headless room bug (БАГ 1.1):** виправлена логіка передачі прав хоста при виході хоста з кімнати. Хост більше не залишається "безголовим". Файл: `packages/server/src/services/RoomManager.ts:removePlayer()`.
- **Memory leak (БАГ 1.2):** порожні кімнати тепер автоматично очищаються при виході останнього гравця, замість того щоб зависати в Redis на 2 години. Файл: `packages/server/src/services/RoomManager.ts:removePlayer()`.
- **Premature host migration (БАГ 1.3):** видалена логіка миттєвої міграції хоста з `markSocketDisconnected()` — міграція тепер відбувається лише в `finalizeGraceRemoval()` після grace-періоду, що дозволяє хостам з морганням інтернету зберегти свої права. Файл: `packages/server/src/services/RoomManager.ts:markSocketDisconnected()`.
- **Room code collisions in cluster (БАГ 2.1):** `generateRoomCode()` тепер асинхронна і перевіряє унікальність коду не тільки в локальній пам'яті, а й у Redis, запобігаючи колізіям у кластерних розгортаннях. Файл: `packages/server/src/services/RoomManager.ts:generateRoomCode()`, `packages/server/src/handlers/socketHandlers.ts`.
- **Ghost players (multi-join corruption):** додана перевірка в `room:create` та `room:join` обробники — гравець не може бути одночасно у двох кімнатах. Файл: `packages/server/src/handlers/socketHandlers.ts`.
- **Dead host assignment:** при міграції прав хоста тепер пріоритизуються онлайн-гравці. Якщо всі офлайн, праці йдуть до першого гравця в списку (кімната все одно скоро помре). Файли: `packages/server/src/services/RoomManager.ts:removePlayer()` та `finalizeGraceRemoval()`.
- **Race condition on mobile join (БАГ 3.x):** виправлена race condition в `onStateSync()` (GameContext), де server-side `gameState` перезаписував client-side навігацію на мобільних мережах. Тепер payload будується умовно: якщо `keepClientNav = true`, `gameState` не включається в dispatch, що дозволяє React об'єднати дані. Результат: користувачі більше не зависають на ENTER_NAME екрані після приєднання. Файл: `packages/client/src/context/GameContext.tsx:onStateSync()`.

### Added
- **New error code:** `ALREADY_IN_ROOM` для повідомлення користувачу при спробі приєднатися до нової кімнати без виходу з поточної. Файл: `packages/shared/src/events.ts`.

### Changed
- **RoomManager.createRoom():** тепер поверта `Promise<Room>` замість синхронного результату (через асинхронну генерацію коду з перевіркою Redis). Всі тести оновлені на `async/await`. Файл: `packages/server/src/services/RoomManager.ts`, `packages/server/src/handlers/socketHandlers.ts`, `packages/server/src/services/__tests__/RoomManager.test.ts`.

---

## [2026-04-06] — Midnight Ruby (default theme), розширені `--ui-*` та документація

### Changed
- **Тема за замовчуванням `PREMIUM_DARK`:** палітра **Midnight Ruby** (OLED-фон `#0A0809`, перлинний текст, рубіновий акцент `#E11D48`, окремі семантичні success / warning / danger). Файли: `packages/client/src/constants.ts`, `packages/client/src/styles.css`.
- **UI-токени:** додано та виставляються з `THEME_CONFIG.tokens` (або за замовчуванням змішуються): `--ui-border-subtle`, `--ui-fg-disabled`, `--ui-accent-hover`, `--ui-accent-pressed`, `--ui-accent-muted`, `--ui-accent-ring`; primary-кнопки та focus ring використовують ці змінні. Файли: `packages/client/src/context/GameContext.tsx`, `packages/client/src/types.ts`, `packages/client/src/components/Button.tsx` та суміжні CTA в модалках / екранах.
- **Документація:** `README.md` — оновлено таблицю тем, повний перелік семантичних змінних, таблиця HEX ↔ Midnight Ruby; виправлено примітку про locked-теми для гостей (`PREMIUM_DARK` замість застарілого `DEEP_STEEL`).
- **Seed (каталог магазину):** запис `premium-dark` узгоджено з назвою/описом/preview Midnight Ruby. Файл: `packages/server/prisma/seed.ts`.

## [2026-04-06] — 0.5.2: bottom sheets, live help, pack language, rejoin guard

### Changed
- **Release:** bump app/package versions to **0.5.2** (client/server/shared + client `version.json`).
- **UI:** `AppSettingsModal` для гостей відкривається як bottom-sheet (як `ProfileModal`), а не centered modal. Файл: `packages/client/src/components/Settings/AppSettingsModal.tsx`.
- **Help/Rules:** “Довідник” (Rules) для гостей відкривається bottom-sheet знизу; вкладки оновлено під реальні режими/налаштування (підсвічує активний режим і показує поточні значення). Файл: `packages/client/src/screens/MenuFlow.tsx`.
- **Lobby packs:** вибір мови для паків більше **не змінює мову UI** — впливає лише на доступні паки/слова (фільтр за мовою). Файл: `packages/client/src/screens/LobbyFlow.tsx`.
- **Stability:** додано валідацію `localStorage` ключів `roomCode/playerId` перед auto-rejoin, щоб прибрати випадкові `INVALID_PAYLOAD` (“Invalid data”) при створенні/вході в лоббі. Файли: `packages/client/src/hooks/useSocketConnection.ts`, `packages/client/src/context/GameContext.tsx`.

### Security
- **Admin access:** адмін-API тепер вимагає **VPN IP whitelist + email whitelist + `user.isAdmin=true`** (з JWT). Доступ через `x-admin-key` прибрано. Файли: `packages/server/src/middleware/ipWhitelist.ts`, `packages/server/src/routes/admin.ts`, `packages/server/src/config.ts`, `.env*.example`.

## [2026-04-06] — 0.5.1: Google-only auth, locked themes toast, early room validation

### Changed
- **Release:** bump app/package versions to **0.5.1** (client/server/shared + client `version.json`).
- **Auth:** залишено лише Google Sign-In (Apple прибрано з UI та хуків). Файли: `packages/client/src/components/Auth/LoginModal.tsx`, `packages/client/src/hooks/useAuth.ts`, `packages/client/src/context/AuthContext.tsx`.
- **Themes:** для гостей преміум-теми видимі, але “locked”; клік показує тост **«Доступно лише після авторизації»**. Файли: `packages/client/src/components/Settings/AppSettingsModal.tsx`, `packages/client/src/constants.ts`.
- **Join flow:** перевірка існування кімнати відбувається на екрані вводу коду (до вводу імені) через `room:exists` Socket.IO ack. Файли: `packages/client/src/screens/MenuFlow.tsx`, `packages/client/src/hooks/useSocketConnection.ts`, `packages/server/src/handlers/socketHandlers.ts`, `packages/shared/src/events.ts`.

## [2026-04-06] — UI polish: WCAG contrast, unified theme palette, Imposter mode card, admin/profile readability

### Changed
- **Release:** bump app/package versions to **0.5.0** (client/server/shared + client `version.json`).
- **Client UI tokens:** додано семантичні токени `--ui-accent`, `--ui-accent-contrast`, `--ui-danger`, `--ui-success`, `--ui-warning` + `color-scheme` (theme-aware). Файл: `packages/client/src/context/GameContext.tsx`.
- **Global base:** `body` тепер використовує `--ui-bg`/`--ui-fg` як дефолтний фон/текст (менше “невидимих” елементів через спадкування). Файл: `packages/client/src/styles.css`.
- **Base components:** `Button` primary тепер theme-aware через `--ui-accent`; тости/модалки/фолбеки приведено до `--ui-*`. Файли: `packages/client/src/components/Button.tsx`, `packages/client/src/components/Shared.tsx`.
- **Screens:** вирівняно контраст і поверхні в `MenuFlow`, `LobbyFlow`, `ScoreboardScreen`, `PreRoundScreen`, `RoundSummaryScreen`, `GameOverScreen`. Файли: `packages/client/src/screens/MenuFlow.tsx`, `packages/client/src/screens/LobbyFlow.tsx`, `packages/client/src/screens/GameFlow/screens/*`.
- **Imposter mode:** пастельно-rose картка імпостера стилізована як нейтральний “role reveal”, не як error; dark/light стани узгоджені. Файл: `packages/client/src/screens/GameFlow/screens/ImposterScreen.tsx`.
- **Admin + Profile:** `AdminPanel` зроблено theme-aware (cards/inputs/tabs) з читабельними статусами; `ProfileModal` прибрано жорсткі hex і прив’язано бейджі/акценти до `--ui-accent`. Файли: `packages/client/src/screens/AdminPanel.tsx`, `packages/client/src/components/Auth/ProfileModal.tsx`.

## [2026-04-05] — Статистика гравця в БД, адмін live (Redis), захист адмінки через Prisma, сокет/JWT sync, PWA meta

### Added
- **Prisma / User:** поля агрегованої статистики `statsGamesPlayed`, `statsWordsGuessed`, `statsWordsSkipped`, `statsLastPlayedAt`; міграція `20260405120000_user_player_stats`.
- **Auth API:** `POST /api/auth/player-stats/delta` (атомарні інкременти), `POST /api/auth/player-stats/merge-local` (імпорт легасі з localStorage); у відповіді `GET /api/auth/me` додано `playerStats`; при Google-логіні з `deviceId` — мердж **статистики** з анонімного користувача на цільовий (разом з покупками/колодами).
- **Утиліта сервера:** `packages/server/src/utils/playerStats.ts` — `parseNonNegInt`, `maxDate`.
- **Admin API:** `GET /api/admin/live` — з Redis: кількість ключів кімнат (`alias:room:*` без `alias:room:writer:*`) та прив’язок сокетів (`alias:socket:*`); у відповіді `asOf`, `redisConnected`.
- **RedisRoomStore:** `getLiveStats()`; префікс ключів сокетів `SOCKET_KEY_PREFIX`.
- **Клієнт:** `postPlayerStatsDelta`, `mergeLocalPlayerStats`, `PlayerStatsPayload` у `api.ts`; переписаний `usePlayerStats` (pending + flush на сервер, debounce, міграція `alias_player_stats_v1` → сервер, `syncPlayerStatsFromProfile`, `flushPlayerStats`); `useAuth` викликає гідратацію/міграцію після профілю.
- **UI (статистика та логін):** компактна статистика та «Детальна статистика» в `ProfileModal`; `PlayerStatsScreen` з перекладами, банером для гостя + `LoginModal`; оновлені тексти `LoginModal` і ключі в `TRANSLATIONS` (UA/DE/EN); `index.html` / `admin.html` — meta `mobile-web-app-capable`.
- **AdminPanel:** блок Live (Redis), опитування `GET /api/admin/live` кожні 15 с на вкладці «Статистика».

### Changed
- **adminAuth:** доступ за JWT лише після перевірки **`user.isAdmin` у БД** (Prisma); заголовок `x-admin-key` як і раніше для CLI (якщо заданий `ADMIN_API_KEY`).
- **useSocketConnection:** перед `connect` / `room:create` / `room:join` синхронізація `socket.auth` з поточним JWT і при потребі reconnect, щоб після Google-логіну handshake не йшов зі старим токеном.

### Fixed
- Перша спроба створити лобі після входу через Google могла розходитись з актуальним JWT на Socket.IO handshake.

### Docs
- Оновлено `README.md`, `CODE_REFERENCE.md` (ендпоінти, User, адмін, хуки).

---

## [2026-03-31] — Режими гри (GameMode), GameTask, патерн Стратегія на сервері та модульний UI гри

### Added
- **@alias/shared**: enum `GameMode` (`CLASSIC`, `TRANSLATION`, `SYNONYMS`, `QUIZ`); інтерфейс `GameTask` (`id`, `prompt`, `answer?`, `options?`); у `GameSettings` — `gameMode?`, `targetLanguage?`; дія `GUESS_OPTION` з `data.selectedOption`; у `RoundStats.words` — `taskId?`, результат `guessed`; у `GameSyncState` — `currentTask` (поряд із `currentWord` для сумісності).
- **@alias/server**: каталог `src/modes/` — `IGameModeHandler`, `ClassicModeHandler`, `TranslationModeHandler` (формат `Слово|Переклад`), `QuizModeHandler` (4 варіанти, перший коректний відповідь через `room.currentTaskAnswered`), `ModeFactory.getHandler`; `GameEngine` делегує `generateTask` / `handleAction`; валідація `GUESS_OPTION` у `schemas.ts`; socket: `GUESS_OPTION` доступна всім гравцям, не лише пояснювачу.
- **@alias/client**: `PlayingScreen` як оболонка; `GameFlow/modes/ClassicUI` (`ClassicWordCard`, `ClassicActionFooter`), `QuizUI` (сітка 2×2); синхронізація `currentTask` з сервера; офлайн `buildOfflineTask` + `sendGuessOption`; хук `useHapticFeedback`, розширення `HAPTIC` (`quizCorrect`, `quizWrong`); легка вібрація на базовій `Button`; модальне вікно QR у лобі (більше біле поле для сканування); семантичні `--ui-*` у елементах таймера/гри замість жорсткого `text-white` на екрані гри.

### Changed
- Документація: `README.md` (новий підрозділ про GameMode/GameTask/Стратегія, оновлені таблиці дій і `GameSyncState`, структура репо, Quick Reference, примітки для розробників); `CODE_REFERENCE.md` (детальний довідник по `modes/`, оновлені `shared`/`GameEngine`/`Room`/`schemas`/`GameContext`/клієнтські модулі); цей запис у `CHANGELOG.md`.
- **Лобі — налаштування:** вибір **режиму гри** (`CLASSIC` / `TRANSLATION` / `SYNONYMS` / `QUIZ`) з короткими підказками; для перекладу — додатковий вибір **мови відповіді** (`targetLanguage`). У лобі для гостей показується чіп поточного режиму. Файли: `LobbyFlow.tsx`, `constants.ts` (UA/DE/EN).

### Refactored
- Ігровий рушій: замість монолітної логіки CORRECT/SKIP у `GameEngine` — плагінні хендлери за режимом, щоб додавати режими без роздування ядра.

---

## [2026-03-30] — Guesser Live Feedback, Lobby UX, дедуплікація словника

### Added
- **Guesser Feedback** (ONLINE): гравці-відгадувачі тепер бачать великий лічильник вгаданих слів за раунд + останнє вгадане слово з flash-анімацією. До першого вдалого відгадування — підказка «Слухайте пояснення!».
- Які файли змінено: `packages/client/src/screens/GameFlow.tsx`, `packages/client/src/constants.ts`.
- Чому: раніше відгадувачі бачили лише порожній екран «Ви вгадуєте» без зворотного зв'язку.

---

## [2026-03-30] — Lobby UX: індикатор онлайн/офлайн, дедуплікація словника

### Changed
- Індикатор онлайн/офлайн тепер відображається для **всіх** гравців (а не лише для поточного), збільшений (`w-3.5 h-3.5` + glow-тінь).
- Кнопка кіка (admin) переміщена **ліворуч** від індикатора для кращої ергономіки.
- Які файли змінено: `packages/client/src/screens/LobbyFlow.tsx`.
- Чому: UX — хост повинен бачити статус кожного гравця, а кнопка кіка має бути поруч.

### Fixed
- Видалено **13 дублікатів** із `MOCK_WORDS[UA][GENERAL]` (Серце, Книга, Карта, Блискавка, Місяць, Пошта, Аптека, Лікарня, Школа, Парк, Озеро, Гора, Екран, Олівець → замінено на Пульс, Блокнот, Атлас, Нитка, Доба, Бухгалтер, Зоопарк, Супермаркет, Гімназія, Алея, Ставок, Яр, Флешка, Скотч).
- Результат: **520 унікальних** слів. Тепер усі 520 будуть показані перед першим повтором циклу.
- Які файли змінено: `packages/shared/src/constants.ts`.

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

---

## [2026-03-30] — Build/Deploy: Tailwind без CDN, PWA cache, docker edge

### Fixed
- **Tailwind v4 без CDN**: `styles.css` переведено на v4 синтаксис (`@import "tailwindcss";` + `@config`), щоб утиліти генерувались у build (і UI не був “голим”).
- Які файли змінено: `packages/client/src/styles.css`.

### Changed
- **API base URL**: за замовчуванням клієнт використовує same-origin (`window.location.origin`), а `VITE_SERVER_URL` лишається лише як явний override (менше CORS/`www`-mismatch сюрпризів у проді).
- Які файли змінено: `packages/client/src/services/api.ts`, `docker-compose.npm.yml`.

### Changed
- **Edge nginx (NPM stack)**: додано Docker DNS resolver для upstream’ів та вимкнено агресивний кеш для `sw.js` і `manifest.json`, щоб клієнти не застрягали на старому Service Worker (симптом “немає CSS”).
- Які файли змінено: `nginx/npm-edge.conf`.

### Added
- **Auto-migrate on boot** для NPM/docker стеку: `prisma migrate deploy` запускається перед стартом `app` (ідемпотентно).
- Які файли змінено: `docker-compose.npm.yml`.

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
- Розширено `MOCK_WORDS[UA][GENERAL]` до **~520+** слів; у README зафіксовано розмір fallback і поведінку **без повторів слова в межах одного циклу колоди** (`usedWords`, `WordService.nextWord`).
- Які файли змінено: `packages/shared/src/constants.ts`, `README.md`.
- Чому: вимога ≥500 слів для українського загального пулу без БД; прозора документація ротації.

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

### Fixed
- Prisma/DB drift: додано міграцію, яка додає відсутні в проді колонки (`WordPack.isDefault`, `User.isAdmin`) для відповідності `schema.prisma`.
- Які файли змінено: `packages/server/prisma/migrations/20260330160000_align_schema_defaults/migration.sql`.
- Чому: без цього Prisma може падати з `P2022` і проксі повертає 502 на ігрових/магазинних ендпойнтах.

## [2026-03-29] — VPS: NPM compose у репо, dockerignore, Actions

### Added
- [`docker-compose.npm.yml`](./docker-compose.npm.yml) — стек за Nginx Proxy Manager (gateway на localhost:9080).
- [`nginx/npm-edge.conf`](./nginx/npm-edge.conf) — HTTP edge: `/api`, `/socket.io`, SPA.

### Fixed
- [`docker-compose.npm.yml`](./docker-compose.npm.yml): `gateway` завжди підключається до зовнішньої мережі **`proxy`** через `networks.proxy.name: proxy`, щоб NPM резолвив `gateway` (інакше після деплою буде `502 Bad Gateway`).
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
- Регістр шляху на Linux: дефолт **`~/apps/ALIAS`**; обрізання завершального `/` у `VPS_DEPLOY_PATH`.

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
