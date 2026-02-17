import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../RoomManager';
import { GameState, MAX_PLAYERS } from '@alias/shared';

let rm: RoomManager;

beforeEach(() => {
  rm = new RoomManager();
});

// ─── generateRoomCode ────────────────────────────────────────────────────────

describe('generateRoomCode', () => {
  it('returns a 5-digit string', () => {
    const code = rm.generateRoomCode();
    expect(code).toMatch(/^\d{5}$/);
  });

  it('generates codes in range 10000–99999', () => {
    for (let i = 0; i < 20; i++) {
      const n = parseInt(rm.generateRoomCode());
      expect(n).toBeGreaterThanOrEqual(10000);
      expect(n).toBeLessThanOrEqual(99999);
    }
  });
});

// ─── createRoom ─────────────────────────────────────────────────────────────

describe('createRoom', () => {
  it('creates a room with default settings', () => {
    const room = rm.createRoom('socket-1');
    expect(room.code).toMatch(/^\d{5}$/);
    expect(room.hostSocketId).toBe('socket-1');
    expect(room.gameState).toBe(GameState.LOBBY);
    expect(room.players).toHaveLength(0);
    expect(room.teams).toHaveLength(0);
    expect(room.settings).toBeDefined();
    expect(room.settings.roundTime).toBe(60);
  });

  it('stores room in internal map', () => {
    const room = rm.createRoom('socket-1');
    expect(rm.getRoom(room.code)).toBe(room);
  });

  it('two rooms get different codes', () => {
    const r1 = rm.createRoom('s1');
    const r2 = rm.createRoom('s2');
    expect(r1.code).not.toBe(r2.code);
  });
});

// ─── getRoom ─────────────────────────────────────────────────────────────────

describe('getRoom', () => {
  it('returns undefined for unknown code', () => {
    expect(rm.getRoom('00000')).toBeUndefined();
  });
});

// ─── addPlayer ───────────────────────────────────────────────────────────────

describe('addPlayer', () => {
  it('adds a player with correct defaults', () => {
    const room = rm.createRoom('socket-1');
    const player = rm.addPlayer(room.code, 'socket-1', 'Alice', '🦊');
    expect(player).not.toBeNull();
    expect(player!.name).toBe('Alice');
    expect(player!.avatar).toBe('🦊');
    expect(player!.stats).toEqual({ explained: 0, guessed: 0 });
    expect(room.players).toHaveLength(1);
  });

  it('host player gets isHost=true', () => {
    const room = rm.createRoom('socket-host');
    const player = rm.addPlayer(room.code, 'socket-host', 'Host', '🦁');
    expect(player!.isHost).toBe(true);
  });

  it('non-host player gets isHost=false', () => {
    const room = rm.createRoom('socket-host');
    rm.addPlayer(room.code, 'socket-host', 'Host', '🦁');
    const guest = rm.addPlayer(room.code, 'socket-guest', 'Guest', '🐺');
    expect(guest!.isHost).toBe(false);
  });

  it('strips HTML tags from player name (leaves text content)', () => {
    const room = rm.createRoom('s1');
    // Regex removes tags but preserves inner text — "<script>x</script>Alice" → "xAlice"
    const player = rm.addPlayer(room.code, 's1', '<b>Bold</b>Alice', '🦊');
    expect(player!.name).toBe('BoldAlice');
    expect(player!.name).not.toContain('<');
    expect(player!.name).not.toContain('>');
  });

  it('truncates name to 20 characters', () => {
    const room = rm.createRoom('s1');
    const longName = 'A'.repeat(30);
    const player = rm.addPlayer(room.code, 's1', longName, '🦊');
    expect(player!.name).toHaveLength(20);
  });

  it('returns null for unknown room', () => {
    const result = rm.addPlayer('99999', 'socket-1', 'Alice', '🦊');
    expect(result).toBeNull();
  });

  it('returns null when room is full', () => {
    const room = rm.createRoom('socket-host');
    for (let i = 0; i < MAX_PLAYERS; i++) {
      rm.addPlayer(room.code, `socket-${i}`, `Player${i}`, '🦊');
    }
    const extra = rm.addPlayer(room.code, 'socket-extra', 'Extra', '🦊');
    expect(extra).toBeNull();
    expect(room.players).toHaveLength(MAX_PLAYERS);
  });

  it('stores avatarId when provided', () => {
    const room = rm.createRoom('s1');
    const player = rm.addPlayer(room.code, 's1', 'Alice', '🦊', '3');
    expect(player!.avatarId).toBe('3');
  });
});

// ─── removePlayer ────────────────────────────────────────────────────────────

