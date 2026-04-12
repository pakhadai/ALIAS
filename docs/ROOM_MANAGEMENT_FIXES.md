# Room Management & Mobile State Sync Fixes (2026-04-07)

> Актуальна архітектура та протоколи — **[`README.md`](../README.md)**. Цей файл — **історичний журнал** конкретної сесії виправлень (не індекс модулів).

## Overview

This session focused on critical bug fixes in room management and mobile state synchronization. The issues were causing rooms to become unusable, players to get stuck on screens, and data inconsistencies in cluster deployments.

---

## 1. Headless Room Bug (БАГ 1.1)

### Problem
When a host clicked "Leave", the `removePlayer()` method only removed them from players/teams arrays but **did not transfer host rights**. Result: the room remained without an active host (`hostSocketId` and `hostPlayerId` still pointed to the disconnected player), making it impossible for anyone to start games or change settings.

### Solution
Modified `RoomManager.ts:removePlayer()` to properly transfer host rights:

```typescript
// Передача прав хоста, якщо кімната не порожня
if (wasHost) {
  const nextPlayer = room.players.find(p => p.isConnected) || room.players[0];
  if (nextPlayer) {
    room.hostPlayerId = nextPlayer.id;
    room.hostSocketId = this.getPlayerSocketId(room, nextPlayer.id) ?? '';
    this.applyHostFlags(room, nextPlayer.id);
  }
}
```

**File**: `packages/server/src/services/RoomManager.ts:removePlayer()`

---

## 2. Memory Leak (БАГ 1.2)

### Problem
When the last player left a room, the room was **not cleaned up**. It remained in Node.js memory and Redis for ~2 hours (until GC). This could be weaponized: attackers could create thousands of rooms and immediately leave, causing OOM (Out of Memory) crashes.

### Solution
Added cleanup check in `removePlayer()`:

```typescript
// Очищення, якщо кімната порожня
if (room.players.length === 0) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  this.rooms.delete(roomCode);
  this.clearWriterMismatchThrottle(roomCode);
  if (this.redisStore?.isConnected) {
    this.redisStore.deleteRoom(roomCode).catch(() => {});
  }
  return playerId;
}
```

**File**: `packages/server/src/services/RoomManager.ts:removePlayer()`

---

## 3. Premature Host Migration (БАГ 1.3)

### Problem
When a host's socket disconnected (due to network blip), `markSocketDisconnected()` **immediately reassigned host rights** to another player. If the original host reconnected within grace period (~3 seconds), they would find themselves no longer the host—a jarring UX failure.

### Solution
Removed host migration logic from `markSocketDisconnected()`. Now host migration only happens in `finalizeGraceRemoval()` after the grace period expires:

```typescript
// Before: immediate migration
if (wasHost) {
  const firstEntry = room.socketToPlayer.entries().next().value;
  if (firstEntry) {
    // Reassign immediately ❌
  }
}

// After: no migration, just mark socket as disconnected
room.hostSocketId = '';
```

**File**: `packages/server/src/services/RoomManager.ts:markSocketDisconnected()`

This keeps the room in a "host is offline but may reconnect" state, allowing quick rejoin without losing power.

---

## 4. Room Code Collisions in Cluster (БАГ 2.1)

### Problem
`generateRoomCode()` only checked local memory (`this.rooms.has(code)`) for uniqueness. In a clustered deployment (multiple server instances), Instance A and Instance B could independently generate the same 5-digit code, and the second instance would overwrite the first in Redis.

### Solution
Made `generateRoomCode()` async and added Redis uniqueness check:

```typescript
async generateRoomCode(): Promise<string> {
  let code: string;
  let exists = true;
  let attempts = 0;
  do {
    code = Math.floor(10000 + Math.random() * 90000).toString();
    const localExists = this.rooms.has(code);
    const redisExists = this.redisStore?.isConnected 
      ? await this.redisStore.roomExists(code) 
      : false;
    exists = localExists || redisExists;
    attempts++;
  } while (exists && attempts < 100);
  return code;
}
```

**Files**: 
- `packages/server/src/services/RoomManager.ts:generateRoomCode()` (now async)
- `packages/server/src/services/RoomManager.ts:createRoom()` (now async)
- `packages/server/src/handlers/socketHandlers.ts` (await createRoom)

---

## 5. Ghost Players (Multi-join Corruption)

### Problem
A player could join Room A, then join Room B without leaving Room A (due to UI lag or deep-link navigation). The player would then be a "phantom" in both rooms—invisible to room state but occupying a slot. Cleanup was impossible because `handleDisconnect()` only removed them from one room.

### Solution
Added multi-join protection in socket handlers:

