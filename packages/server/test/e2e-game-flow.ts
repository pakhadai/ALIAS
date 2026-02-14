/**
 * E2E test: Full game flow via Socket.io
 *
 * Run with: tsx packages/server/test/e2e-game-flow.ts
 * Requires: server running on localhost:3001
 */
import { io, type Socket } from 'socket.io-client';
import type { GameSyncState, ClientToServerEvents, ServerToClientEvents } from '@alias/shared';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function createClient(name: string): AppSocket {
  return io(SERVER_URL, {
    autoConnect: false,
    transports: ['websocket'],
  }) as unknown as AppSocket;
}

function waitForEvent<T>(socket: AppSocket, event: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
    (socket as any).once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function waitForState(socket: AppSocket, predicate: (s: GameSyncState) => boolean, timeout = 10000): Promise<GameSyncState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for game state')), timeout);
    const handler = (state: GameSyncState) => {
      if (predicate(state)) {
        clearTimeout(timer);
        (socket as any).off('game:state-sync', handler);
        resolve(state);
      }
    };
    (socket as any).on('game:state-sync', handler);
  });
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

async function runTest() {
  console.log(`\n=== ALIAS E2E Test ===`);
  console.log(`Server: ${SERVER_URL}\n`);

  const host = createClient('Host');
  const player2 = createClient('Player2');

  try {
    // 1. Connect both clients
    console.log('1. Connecting clients...');
    host.connect();
    player2.connect();

    await Promise.all([
      waitForEvent(host, 'connect', 3000),
      waitForEvent(player2, 'connect', 3000),
    ]);
    assert(host.connected, 'Host connected');
    assert(player2.connected, 'Player2 connected');

    // 2. Host creates room
    console.log('\n2. Creating room...');
    const stateAfterCreate = waitForState(host, (s) => s.players.length >= 1);
    host.emit('room:create', { playerName: 'Host', avatar: '🎮' });
    const created = await waitForEvent<{ roomCode: string; playerId: string }>(host, 'room:created');
    assert(!!created.roomCode, `Room created: ${created.roomCode}`);
    assert(!!created.playerId, `Host playerId: ${created.playerId}`);

    const stateCreate = await stateAfterCreate;
    assert(stateCreate.players.length === 1, 'Room has 1 player after create');

    // 3. Player2 joins
    console.log('\n3. Player2 joining...');
    const stateAfterJoin = waitForState(host, (s) => s.players.length >= 2);
    player2.emit('room:join', { roomCode: created.roomCode, playerName: 'Player2', avatar: '🎲' });
    const joined = await waitForEvent<{ roomCode: string; playerId: string }>(player2, 'room:joined');
    assert(joined.roomCode === created.roomCode, 'Player2 joined same room');

    const stateJoin = await stateAfterJoin;
    assert(stateJoin.players.length === 2, 'Room has 2 players');

    // 4. Start duel (1v1)
    console.log('\n4. Starting 1v1 duel...');
    const stateAfterDuel = waitForState(host, (s) => s.gameState === 'VS_SCREEN');
    host.emit('game:action', { action: 'START_DUEL' });
    const stateDuel = await stateAfterDuel;
    assert(stateDuel.gameState === 'VS_SCREEN', 'Game state is VS_SCREEN');
    assert(stateDuel.teams.length === 2, 'Created 2 teams for duel');

    // 5. Start game
    console.log('\n5. Starting game...');
    const stateAfterStartGame = waitForState(host, (s) => s.gameState === 'PRE_ROUND');
    host.emit('game:action', { action: 'START_GAME' });
    const stateGame = await stateAfterStartGame;
    assert(stateGame.gameState === 'PRE_ROUND', 'Game state is PRE_ROUND');
    assert(stateGame.currentTeamIndex === 0, 'Current team index is 0');

    // 6. Start round
    console.log('\n6. Starting round...');
    const stateAfterRound = waitForState(host, (s) => s.gameState === 'COUNTDOWN');
    host.emit('game:action', { action: 'START_ROUND' });
    const stateRound = await stateAfterRound;
    assert(stateRound.gameState === 'COUNTDOWN', 'Game state is COUNTDOWN');

    // 7. Start playing
    console.log('\n7. Start playing...');
    const stateAfterPlay = waitForState(host, (s) => s.gameState === 'PLAYING');
    host.emit('game:action', { action: 'START_PLAYING' });
    const statePlay = await stateAfterPlay;
    assert(statePlay.gameState === 'PLAYING', 'Game state is PLAYING');
    assert(statePlay.currentWord.length > 0, `Got word: "${statePlay.currentWord}"`);
    assert(statePlay.timeLeft > 0, `Timer: ${statePlay.timeLeft}s`);

    // 8. Answer correct + skip
    console.log('\n8. Answering words...');
    const firstWord = statePlay.currentWord;

    const stateAfterCorrect = waitForState(host, (s) =>
      s.currentRoundStats.correct === 1 && s.currentWord !== firstWord
    );
    host.emit('game:action', { action: 'CORRECT' });
    const stateCorrect = await stateAfterCorrect;
    assert(stateCorrect.currentRoundStats.correct === 1, 'Correct count: 1');
    assert(stateCorrect.currentWord !== firstWord, 'Got new word after correct');

    const secondWord = stateCorrect.currentWord;
    const stateAfterSkip = waitForState(host, (s) =>
      s.currentRoundStats.skipped === 1 && s.currentWord !== secondWord
    );
    host.emit('game:action', { action: 'SKIP' });
    const stateSkip = await stateAfterSkip;
    assert(stateSkip.currentRoundStats.skipped === 1, 'Skip count: 1');

    // 9. Time up
    console.log('\n9. Time up...');
    const stateAfterTimeUp = waitForState(host, (s) => s.gameState === 'ROUND_SUMMARY');
    host.emit('game:action', { action: 'TIME_UP' });
    const stateTimeUp = await stateAfterTimeUp;
    assert(stateTimeUp.gameState === 'ROUND_SUMMARY', 'Game state is ROUND_SUMMARY');
    assert(stateTimeUp.currentRoundStats.words.length === 2, 'Round stats has 2 words');

    // 10. Confirm round
    console.log('\n10. Confirming round...');
    const stateAfterConfirm = waitForState(host, (s) => s.gameState === 'SCOREBOARD');
    host.emit('game:action', { action: 'CONFIRM_ROUND' });
    const stateConfirm = await stateAfterConfirm;
    assert(stateConfirm.gameState === 'SCOREBOARD', 'Game state is SCOREBOARD');

    // Score should be max(0, 1 correct - 1 skip) = 0 (with penalty)
    const team0Score = stateConfirm.teams[0]?.score ?? -1;
    assert(team0Score === 0, `Team 0 score: ${team0Score} (1 correct - 1 skip penalty = 0)`);

    // 11. Reset game
    console.log('\n11. Resetting game...');
    const stateAfterReset = waitForState(host, (s) => s.gameState === 'LOBBY');
    host.emit('game:action', { action: 'RESET_GAME' });
    const stateReset = await stateAfterReset;
    assert(stateReset.gameState === 'LOBBY', 'Game state is LOBBY');
    assert(stateReset.teams.length === 0, 'Teams cleared');

    // 12. Player2 leaves
    console.log('\n12. Player2 leaving...');
    const stateAfterLeave = waitForState(host, (s) => s.players.length === 1);
    player2.emit('room:leave');
    const stateLeave = await stateAfterLeave;
    assert(stateLeave.players.length === 1, 'Room has 1 player after leave');

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  } catch (err) {
    console.error('\n❌ Test error:', (err as Error).message);
    failed++;
  } finally {
    host.disconnect();
    player2.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTest();
