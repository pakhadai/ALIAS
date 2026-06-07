# Документація Alias Master — індекс

> Один факт — одне місце. Ця сторінка **навігує**; деталі — у зазначених файлах.

## Канон і знімок репо

| Файл | Коли читати | Що всередині |
|------|-------------|--------------|
| [`README.md`](../README.md) | Онбординг, архітектура, Socket.IO, REST, гра | Продукт, протоколи, `GameState` / `GameAction` |
| [`PROJECT_STATE.md`](../PROJECT_STATE.md) | Версії, CI, Prisma, скрипти | Факти з `package.json`, workflows, schema |
| [`CHANGELOG.md`](../CHANGELOG.md) | Релізи | Keep a Changelog |
| [`AUDIT_RESULTS.md`](../AUDIT_RESULTS.md) | Відкриті технічні issues | Security, code quality, docs drift |
| [`AGENT_BRIEF.md`](../AGENT_BRIEF.md) | Старт AI-сесії | TL;DR стан, мінні поля, команди |
| [`AGENTS.md`](../AGENTS.md) | Будь-яка задача з ШІ | Заборони, steward, ECC делегування |
| [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md) | Перед PR / сесією | `verify`, тести, який doc оновити |
| [`docs/daily/`](./daily/) | Щоденник сесій | Europe/Kyiv |

## Steward / harness (Cursor)

| Шлях | Призначення |
|------|-------------|
| [`.cursor/CURRENT_FOCUS.md`](../.cursor/CURRENT_FOCUS.md) | Поточний фокус сесії |
| [`.cursor/rules/00-identity.mdc`](../.cursor/rules/00-identity.mdc) … `06-tma.mdc` | Стандарти коду 2026 |
| [`.cursor/VISUAL_QA_CHECKLIST.md`](../.cursor/VISUAL_QA_CHECKLIST.md) | QA після UI/game змін |
| `.cursor/agents/alias-steward.md`, `.cursor/skills/alias-master/` | Project steward |
| [`.cursor/AGENTS.md`](../.cursor/AGENTS.md) | ECC (загальні агенти) — **не дублювати** в `docs/` |

## Тематичні `docs/`

| Файл | Коли читати |
|------|-------------|
| [`PRISMA_WORD_DATA.md`](./PRISMA_WORD_DATA.md) | Seed, JSON, `WordConcept` / `WordTranslation` |
| [`LOBBY_TEAM_BUILDER.md`](./LOBBY_TEAM_BUILDER.md) | Лобі, команди, Solo, `LobbyScreen` vs `TeamSetupScreen` |
| [`TESTING_ACCEPTANCE.md`](./TESTING_ACCEPTANCE.md) | Vitest / Playwright must-not-break |
| [`UI_TOKENS.md`](./UI_TOKENS.md) | `--ui-*`, Tailwind `*-ui-*`, safe-area, заборони кольорів |
| [`TMA_LAYOUT.md`](./TMA_LAYOUT.md) | `ScreenShell`, `FixedBottomBar`, safe-area audit |
| [`TELEGRAM_SKILL.md`](./TELEGRAM_SKILL.md) | Mini App, webhook, Stars, TMA UX |
| [`VIRAL_INVITES_PHASE7.md`](./VIRAL_INVITES_PHASE7.md) | Deep link `startapp=lobby_*` |
| [`PWA-ICONS.md`](./PWA-ICONS.md) | Іконки PWA / manifest |
| [`ROOM_MANAGEMENT_FIXES.md`](./ROOM_MANAGEMENT_FIXES.md) | **Історичний** журнал фіксів 2026-04-07 |
| [`VPS-INFRASTRUCTURE.md.example`](./VPS-INFRASTRUCTURE.md.example) | Шаблон локальних VPS-нотаток → `VPS-INFRASTRUCTURE.md` (gitignore) |

## Код — єдине джерело правди

| Тема | Файл |
|------|------|
| Socket.IO, `GameSyncState` | `packages/shared/src/events.ts` |
| Enums, models, actions | `packages/shared/src/enums.ts`, `models.ts`, `actions.ts` |
| Zod, routes | `packages/server/src/validation/schemas.ts`, `routes/*` |
| Game logic | `packages/server/src/services/GameEngine.ts`, `modes/*` |
| UI routing | `packages/client/src/App.tsx`, `context/GameContext.tsx` |

## Швидкий маршрут

| Задача | Спочатку |
|--------|----------|
| Нова Socket.IO подія | `events.ts` → README → handlers + client hook |
| Міграція БД | `schema.prisma` → `PRISMA_WORD_DATA.md` → `PROJECT_STATE` |
| Лобі / команди | `LOBBY_TEAM_BUILDER.md` |
| TMA / Stars | `TELEGRAM_SKILL.md` |
| TMA safe area / layout primitives | `TMA_LAYOUT.md` |
| UI-токени / теми в компонентах | `UI_TOKENS.md` |
| Деплoy / 502 | README Docker → `VPS-INFRASTRUCTURE.md.example` |
| Тести | `TESTING_ACCEPTANCE.md` + `pnpm verify` |
| Кінець сесії | `docs/daily/YYYY-MM-DD.md` + `CHANGELOG` `[Unreleased]` |
