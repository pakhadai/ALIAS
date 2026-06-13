# Звіт: ребрендинг ALIAS → MOVLI

**Дата:** 2026-06-13  
**Scope:** монорепозиторій `movli-master-monorepo` (колишній `alias-master-monorepo`)

---

## Підсумок

| Категорія | Було | Стало |
|-----------|------|-------|
| Назва продукту (UI) | ALIAS / Alias Master | **MOVLI / MOVLI Master** |
| npm scope | `@alias/client`, `@alias/server`, `@alias/shared`, `@alias/e2e` | `@movli/*` |
| Кореневий package.json | `alias-master-monorepo` | `movli-master-monorepo` |
| Redis ключі | `alias:room:`, `alias:socket:`, `alias:imposter:`, `alias:rpc:to:` | `movli:*` |
| localStorage | `alias_auth_token`, `alias_player`, … | `movli_*` |
| Postgres (docker/CI) | user/db `alias`, password `alias_dev` | `movli` / `movli_dev` |
| Деплой VPS (default) | `$HOME/apps/ALIAS` | `$HOME/apps/MOVLI` |
| Компонент логотипу | `AliasLogoMark.tsx` | `MovliLogoMark.tsx` |
| Cursor steward | `alias-steward`, `alias-master` skill | `movli-steward`, `movli-master` |

**Оновлено файлів:** ~152 (2 проходи скриптів + ручні правки).  
**Перевірка:** `pnpm typecheck` ✅, `Logo.test.tsx` ✅.

---

## Що змінено (детально)

### UI та копірайт
- `packages/client/index.html`, `admin.html`, `public/offline.html` — title / PWA meta
- `packages/client/src/components/Shared.tsx`, `LoginModal.tsx`, `AdminApp.tsx`
- `packages/client/src/constants/translations.ts` (UA/DE/EN) — impressum, invite text, game mode hints
- `packages/client/src/screens/GameFlow/screens/GameOverScreen.tsx` — canvas watermark, share filename
- `packages/client/src/sw.ts` — push notification title, cache `movli-fonts`
- `packages/server/src/bot/index.ts` — welcome message
- Stripe product names у `purchases.ts`

### Інфраструктура
- `docker-compose.yml`, `docker-compose.npm.yml`, `docker-compose.prod.yml`
- `.github/workflows/ci.yml`, `deploy-vps.yml`
- `.env.prod.example` — `movli.yourdomain.com`, Postgres credentials
- `nginx/nginx.conf`, Dockerfiles (`@movli/*` filters)
- `packages/server/src/config.ts` — VAPID email `admin@movlimaster.app`

### Код / контракти
- Усі імпорти `@alias/shared` → `@movli/shared` (і решта пакетів)
- `RedisRoomStore.ts`, `RoomActionRelay.ts`, `api.ts` (`movli:auth-changed`)
- `metadata.json`, `AGENTS.md`, `README.md`, `PROJECT_STATE.md`, docs/*

### Перейменовані файли / каталоги
| Було | Стало |
|------|-------|
| `packages/client/src/components/AliasLogoMark.tsx` | `MovliLogoMark.tsx` |
| `.cursor/agents/alias-steward.md` | `movli-steward.md` |
| `.cursor/skills/alias-master/` | `movli-master/` |
| `.cursor/rules/alias-project.mdc` | `movli-project.mdc` |

### Скрипти
- `scripts/rebrand-alias-to-movli.mjs` — основний прохід (131 файл)
- `scripts/_rebrand-pass2.mjs` — localStorage, docker, env (21 файл)

---

## Свідомо НЕ змінювалось

| Що | Чому |
|----|------|
| **Шлях до теки на диску** `C:\...\ALIAS\` | Фізична назва workspace; перейменуйте вручну + оновіть `.claude/settings.local.json` |
| `.cursor/ecc-install-state.json` | Абсолютні шляхи ECC install; оновиться при переінсталяції ECC |
| `session-aliases.js` / `.d.ts` | «Alias» = ім’я сесії в CLI, не бренд продукту |
| Vite/Vitest `resolve.alias: { … }` | Технічний path alias, не бренд |
| `LEGACY_LANGUAGE_ALIAS` у install-manifests | Програмний термін |
| **CHANGELOG історичні записи** | Архів релізів (згадки ALIAS у старих датах) |
| README «гра у стилі Alias (Taboo)» | Опис жанру настільної гри; продукт названо MOVLI Master |
| `pnpm-lock.yaml` | Потребує `pnpm install` після злиття (оновить `@movli/*` links) |
| `dist/`, `coverage/`, `.turbo/` | Артефакти збірки — перегенеруються |

---

## Breaking changes (увага при деплої)

1. **Redis:** нові ключі `movli:*` — старі `alias:*` не читаються. Після деплою активні кімнати в Redis будуть «порожніми» (очікувано).
2. **localStorage:** користувачі втратять збережений токен/сесію в браузері (потрібен повторний login).
3. **Postgres:** якщо на VPS уже є БД `alias` / user `alias`, або мігруйте, або оновіть `.env.prod` під існуючі credentials.
4. **VPS path:** за замовчуванням клон у `~/apps/MOVLI`; secret `VPS_DEPLOY_PATH` має збігатися з реальною текою (регістр на Linux!).
5. **GitHub repo URL** у translations: `github.com/pakhadai/MOVLI` — переконайтесь, що remote існує.
6. **Telegram bot** `@movli_bot` у тестах — production bot username задається в env, не в коді.

---

## Рекомендовані наступні кроки

```bash
pnpm install          # оновити lockfile під @movli/*
pnpm verify           # typecheck + lint
pnpm --filter @movli/client test
pnpm --filter @movli/server test
```

- Перейменувати кореневу теку `ALIAS` → `MOVLI` (опційно).
- Оновити LOGO.svg якщо wordmark ще малює «ALIAS» (SVG paths — окремий дизайн-таск).
- На VPS: `git pull`, новий шлях або `VPS_DEPLOY_PATH`, `docker compose -p movli …`.

---

## Пошук залишків

```bash
# Бренд / scope (має бути 0 у src)
rg "ALIAS|@alias/|Alias Master|alias_" packages --glob "!**/node_modules/**" --glob "!**/dist/**"

# Технічні alias (OK)
rg "resolve\.alias|session-aliases" packages
```
