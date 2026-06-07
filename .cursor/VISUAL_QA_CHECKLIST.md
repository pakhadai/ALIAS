# Visual QA Checklist — Alias Master

Виконувати після кожної значної зміни UI або game flow.

## 🎮 PLAYER FLOW

### Веб (Desktop Chrome 1280px)
- [ ] MENU: логотип, кнопки Create/Join/Rules відображаються коректно
- [ ] ENTER_NAME: введення імені, вибір аватара, валідація
- [ ] JOIN_INPUT: введення коду, обробка неіснуючого коду
- [ ] LOBBY: список гравців, QR код, кнопка Start (лише для host)
- [ ] SETTINGS: вкладки Mode/Dictionary/Rules, всі optons
- [ ] TEAMS: drag&drop, lock, shuffle, правильна кількість команд
- [ ] VS_SCREEN: анімація, назви команд
- [ ] PRE_ROUND: хто пояснює, яка команда
- [ ] COUNTDOWN: 3-2-1 анімація
- [ ] PLAYING (Classic): картка слова, кнопки CORRECT/SKIP, таймер
- [ ] PLAYING (Quiz): 4 варіанти, вибір, feedback правильно/неправильно
- [ ] PLAYING (Hardcore): суворіший skip behavior
- [ ] PLAYING (Translation): підказка відображається
- [ ] PLAYING (Imposter): secret word для impostera, без слова для інших
- [ ] ROUND_SUMMARY: список слів з результатами, очки
- [ ] SCOREBOARD: правильний рахунок, порядок команд
- [ ] GAME_OVER: переможець, кнопки Play Again / Back to Menu
- [ ] Пауза: overlay, resume
- [ ] Reconnect: відновлення після закриття і повернення (60 сек)

### Мобільний (375px, iOS Safari)
- [ ] Всі вищеперераховані стани на мобільному
- [ ] Safe area дотримано (нотч, home indicator)
- [ ] Scroll не виходить за межі
- [ ] Tap targets достатнього розміру
- [ ] Keyboard не перекриває важливий контент

### Telegram Mini App (Telegram Desktop + Mobile)
- [ ] Expand відбувається автоматично
- [ ] Safe areas коректні
- [ ] Haptics спрацьовують (CORRECT/SKIP/GameOver)
- [ ] Telegram Stars: кнопка купівлі, invoice відкривається
- [ ] Auth через initData працює
- [ ] Telegram Desktop: зайвий padding відсутній

### Themes
- [ ] Midnight Ruby (default) — перевір contrast ratio
- [ ] Cyberpunk — читабельність
- [ ] Luminous Aero (світла) — всі елементи видимі
- [ ] Void Luxe — OLED black коректний
- [ ] Quantum Eclipse — неоновий акцент читається

## 👑 ADMIN FLOW

### /api/admin/* (через curl або admin UI)
- [ ] GET /api/admin/live — метрики активних кімнат
- [ ] GET /api/admin/packs — список паків
- [ ] POST /api/admin/packs — створення паку
- [ ] POST /api/admin/upload-csv — імпорт слів
- [ ] GET /api/admin/analytics — аналітика
- [ ] Авторизація: без ключа → 401/403
- [ ] Авторизація: з невірним ключем → 403
- [ ] Авторизація: з правильним ADMIN_API_KEY → 200

### Store & Purchases
- [ ] GET /api/store — каталог повертає правильні ownedBy прапорці
- [ ] POST /api/purchases/checkout — Stripe session створюється
- [ ] POST /api/purchases/webhook/stripe — signature перевіряється
- [ ] POST /api/purchases/claim — безкоштовний item
- [ ] GET /api/purchases/my — список покупок

### Custom Decks
- [ ] POST /api/custom-decks — створення
- [ ] POST /api/custom-decks/upload — CSV завантаження
- [ ] GET /api/custom-decks/access/:code — доступ за кодом (лише approved)
- [ ] DELETE /api/custom-decks/:id — видалення свого

## 🔌 CONNECTIVITY

- [ ] /health повертає { status: "ok", redis: true }
- [ ] WebSocket connect/disconnect graceful
- [ ] Redis недоступний → гра продовжує in-memory
- [ ] 2 вкладки одночасно → коректна синхронізація
- [ ] Disconnect mid-game → grace period 60 сек → rejoin

## 🚀 PERFORMANCE

- [ ] `pnpm build` — 0 помилок
- [ ] `pnpm typecheck` — 0 помилок  
- [ ] `pnpm lint` — 0 warnings
- [ ] Bundle size: перевір `vite-bundle-visualizer` — жоден chunk >500KB
- [ ] Lighthouse PWA score >90
- [ ] First paint <2 сек на 3G