```typescript
onSocket(socket, 'room:create', async (rawData) => {
  // Захист від подвійного входу
  if (socket.data.roomCode) {
    socket.emit('room:error', roomError('ALREADY_IN_ROOM', 'Спочатку вийдіть з поточної кімнати'));
    return;
  }
  // ... proceed with creation
});

onSocket(socket, 'room:join', async (rawData) => {
  // Same check before joining
  if (socket.data.roomCode) {
    socket.emit('room:error', roomError('ALREADY_IN_ROOM', 'Спочатку вийдіть з поточної кімнати'));
    return;
  }
  // ... proceed with join
});
```

**File**: `packages/server/src/handlers/socketHandlers.ts`

---

## 6. Dead Host Assignment

### Problem
During host migration (in both `removePlayer()` and `finalizeGraceRemoval()`), the code would assign host rights to `room.players[0]`—without checking if that player was online. If players[0] had recently disconnected (waiting for grace period to expire), the new host would be offline, leaving the room paralyzed.

### Solution
Prioritize online players:

```typescript
// Шукаємо першого, хто онлайн. Якщо всі офлайн — беремо будь-кого.
const nextPlayer = room.players.find(p => p.isConnected) || room.players[0];
if (nextPlayer) {
  room.hostPlayerId = nextPlayer.id;
  room.hostSocketId = this.getPlayerSocketId(room, nextPlayer.id) ?? '';
  this.applyHostFlags(room, nextPlayer.id);
}
```

**Files**: 
- `packages/server/src/services/RoomManager.ts:removePlayer()`
- `packages/server/src/services/RoomManager.ts:finalizeGraceRemoval()`

---

## 7. Race Condition on Mobile Join (БАГ 3.x)

### Problem
**Race condition between React state updates and Socket.IO events:**

1. User clicks "Next" on name screen → `handleJoin()` connects to server
2. React queues state update: `setGameState(GameState.LOBBY)`
3. Before React renders, server sends `game:state-sync` event
4. `onStateSync()` checks `stateRef.current.gameState` → still `ENTER_NAME` (React hasn't rendered yet)
5. Navigation protection activates: `keepClientNav = true`
6. Dispatch: `gameState: currentClientState` (ENTER_NAME)
7. **Result**: User is connected but visually stuck on name screen

On slow networks (mobile), the timing mismatch was severe.

### Solution
Build payload conditionally, omitting `gameState` when navigation should be preserved:

```typescript
const payload: Partial<AppState> = {
  settings,
  roomCode: syncState.roomCode,
  players: syncState.players,
  // ... all other fields
};

// Змінюємо екран ТІЛЬКИ якщо нам не треба зберігати поточну навігацію клієнта
if (!keepClientNav) {
  payload.gameState = syncState.gameState;
}

dispatch({
  type: 'SET_STATE',
  payload,
});
```

**Result**: React merges `payload` (without `gameState`) into state. Since `gameState` is absent from the payload, Redux-like state management preserves the client-side transition (LOBBY), allowing server data (players, settings, etc.) to merge without overwriting UI navigation.

**File**: `packages/client/src/context/GameContext.tsx:onStateSync()`

---

## 8. New Error Code

Added `ALREADY_IN_ROOM` to shared error codes for clear user feedback:

**File**: `packages/shared/src/events.ts`

```typescript
export const ROOM_ERROR_CODES = [
  // ... other codes
  'ALREADY_IN_ROOM',  // ← New
] as const;
```

---

## Testing & Validation

✅ **TypeScript**: All packages compile without errors
✅ **Tests**: 135/135 server tests pass
✅ **Formatting**: Prettier `format:check` passes
✅ **Linting**: ESLint passes (136 warnings, 0 errors)

---

## Deployment Commits

| Hash | Message |
|------|---------|
| `ae34979` | Fix room management bugs: host migration, memory leaks, ghost players, and room code collisions |
| `5dbaab6` | Add ALREADY_IN_ROOM error code to ROOM_ERROR_CODES |
| `eade68b` | Fix deployment issues: TypeScript errors and code formatting |
| `b29a500` | Fix race condition in onStateSync when joining rooms on mobile |

---

## Files Modified

### Server
- `packages/server/src/services/RoomManager.ts` — Core fixes (host migration, cleanup, async code generation, online prioritization)
- `packages/server/src/handlers/socketHandlers.ts` — Multi-join protection, async createRoom
- `packages/server/src/services/__tests__/RoomManager.test.ts` — Updated async tests

### Client
- `packages/client/src/context/GameContext.tsx` — Race condition fix in `onStateSync()`

### Shared
- `packages/shared/src/events.ts` — Added `ALREADY_IN_ROOM` error code

---

## Impact

- **Stability**: Rooms no longer become headless, leak memory, or trap users in loading screens on mobile
- **Reliability**: Host rights correctly transfer; rooms properly clean up
- **Scalability**: Room codes now unique across cluster deployments
- **UX**: No more ghost players; clear error messages for invalid operations
- **Mobile**: Users on slow networks can successfully join rooms without getting stuck

This session eliminated 7+ critical bugs that were severely impacting gameplay on mobile and cluster deployments.
