# AGENT BRIEF — Alias Master

> Цей файл — живий контекст для AI агента. Оновлюється після кожної сесії.
> НЕ замінює README.md — доповнює його оперативним контекстом.

## TL;DR проєкту

Alias Master = онлайн multiplayer гра (Taboo/Alias) + Telegram Mini App.
Монорепо: `@alias/shared` (типи) | `@alias/server` (Express+Socket.IO+Prisma+Redis) | `@alias/client` (React 19 PWA) | `@alias/e2e` (Playwright).
Сервер авторитетний. Клієнт — thin display. Full state sync через `game:state-sync`.

## Поточний стан розробки

**Статус:** ACTIVE (session 4 complete — audit closed, bundle unchanged)  
**Останній аудит:** 2026-06-07  
**Відкритих issues:** 0 (LOW items A-1, B-1, C-2, D-5, F-1 closed session 4)

## Критичні файли — знай напам'ять

| Файл | Навіщо |
|------|--------|
| `packages/shared/src/events.ts` | Socket.IO контракти — зміна тут = зміна скрізь |
| `packages/shared/src/models.ts` | GameTask, GameSettings, Player, Team |
| `packages/server/src/game/authorizeGameAction.ts` | Хто може яку action |
| `packages/server/src/services/GameEngine.ts` | Вся ігрова логіка |
| `packages/server/src/modes/explainerModeActions.ts` | CORRECT/SKIP для explainer modes |
| `packages/client/src/context/GameContext.tsx` | Весь клієнтський стейт |
| `packages/client/src/App.tsx` | GameRouter — routing за GameState |

## Відомі "мінні поля"

1. **GameSyncState** — змінювати лише разом у client і server, ніколи окремо
2. **IMPOSTER секрет** — зберігається в Redis окремо, НЕ в game:state-sync
3. **teamsLocked** — блокує self-switch гравців, але не перешкоджає HOST перетасуванню
4. **wordDeck in sync** — клієнт отримує shuffled deck але не показує гравцям (для офлайн режиму)
5. **Relay** — якщо ROOM_ACTION_RELAY=0, крос-нодова relay вимкнена, single-node only
6. **Prisma drift** — після змін schema.prisma завжди `pnpm --filter @alias/server db:migrate`
7. **shared build** — після змін у @alias/shared завжди `pnpm build:shared` перед тестами

## Архітектурні рішення (зафіксовані)

| Рішення | Причина | Альтернатива що ВІДХИЛЕНА |
|---------|---------|--------------------------|
| Server-authoritative | Anti-cheat | Client-side prediction |
| Full state sync | Простота | Delta diffs |
| State machine routing | Контроль переходів | React Router |
| Redis relay для кластера | Горизонтальне масштабування | Sticky sessions |
| JWT (не sessions) | Stateless, TMA-friendly | Cookie sessions |

## MCP сервери (Cursor)

Підключи або перевір підключення:
- **GitHub** — для PR, issues, code search
- **Supabase/PostgreSQL** — якщо потрібен прямий DB access (через local Prisma)
- **Stripe** — для перевірки webhooks та product catalog
- **Sentry** — для моніторингу errors в prod

## Команди що використовуються найчастіше

```bash
pnpm dev                                    # запуск dev середовища
pnpm typecheck                              # перевірка типів (0 помилок = норма)
pnpm lint                                   # ESLint
pnpm test:server                            # unit тести сервера
pnpm --filter @alias/client test            # unit тести клієнта
pnpm --filter @alias/server db:migrate      # нова міграція Prisma
pnpm --filter @alias/server db:seed         # seed БД
pnpm build                                  # production build через Turbo
pnpm --filter @alias/e2e run test -- --grep "@smoke"  # smoke E2E
```

## Відкриті питання / ToDo для мене (власника)

- [ ] Чи включати `noUncheckedIndexedAccess` одним PR чи поетапно?
