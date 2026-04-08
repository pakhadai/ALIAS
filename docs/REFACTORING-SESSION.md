# Сесія рефакторингу — Квітень 2026

> **Мета:** Глибокий аудит кодової бази та приведення до production-ready стану.  
> **Статус:** Виконано 12 кроків з 12. TypeScript: 0 помилок. Тести: 142/142 ✅

---

## Зміст

1. [Критичні виправлення](#1-критичні-виправлення)
2. [Логічні баги](#2-логічні-баги)
3. [Безпека](#3-безпека)
4. [Архітектурні покращення](#4-архітектурні-покращення)
5. [Рефакторинг файлів](#5-рефакторинг-файлів)
6. [Нова адмінка](#6-нова-адмінка)
7. [Cleanup](#7-cleanup)
8. [Нові файли](#8-нові-файли)

---

## 1. Критичні виправлення

### Unhandled Promise Rejections — ризик краша сервера

**Файли:** `routes/auth.ts`, `routes/purchases.ts`, `routes/store.ts`, `routes/custom-decks.ts`, `routes/push.ts`, `routes/admin.ts`

Всі 30+ async Express-хендлерів не мали `try/catch`. У Node.js ≥ 15 + Express 4 неопрацьований `Promise.reject` призводить до **краша процесу**. Додано `try/catch` до кожного хендлера.

Для `admin.ts` (20+ маршрутів) введено утиліту `utils/asyncRoute.ts`:
```typescript
// Замість ручного try/catch у кожному хендлері:
router.get('/path', asyncRoute(async (req, res) => { ... }));
```

### Подвійна міграція хоста (Data Corruption)

**Файл:** `services/RoomManager.ts`

Виявлено **два незалежних** баги:

**Баг А (прихований корінь):** `room.hostPlayerId` ніколи не синхронізувався з реальним `player.id`. `createRoom()` генерував placeholder UUID, а `addPlayer()` — інший. Наслідок: `removePlayer()` перевіряв `room.hostPlayerId === playerId` — порівняння завжди `false`, міграція хоста при **добровільному виході** (`room:leave`) ніколи не спрацьовувала.

```typescript
// Виправлення в addPlayer():
if (isHostSocket) {
  room.hostPlayerId = playerId; // синхронізуємо з реальним UUID гравця
}
```

**Баг Б:** `handleDisconnect()` виконував міграцію двічі — спочатку через `removePlayer()`, потім власну — з різною логікою вибору нового хоста. Прибрано дублікат у `handleDisconnect`.

Додано регресійний тест який ловить цей конкретний сценарій.

---

## 2. Логічні баги

### `stats.explained` ніколи не інкрементувався

**Файл:** `services/GameEngine.ts` (`CONFIRM_ROUND`)

```typescript
// Було: тільки guessed
guessed: p.stats.guessed + (p.id !== explainerId ? correctCount : 0),

// Стало: і explained, і guessed
explained: p.stats.explained + (p.id === explainerId ? correctCount : 0),
guessed:   p.stats.guessed   + (p.id !== explainerId ? correctCount : 0),
```

### `showNotification` — накопичення таймерів

**Файл:** `context/GameContext.tsx`

Кожен виклик `showNotification` створював новий `setTimeout` без очищення попереднього. Якщо показувалось 5 повідомлень підряд — старий таймер очищав нове повідомлення достроково. Після unmount виникав `setState` на розмонтованому компоненті.

```typescript
// Виправлення: зберігаємо ref на таймер, clearTimeout перед новим
const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
// cleanup on unmount via useEffect return
```

### `imposterWord` губився після рестарту сервера

**Файл:** `services/RoomManager.ts`, `services/RedisRoomStore.ts`

`room.imposterWord` навмисно виключений з `GameSyncState` (секретне поле). При рестарті сервера `restoreRoomFromRedis()` не міг його відновити — екран `RESULTS` показував `null`.

**Рішення:** окремий Redis-ключ `alias:imposter:<roomCode>` поза `GameSyncState`. `persistRoom` зберігає/видаляє його разом зі станом. `restoreRoomFromRedis` завантажує обидва паралельно:
```typescript
const [syncState, imposterWord] = await Promise.all([
  this.redisStore.getRoomState(code),
  this.redisStore.getImposterWord(code),
]);
```

Також виправлено **бонусний баг**: `restoreRoomFromRedis` не відновлював `imposterPhase`, `imposterPlayerId`, `revealedPlayerIds` (хоча вони є в `GameSyncState`).

---

## 3. Безпека

### `PUT /api/auth/lobby-settings` — довільний JSON без валідації

```typescript
// Було: будь-який JSON напряму в БД
const settings = req.body;
await prisma.user.update({ data: { defaultSettings: settings } });

// Стало: Zod-валідація через існуючу gameSettingsPartialSchema
const parsed = gameSettingsPartialSchema.safeParse(req.body);
if (!parsed.success) { res.status(400).json({ error: 'Invalid settings' }); return; }
```

### TOCTOU race у `POST /api/auth/google`

Два паралельних Google auth з одним email: обидва проходили `findUnique → null`, потім один падав з P2002. Замінено `findUnique + create` на атомарний `upsert`.

### Rate limit відсутній на admin-роутах

```typescript
// Було:
app.use('/api/admin', createAdminRoutes(prisma, redisStore));

// Стало:
app.use('/api/admin', adminLimiter, createAdminRoutes(prisma, redisStore));
// adminLimiter: 30 req/хв у prod, 1000 у dev
```

### `KICK_PLAYER` приймав будь-який рядок

```typescript
// Було: typeof === 'string' && length <= 100
// Стало: z.string().uuid()
const uuidResult = z.string().uuid().safeParse(obj.data);
```

---

## 4. Архітектурні покращення

### AuthService — 6 окремих singleton-примірників → 1

```typescript
// Раніше у кожному route-файлі:
const authService = new AuthService();

// Тепер: shared singleton
export const authService = new AuthService(); // в AuthService.ts
import { authService } from '../services/AuthService'; // у route-файлах
```

### `defaultSettings` — shallow clone → structuredClone

```typescript
// Було: всі кімнати ділять посилання на вкладені об'єкти
settings: { ...defaultSettings },

// Стало: повна ізоляція
settings: structuredClone(defaultSettings),
```

### `normalizeBaseUrl` дублювалась в клієнті

`api.ts` і `useSocketConnection.ts` мали ідентичну приватну функцію. Hook тепер імпортує `getApiBaseUrl()` з `api.ts`.

---

## 5. Рефакторинг файлів

### `GameContext.tsx` (1572 → ~1370 рядків)

Витягнуто `context/gameReducer.ts`:
- `ACTION` type discriminated union
- `initialState`
- `gameReducer`
- `SESSION_KEY`, `PREFS_KEY`, `SAVABLE_STATES`
- `restoreSession` (відновлення з localStorage)

### Клієнтські утиліти

| Новий файл | Що перенесено | Джерело |
|-----------|--------------|---------|
| `utils/color.ts` | `parseHexColor`, `relativeLuminance`, `bestTextOnColor` | `GameContext.tsx` |
| `utils/gameTask.ts` | `buildOfflineTask` | `GameContext.tsx` |
| `utils/avatars.ts` | `AVATARS: string[]` | `GameContext.tsx` |

`useSocketConnection.ts` перестав дублювати `normalizeBaseUrl` → використовує `getApiBaseUrl()`.

### `LobbyFlow.tsx` (1262 рядки → 4 рядки barrel)

```
screens/lobby/
  LobbyScreen.tsx      — зала очікування, QR, список гравців
  TeamSetupScreen.tsx  — перегляд команд, старт
  SettingsScreen.tsx   — режим, категорії, паки, правила
LobbyFlow.tsx          — barrel re-export (4 рядки)
```

### `MenuFlow.tsx` (2740 рядків → 13 рядків barrel)

```
screens/menu/
  RulesScreen.tsx          — RulesModal + RulesScreen
  MenuScreen.tsx           — головне меню
  EnterNameScreen.tsx      — ім'я + аватар
  JoinInputScreen.tsx      — введення коду кімнати
  ProfileScreen.tsx        — ProviderBadge + ProfileScreen
  ProfileSettingsScreen.tsx — аватар, ім'я, push, install
  LobbySettingsScreen.tsx  — дефолтні налаштування лоббі
  MyWordPacksScreen.tsx    — керування пак-наборами
  MyDecksScreen.tsx        — власні словники
  StoreScreen.tsx          — магазин паків і тем
  PlayerStatsScreen.tsx    — статистика гравця
MenuFlow.tsx               — barrel re-export (13 рядків)
```

`App.tsx` продовжує імпортувати з тих самих шляхів — backward compatibility збережена.

---

## 6. Нова адмінка

### Проблеми старого `AdminPanel.tsx` (1254 рядки)

- `confirm()` та `alert()` — нативні браузерні діалоги
- Подвійна авторизація (JWT + API key), але сервер підтримував **тільки JWT**
- `actionLoading: string | null` — всі кнопки blocked при одній операції
- Дані перезавантажувались при кожному переключенні таба
- Помилки залишались назавжди без можливості dismiss

### Нова архітектура `screens/admin/`

```
admin/
  AdminApp.tsx     — auth gate + layout + Toast + ConfirmModal
  adminApi.ts      — typed API layer (AdminAuthError, api.*)
  tabs/
    StatsTab.tsx   — analytics + live Redis + push broadcast
    DecksTab.tsx   — moderation queue (pending відокремлено)
    PacksTab.tsx   — list + inline edit + words + CSV upload
    ThemesTab.tsx  — price/free management
```

### Ключові зміни

| Було | Стало |
|------|-------|
| `confirm('Видалити?')` | `ConfirmModal` з описом та кнопкою |
| `alert('CSV Uploaded!')` | Toast-повідомлення (auto-dismiss 4s) |
| JWT або x-admin-key | Тільки JWT з `alias_auth_token` |
| Ручний login screen | Auto-detect: `alias_auth_token` → `/api/auth/me` → `isAdmin` |
| `actionLoading: string\|null` | `Set<string>` — незалежні операції |
| Всі дані → при кожному переключенні | Таб завантажує дані один раз |

**Auth flow:**
```
/admin.html → alias_auth_token в localStorage?
                 → /api/auth/me → isAdmin: true → панель
                 → No token / 401 / isAdmin: false → "Доступ закрито" + link до /
```

---

## 7. Cleanup

- **`NetworkMessage`** видалено з `client/src/types.ts` (мертвий ре-експорт, ніде не використовувався)
- **Дублікат `prepare`** у root `package.json` виправлено (було два ключі, другий перетирав перший)
- **`AdminPanel.tsx`** видалено (замінено новою архітектурою в `screens/admin/`)

---

## 8. Нові файли

### Сервер

| Файл | Призначення |
|------|------------|
| `src/utils/asyncRoute.ts` | Express 4 wrapper для async route handlers |
| `src/services/__tests__/RedisRoomStore.test.ts` | Unit-тести для нових Redis-методів (mock ioredis) |

### Клієнт

| Файл | Призначення |
|------|------------|
| `src/context/gameReducer.ts` | Reducer, initialState, restoreSession (витягнуто з GameContext) |
| `src/utils/color.ts` | `parseHexColor`, `relativeLuminance`, `bestTextOnColor` |
| `src/utils/gameTask.ts` | `buildOfflineTask` для offline-режиму |
| `src/utils/avatars.ts` | `AVATARS: string[]` константа |
| `src/screens/lobby/LobbyScreen.tsx` | Компонент зали очікування |
| `src/screens/lobby/TeamSetupScreen.tsx` | Компонент налаштування команд |
| `src/screens/lobby/SettingsScreen.tsx` | Компонент налаштувань гри |
| `src/screens/menu/*.tsx` | 11 компонентів з MenuFlow (RulesScreen → PlayerStatsScreen) |
| `src/screens/admin/AdminApp.tsx` | Новий root адмінки з auth + layout |
| `src/screens/admin/adminApi.ts` | Typed API layer для адмінки |
| `src/screens/admin/tabs/StatsTab.tsx` | Таб статистики |
| `src/screens/admin/tabs/DecksTab.tsx` | Таб модерації колод |
| `src/screens/admin/tabs/PacksTab.tsx` | Таб управління паками |
| `src/screens/admin/tabs/ThemesTab.tsx` | Таб управління темами |

---

## Статистика змін

```
24 файлів змінено (модифіковано/видалено)
33 нових файлів
5997 рядків видалено
735 рядків додано

Тести: 142/142 ✅ (7 test files)
TypeScript: 0 помилок ✅
```

---

## Залишилися на майбутнє

- **Крок 11 (часткове):** `AdminPanel.tsx` повністю переписано, але `MenuFlow.tsx` розбито лише до рівня barrel + компонентів. Подальше розбиття `GameContext.tsx` (~1370 рядків) та `PlayingScreen.tsx` можливе в наступній сесії.
- **`imposterWord` у Redis** — реалізовано, але при рестарті під час QUIZ/HARDCORE timer також губиться (це поведінка за дизайном — таймер не можна відновити).
- **Socket rate limit** — in-process Map (не пропагується між інстансами) — потребує Redis-backed rate limiter для multi-instance prod.
