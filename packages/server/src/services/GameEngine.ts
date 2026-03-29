import { GameState, TEAM_COLORS } from '@alias/shared';
import type { GameActionPayload, Team } from '@alias/shared';
import type { PrismaClient } from '@prisma/client';
import type { Room, RoomManager } from './RoomManager';
import type { WordService } from './WordService';

export class GameEngine {
  private prisma: PrismaClient | null = null;
  private timerBroadcast: ((room: Room) => void) | null = null;
  private notificationBroadcast:
    | ((room: Room, message: string, type: 'info' | 'error' | 'success') => void)
    | null = null;

  constructor(
    private roomManager: RoomManager,
    private wordService: WordService,
  ) {}

  /** Provide a callback that broadcasts current room state during active timer ticks */
  setTimerBroadcast(fn: (room: Room) => void): void {
    this.timerBroadcast = fn;
  }

  /** Provide a callback that sends in-game notifications to all room clients */
  setNotificationBroadcast(
    fn: (room: Room, message: string, type: 'info' | 'error' | 'success') => void,
  ): void {
    this.notificationBroadcast = fn;
  }

  setPrisma(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async handleAction(room: Room, payload: GameActionPayload): Promise<void> {
    switch (payload.action) {
      case 'CORRECT': {
        room.currentRoundStats = {
          ...room.currentRoundStats,
          correct: room.currentRoundStats.correct + 1,
          words: [
            ...room.currentRoundStats.words,
            { word: room.currentWord, result: 'correct' },
          ],
        };
        await this.nextWord(room);
        if (room.timeUp) {
          this.transitionToRoundSummary(room);
        }
        break;
      }

      case 'SKIP': {
        room.currentRoundStats = {
          ...room.currentRoundStats,
          skipped: room.currentRoundStats.skipped + 1,
          words: [
            ...room.currentRoundStats.words,
            { word: room.currentWord, result: 'skipped' },
          ],
        };
        await this.nextWord(room);
        if (room.timeUp) {
          this.transitionToRoundSummary(room);
        }
        break;
      }

      case 'START_ROUND': {
        const team = room.teams[room.currentTeamIndex];
        if (!team || team.players.length === 0) {
          room.gameState = GameState.LOBBY;
          break;
        }
        const playerIdx = Math.min(team.nextPlayerIndex, team.players.length - 1);
        const explainer = team.players[playerIdx];
        room.gameState = GameState.COUNTDOWN;
        room.currentRoundStats = {
          correct: 0,
          skipped: 0,
          words: [],
          teamId: team.id,
          explainerName: explainer.name,
          explainerId: explainer.id,
        };
        break;
      }

      case 'START_PLAYING': {
        room.gameState = GameState.PLAYING;
        room.timeLeft = room.settings.roundTime;
        room.isPaused = false;
        room.timeUp = false;
        await this.nextWord(room);
        this.startTimer(room);
        break;
      }

      case 'START_DUEL': {
        room.teams = room.players.map((p, i) => ({
          id: `team-${i}`,
          name: p.name,
          score: 0,
          color: TEAM_COLORS[i % TEAM_COLORS.length].class,
          colorHex: TEAM_COLORS[i % TEAM_COLORS.length].hex,
          players: [p],
          nextPlayerIndex: 0,
        }));
        room.gameState = GameState.VS_SCREEN;
        break;
      }

      case 'GENERATE_TEAMS': {
        const teamCount = Math.min(room.settings.teamCount, room.players.length);
        const teamNames = [
          'Rockets', 'Ninjas', 'Cyberpunks', 'Champions',
          'Kittens', 'Thunders', 'Stars', 'Titans',
        ];
        const newTeams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
          id: `team-${i}`,
          name: teamNames[i % teamNames.length],
          score: 0,
          color: TEAM_COLORS[i % TEAM_COLORS.length].class,
          colorHex: TEAM_COLORS[i % TEAM_COLORS.length].hex,
          players: [],
          nextPlayerIndex: 0,
        }));
        const shuffled = this.shuffleArray([...room.players]);
        shuffled.forEach((p, i) => newTeams[i % newTeams.length].players.push(p));
        room.teams = newTeams;
        room.gameState = GameState.TEAMS;
        break;
      }

      case 'START_GAME': {
        room.gameState = GameState.PRE_ROUND;
        room.currentTeamIndex = 0;
        room.roundsPlayed = 0;
        // Create GameSession record
        if (this.prisma) {
          this.prisma.gameSession.create({
            data: {
              roomCode: room.code,
              hostPlayerId: room.hostPlayerId,
              playerCount: room.players.length,
              settings: room.settings as object,
              status: 'active',
            },
          }).then((session) => {
            room.sessionId = session.id;
          }).catch(() => { /* non-critical */ });
        }
        break;
      }

      case 'NEXT_ROUND': {
        if (room.teams.length === 0) break;
        room.currentTeamIndex = (room.currentTeamIndex + 1) % room.teams.length;
        room.gameState = GameState.PRE_ROUND;
        break;
      }

      case 'PAUSE_GAME': {
        room.isPaused = !room.isPaused;
        break;
      }

      case 'UPDATE_SETTINGS': {
        room.settings = { ...room.settings, ...payload.data };
        break;
      }

