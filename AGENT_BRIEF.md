# AGENT BRIEF — MOVLI Master

> Цей файл — живий контекст для AI агента. Оновлюється після кожної сесії.
> НЕ замінює README.md — доповнює його оперативним контекстом.

## TL;DR проєкту

MOVLI Master = онлайн multiplayer гра (Taboo/Alias) + Telegram Mini App.
Монорепо: `@movli/shared` (типи) | `@movli/server` (Express+Socket.IO+Prisma+Redis) | `@movli/client` (React 19 PWA) | `@movli/e2e` (Playwright).
Сервер авторитетний. Клієнт — thin display. Full state sync через `game:state-sync`.

## Поточний стан розробки

**Bundle (C-1):** lazy routes — `main` **305.5 KB** / **93.83 KB gzip** (baseline was 500 KB). Chunks: `GameFlow` 50 KB, `LobbyScreen` 59 KB, `SettingsScreen` 47 KB, `StoreScreen` 14 KB, `RulesScreen` 1 KB.

**Статус:** ACTIVE (test-gap Phases 1–8 ✅, commit `db1ecf5`)  
**Останній аудит:** 2026-06-07 — Block G (G-1…G-8) ✅, деталі в `AUDIT_RESULTS.md`  
**Відкритих issues:** 0

**Test baseline (2026-06-10):**

| Пакет | Тести | Примітка |
|-------|-------|----------|
| `@movli/server` | **341** | unit + integration |
| `@movli/client` | **376** | incl. TMA desktop layout + Liquid Glass tests (66 files) |
| `@movli/shared` | **12** | `utils.test.ts` |

**Coverage floor** (`packages/server/vitest.config.ts`, measured after Phases 1–7): **67%** stmts/lines, **71%** branches, **89%** functions. Core modules: GameEngine ~92%, RoomManager ~89%.

**Verify:** `pnpm verify` green (typecheck, lint, format, server coverage, client + shared tests).

**E2E:** `packages/e2e/tests/smoke-round.spec.ts` (`@smoke`), `core-acceptance.spec.ts` (`@core`); helpers у `helpers/game-ui.ts`. Локально потрібен Postgres (`docker compose up -d postgres`); CI — chromium + mobile-chrome.

## Post test-gap backlog (optional, не блокери)

| Область | Зараз | Наступний крок |
|---------|-------|----------------|
| `routes/` (auth, admin, purchases) | ~18–40% coverage | integration-тести при зміні API |
| `handlers/socketHandlers.ts` | ~48% | relay / multi-node сценарії |
| client | 44 тести | розширювати лише з новими фічаx |
| D-4 deferred | `useSocketConnection`, `GameContext` deep-link rejoin, auth bootstrap | рефактор за потреби |
| C-1 bundle | main 305 KB gzip OK | діяти лише якщо знову росте main/styles |

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
6. **Prisma drift** — після змін schema.prisma завжди `pnpm --filter @movli/server db:migrate`
7. **shared build** — після змін у @movli/shared завжди `pnpm build:shared` перед тестами
8. **TMA desktop vs mobile** — layout overrides через `html[data-telegram-desktop]`, не media queries; mobile floor **104px** і gutter **80px** не зменшувати; canon `docs/TMA_LAYOUT.md#desktop-tma`

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
pnpm verify                                 # typecheck + lint + format + coverage + tests
pnpm typecheck                              # перевірка типів (0 помилок = норма)
pnpm lint                                   # ESLint
pnpm test:server                            # unit тести сервера
pnpm --filter @movli/server test:coverage   # server tests + coverage thresholds
pnpm --filter @movli/client test            # unit тести клієнта (44)
pnpm --filter @movli/shared test            # shared utils (12)
pnpm --filter @movli/server db:migrate      # нова міграція Prisma
pnpm --filter @movli/server db:seed         # seed БД
pnpm build                                  # production build через Turbo
pnpm test:e2e                               # Playwright (@smoke / @core у CI)
pnpm --filter @movli/e2e run test -- --grep "@smoke"  # smoke E2E only
```

## Відкриті питання / ToDo для мене (власника)

- [ ] Чи включати `noUncheckedIndexedAccess` одним PR чи поетапно?