describe('removePlayer', () => {
  it('removes player from room', () => {
    const room = rm.createRoom('s1');
    rm.addPlayer(room.code, 's1', 'Alice', '🦊');
    rm.removePlayer(room.code, 's1');
    expect(room.players).toHaveLength(0);
  });

  it('returns the removed playerId', () => {
    const room = rm.createRoom('s1');
    const player = rm.addPlayer(room.code, 's1', 'Alice', '🦊')!;
    const removed = rm.removePlayer(room.code, 's1');
    expect(removed).toBe(player.id);
  });

  it('returns null for unknown socket', () => {
    const room = rm.createRoom('s1');
    const result = rm.removePlayer(room.code, 'unknown-socket');
    expect(result).toBeNull();
  });

  it('removes player from teams and drops empty teams', () => {
    const room = rm.createRoom('s1');
    const p = rm.addPlayer(room.code, 's1', 'Alice', '🦊')!;
    room.teams = [{
      id: 't0', name: 'Rockets', score: 0, color: 'bg-indigo-500', colorHex: '#6366f1',
      players: [p], nextPlayerIndex: 0,
    }];
    rm.removePlayer(room.code, 's1');
    // Team becomes empty → filtered out entirely to prevent game-over hang
    expect(room.teams).toHaveLength(0);
  });

  it('clamps nextPlayerIndex when removing last player', () => {
    const room = rm.createRoom('s1');
    const p1 = rm.addPlayer(room.code, 's1', 'A', '🦊')!;
    const p2 = rm.addPlayer(room.code, 's2', 'B', '🐺')!;
    room.teams = [{
      id: 't0', name: 'Rockets', score: 0, color: '', colorHex: '',
      players: [p1, p2], nextPlayerIndex: 1,
    }];
    rm.removePlayer(room.code, 's2');
    // nextPlayerIndex was 1, only 1 player left → should be 0
    expect(room.teams[0].nextPlayerIndex).toBe(0);
  });
});

// ─── handleDisconnect ────────────────────────────────────────────────────────

describe('handleDisconnect', () => {
  it('removes room when last player disconnects', () => {
    const room = rm.createRoom('s1');
    rm.addPlayer(room.code, 's1', 'Alice', '🦊');
    rm.handleDisconnect('s1');
    expect(rm.getRoom(room.code)).toBeUndefined();
  });

  it('migrates host when host disconnects', () => {
    const room = rm.createRoom('socket-host');
    rm.addPlayer(room.code, 'socket-host', 'Host', '🦁');
    rm.addPlayer(room.code, 'socket-guest', 'Guest', '🐺');

    const result = rm.handleDisconnect('socket-host');

    expect(result).not.toBeNull();
    expect(result!.roomCode).toBe(room.code);
    expect(room.hostSocketId).toBe('socket-guest');
    expect(room.players).toHaveLength(1);
    expect(room.players[0].isHost).toBe(true);
  });

  it('returns null when non-host disconnects', () => {
    const room = rm.createRoom('socket-host');
    rm.addPlayer(room.code, 'socket-host', 'Host', '🦁');
    rm.addPlayer(room.code, 'socket-guest', 'Guest', '🐺');

    const result = rm.handleDisconnect('socket-guest');

    expect(result).toBeNull();
    expect(room.players).toHaveLength(1);
    expect(room.hostSocketId).toBe('socket-host');
  });

  it('returns null for unknown socket', () => {
    expect(rm.handleDisconnect('unknown')).toBeNull();
  });

  it('updates isHost flag in teams during host migration', () => {
    const room = rm.createRoom('socket-host');
    const host = rm.addPlayer(room.code, 'socket-host', 'Host', '🦁')!;
    const guest = rm.addPlayer(room.code, 'socket-guest', 'Guest', '🐺')!;
    room.teams = [{
      id: 't0', name: 'T', score: 0, color: '', colorHex: '',
      players: [host, guest], nextPlayerIndex: 0,
    }];

    rm.handleDisconnect('socket-host');

    const teamPlayers = room.teams[0].players;
    const newHost = teamPlayers.find(p => p.isHost);
    expect(newHost).toBeDefined();
    expect(newHost!.id).toBe(guest.id);
  });
});

// ─── getSyncState ────────────────────────────────────────────────────────────

describe('getSyncState', () => {
  it('returns all required fields', () => {
    const room = rm.createRoom('s1');
    const state = rm.getSyncState(room);
    expect(state).toHaveProperty('gameState');
    expect(state).toHaveProperty('settings');
    expect(state).toHaveProperty('roomCode');
    expect(state).toHaveProperty('players');
    expect(state).toHaveProperty('teams');
    expect(state).toHaveProperty('currentTeamIndex');
    expect(state).toHaveProperty('currentWord');
    expect(state).toHaveProperty('currentRoundStats');
    expect(state).toHaveProperty('timeLeft');
    expect(state).toHaveProperty('isPaused');
    expect(state).toHaveProperty('wordDeck');
  });

  it('does not expose timerInterval or socketToPlayer', () => {
    const room = rm.createRoom('s1');
    const state = rm.getSyncState(room);
    expect(state).not.toHaveProperty('timerInterval');
    expect(state).not.toHaveProperty('socketToPlayer');
  });
});

// ─── getPlayerSocketId ───────────────────────────────────────────────────────

describe('getPlayerSocketId', () => {
  it('returns socket for known player', () => {
    const room = rm.createRoom('s1');
    const player = rm.addPlayer(room.code, 's1', 'Alice', '🦊')!;
    expect(rm.getPlayerSocketId(room, player.id)).toBe('s1');
  });

  it('returns undefined for unknown player', () => {
    const room = rm.createRoom('s1');
    expect(rm.getPlayerSocketId(room, 'unknown')).toBeUndefined();
  });
});

// ─── deleteRoom ──────────────────────────────────────────────────────────────

describe('deleteRoom', () => {
  it('removes room from map', () => {
    const room = rm.createRoom('s1');
    rm.deleteRoom(room.code);
    expect(rm.getRoom(room.code)).toBeUndefined();
  });
});