      case 'RESET_GAME': {
        this.stopTimer(room);
        // Mark active session as abandoned
        if (this.prisma && room.sessionId) {
          this.prisma.gameSession.update({
            where: { id: room.sessionId },
            data: { status: 'abandoned', completedAt: new Date() },
          }).catch(() => {});
          room.sessionId = undefined;
        }
        room.gameState = GameState.LOBBY;
        room.teams = [];
        room.currentTeamIndex = 0;
        room.currentWord = '';
        room.wordDeck = [];
        room.usedWords = [];
        room.timeLeft = 0;
        room.isPaused = false;
        room.currentRoundStats = {
          correct: 0, skipped: 0, words: [], teamId: '', explainerName: '',
        };
        break;
      }

      case 'REMATCH': {
        // Create new session for the rematch
        if (this.prisma) {
          this.prisma.gameSession.create({
            data: {
              roomCode: room.code,
              hostPlayerId: room.hostPlayerId,
              playerCount: room.players.length,
              settings: room.settings as object,
              status: 'active',
            },
          }).then((session) => {
            room.sessionId = session.id;
          }).catch(() => {});
        }
        room.teams = room.teams.map((t) => ({
          ...t,
          score: 0,
          nextPlayerIndex: 0,
        }));
        room.gameState = GameState.PRE_ROUND;
        room.currentTeamIndex = 0;
        room.wordDeck = [];
        room.usedWords = [];
        room.currentWord = '';
        break;
      }

      case 'KICK_PLAYER': {
        const kickedId = payload.data;
        room.players = room.players.filter((p) => p.id !== kickedId);
        room.teams = room.teams
          .map((team) => {
            const filtered = team.players.filter((p) => p.id !== kickedId);
            return {
              ...team,
              players: filtered,
              nextPlayerIndex:
                team.nextPlayerIndex >= filtered.length
                  ? Math.max(0, filtered.length - 1)
                  : team.nextPlayerIndex,
            };
          })
          .filter((team) => team.players.length > 0); // drop now-empty teams
        // Clamp currentTeamIndex in case a team was removed
        if (room.teams.length > 0 && room.currentTeamIndex >= room.teams.length) {
          room.currentTeamIndex = 0;
        }
        break;
      }

      case 'TIME_UP': {
        this.transitionToRoundSummary(room);
        break;
      }

      case 'CONFIRM_ROUND': {
        const { currentRoundStats, teams, currentTeamIndex, settings } = room;
        const rawPoints = currentRoundStats.correct - (settings.skipPenalty ? currentRoundStats.skipped : 0);
        const points = Math.max(0, rawPoints);

        const activeTeam = teams[currentTeamIndex];
        const explainerId = currentRoundStats.explainerId;
        const correctCount = currentRoundStats.correct;
        room.teams = teams.map((t) => {
          const updated = { ...t };
          if (t.id === currentRoundStats.teamId) {
            updated.score = Math.max(0, t.score + points);
            // Update per-player guessed stats for non-explainers
            if (correctCount > 0) {
              updated.players = t.players.map(p => ({
                ...p,
                stats: {
                  ...p.stats,
                  guessed: p.stats.guessed + (p.id !== explainerId ? correctCount : 0),
                },
              }));
            }
          }
          if (activeTeam && t.id === activeTeam.id) {
            updated.nextPlayerIndex = (t.nextPlayerIndex + 1) % (t.players.length || 1);
          }
          return updated;
        });

        room.roundsPlayed += 1;
        const isLastTeam = currentTeamIndex === teams.length - 1;
        const hasWinner = room.teams.some((t) => t.score >= settings.scoreToWin);
        const isGameOver = isLastTeam && hasWinner;
        room.gameState = isGameOver ? GameState.GAME_OVER : GameState.SCOREBOARD;

        // Update GameSession analytics
        if (this.prisma && room.sessionId) {
          this.prisma.gameSession.update({
            where: { id: room.sessionId },
            data: {
              roundsPlayed: room.roundsPlayed,
              ...(isGameOver ? { status: 'completed', completedAt: new Date() } : {}),
            },
          }).catch(() => { /* non-critical */ });
        }
        break;
      }
    }
  }

  private transitionToRoundSummary(room: Room): void {
    this.stopTimer(room);
    room.gameState = GameState.ROUND_SUMMARY;
    room.timeLeft = 0;
    room.timeUp = false;
  }

  private async nextWord(room: Room): Promise<void> {
    const { word, deck, usedWords, deckReshuffled } = await this.wordService.nextWord(
      room.wordDeck,
      room.settings,
      room.usedWords,
    );
    room.currentWord = word;
    room.wordDeck = deck;
    room.usedWords = usedWords;
    if (deckReshuffled && room.currentRoundStats.words.length > 0) {
      // Notify only when reshuffled mid-round (not on first word of round)
      this.notificationBroadcast?.(room, '🔄 Всі слова показано — колода перемішана!', 'info');
    }
  }

  private startTimer(room: Room): void {
    this.stopTimer(room);
    let ticksSinceSync = 0;
    room.timerInterval = setInterval(() => {
      if (room.isPaused) return;
      room.timeLeft--;
      ticksSinceSync++;
      if (room.timeLeft <= 0) {
        room.timeUp = true;
        this.stopTimer(room);
        room.timeLeft = 0;
        this.timerBroadcast?.(room);
      } else if (ticksSinceSync >= 10) {
        // Force-sync timeLeft to all clients every 10 s to prevent drift
        // (browser throttling can cause client timer to deviate)
        ticksSinceSync = 0;
        this.timerBroadcast?.(room);
      }
    }, 1000);
  }

  private stopTimer(room: Room): void {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
