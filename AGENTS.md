# MOVLI Master — інструкції для агентів

Монорепозиторій **`movli-master-monorepo`**: онлайн Alias (Taboo), PWA, Socket.IO, Prisma/PostgreSQL, Redis.

> **ECC (загальні агенти, skills, hooks):** [`.cursor/AGENTS.md`](./.cursor/AGENTS.md) — не дублюй їх тут. Цей файл — **проєктний шар** поверх ECC.

## Канон документації

| Питання | Файл |
|---------|------|
| Архітектура, протоколи, гра | [`README.md`](./README.md) |
| Версії, CI, пакети, Prisma-знімок | [`PROJECT_STATE.md`](./PROJECT_STATE.md) |
| Карта docs + steward | [`docs/INDEX.md`](./docs/INDEX.md) |
| Як працювати (людина + ШІ) | [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) |
| TL;DR для AI-сесії | [`AGENT_BRIEF.md`](./AGENT_BRIEF.md) |
| Відкриті audit issues | [`AUDIT_RESULTS.md`](./AUDIT_RESULTS.md) |
| Щоденник | [`docs/daily/`](./docs/daily/) |
| Релізи | [`CHANGELOG.md`](./CHANGELOG.md) |

## Стек (коротко)

- **pnpm 9** workspaces + **Turbo**; пакети: `@movli/shared`, `@movli/server`, `@movli/client`, `@movli/e2e`
- **Node** **>=20** (`engines`, CI, Dockerfile)
- Контракти: **`packages/shared`** — єдине джерело типів і Socket.IO подій
- Сервер: Express + Socket.IO + Prisma; клієнт: React 19 + Vite 7 PWA

## Заборони

- Не рефакторити «про всяк випадок»; мінімальний diff.
- Не змінювати `GameSyncState` / події без оновлення shared + server + client.
- Не комітити / не пушити без **явного** запиту користувача.
- Не комітити `.env.prod`, ключі API, токени.
- Не відновлювати `CODE_REFERENCE.md`.
- Не копіювати вміст ECC skills у проєктні markdown.

## Інваріанти гри

- **Авторитет сервера**; клієнт — thin client, full `game:state-sync`.
- **Іммутабельність** стану на клієнті (нові об’єкти, не мутація).
- Нові `GameAction` → Zod (`schemas.ts`), `authorizeGameAction`, `GameEngine` / `modes/*`.
- IMPOSTER: секрет лише через `imposter:secret`, не в публічному sync.

Детальні чеклісти — skill [`.cursor/skills/movli-master/SKILL.md`](./.cursor/skills/movli-master/SKILL.md).

## Project Steward: `movli-steward`

Спеціалізований subagent: **`.cursor/agents/movli-steward.md`**.

Виклик у промпті: `@movli-steward …`

**Перед нетривіальною зміною:** pre-flight (doc + вплив на `@movli/shared`, план ≤5 кроків).

**Після задачі:** `docs/daily/YYYY-MM-DD.md`, за потреби `CHANGELOG` `[Unreleased]`, `PROJECT_STATE` при зміні стеку.

## Оркестрація ECC

| Сценарій | Агент ECC |
|----------|-----------|
| Архітектура / великий рефакторинг | `architect` |
| Фіча / баг | `tdd-guide` + Vitest (`packages/server`, `packages/client`) |
| Код написано | `code-reviewer` |
| Auth, Stripe, env, API | `security-reviewer` |
| Масове оновлення markdown | `doc-updater` → **movli-steward** перевіряє канон |

## Перевірка перед завершенням

```bash
pnpm verify
# або мінімум: pnpm typecheck
```

E2E за потреби: `pnpm test:e2e`.

## Приклади промптів

**Pre-flight:**

```
@movli-steward Перевір pre-flight для задачі: [опиши]. Які doc/code торкнути? План у 5 кроків.
```

**Кінець сесії:**

```
@movli-steward Підсумуй сесію: допиши docs/daily/YYYY-MM-DD.md, CHANGELOG [Unreleased] якщо потрібно, sync PROJECT_STATE якщо змінився стек.
```

**Лише документація:**

```
@movli-steward Аудит doc↔code для [модуль]. Виправ мінімально README або docs/, без зміни коду.
```
