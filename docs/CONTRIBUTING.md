# Участь у розробці Alias Master

> Люди та ШІ працюють за одними правилами. Канон продукту — [`README.md`](../README.md); карта файлів — [`INDEX.md`](./INDEX.md).

## Перед початком

1. Прочитай релевантний розділ [`README.md`](../README.md) або тематичний `docs/*.md` (див. [`INDEX.md`](./INDEX.md)).
2. Для нетривіальних змін — **pre-flight** через агента **alias-steward** (див. [`AGENTS.md`](../AGENTS.md)).
3. Локально: `pnpm install`, кореневий **`.env.prod`** з [`.env.prod.example`](../.env.prod.example) (не комітити секрети).

## Гілки та коміти

- Базова гілка для CI/deploy: **`main`**.
- Коміти — **лише за явним запитом** користувача (людина або промпт).
- Формат: `feat|fix|docs|refactor|test|chore: опис` (conventional commits, українською або англійською — як у команді).

## Скрипти `pnpm` (корінь)

| Команда | Призначення |
|---------|-------------|
| `pnpm dev` | Client + server паралельно |
| `pnpm build` | Turbo: shared → client + server |
| `pnpm typecheck` | Typecheck усіх пакетів |
| `pnpm verify` | `typecheck` + `lint` + `format:check` |
| `pnpm lint` / `pnpm format:check` | ESLint / Prettier |
| `pnpm test:server` | Vitest сервер |
| `pnpm --filter @alias/client test` | Vitest клієнт |
| `pnpm test:e2e` | Playwright (`@smoke` / `@core` у CI) |

**Сервер / Prisma** (`@alias/server`):

| Команда | Коли |
|---------|------|
| `pnpm --filter @alias/server db:migrate` | Локально: **`prisma migrate dev`** |
| `pnpm --filter @alias/server db:push` | Швидкий прототип схеми (обережно) |
| `pnpm --filter @alias/server db:seed` | Після міграцій / оновлення JSON даних |
| `prisma migrate deploy` | **Тільки** prod / Docker / VPS (не через `db:migrate`) |

Перед PR: **`pnpm verify`** і релевантні тести (див. [`TESTING_ACCEPTANCE.md`](./TESTING_ACCEPTANCE.md)).

## Що оновлювати в документації

| Зміна | Файл |
|-------|------|
| Протокол, правила гри, env, Docker | `README.md` (мінімально, без дубля `PROJECT_STATE`) |
| Версії пакетів, CI, новий скрипт, структура воркспейсів | `PROJECT_STATE.md` + дата в шапці |
| Seed / слова / Prisma data | `docs/PRISMA_WORD_DATA.md` |
| Лобі / команди | `docs/LOBBY_TEAM_BUILDER.md` |
| Критерії тестів | `docs/TESTING_ACCEPTANCE.md` |
| Релізна / значна зміна | `CHANGELOG.md` → `[Unreleased]` |
| Audit / технічний борг | `AUDIT_RESULTS.md` |
| Сьогоднішня сесія | `docs/daily/YYYY-MM-DD.md` |
| Новий тематичний doc | Додати рядок у `docs/INDEX.md` |

Не відновлювати `CODE_REFERENCE.md`. Не дублювати ECC skills у проєктних файлах — посилання на [`.cursor/AGENTS.md`](../.cursor/AGENTS.md).

## Контракти (`@alias/shared`)

Будь-яка зміна Socket.IO, `GameAction`, `GameMode`, `GameSyncState`:

1. Спочатку `packages/shared`.
2. `pnpm build:shared` (або повний `pnpm build`).
3. Сервер + клієнт + тести.

## Секрети

- Шаблон: **`.env.prod.example`**; робочий файл: **`.env.prod`** (у `.gitignore`).
- Ніколи не комітити ключі Stripe, JWT, Telegram, Sentry DSN.

## Робота з ШІ (Cursor)

| Роль | Де |
|------|-----|
| Проєкт | [`AGENTS.md`](../AGENTS.md), [`AGENT_BRIEF.md`](../AGENT_BRIEF.md), rules **`.cursor/rules/00-identity.mdc`** … **`06-tma.mdc`**, **`.cursor/rules/alias-project.mdc`**, skill **`alias-master`** |
| Steward (доки + узгодженість) | `.cursor/agents/alias-steward.md` — `@alias-steward` у промпті |
| Відкриті issues | [`AUDIT_RESULTS.md`](../AUDIT_RESULTS.md) |
| Загальні агенти (TDD, security, architect) | `.cursor/AGENTS.md` (ECC) |

**Делегування:** architect / tdd-guide / code-reviewer / security-reviewer — за сценарієм у `AGENTS.md`; фінальну узгодженість доків перевіряє **alias-steward**.

### Денний журнал (обов’язково після сесії з кодом/docs)

1. Дописати [`docs/daily/YYYY-MM-DD.md`](./daily/) (Europe/Kyiv, новий день — новий файл).
2. За потреби — `CHANGELOG.md` `[Unreleased]`.
3. Якщо змінився стек — `PROJECT_STATE.md`.

Шаблон і правила — [`docs/daily/README.md`](./daily/README.md).

### Нагадування після сесії (hook)

У [`.cursor/hooks.json`](../.cursor/hooks.json) на події **`sessionEnd`** підключено `node .cursor/hooks/daily-log-reminder.js`: якщо є незакомічені зміни в `packages/` або `docs/`, а файлу `docs/daily/<сьогодні>.md` немає — у лог виводиться нагадування (не блокує роботу).

## Перевірка посилань

Після правок doc: переконайся, що шляхи та імена подій існують (`grep` / читання файлу). Steward робить те саме на post-change.
