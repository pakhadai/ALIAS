import { GameMode, GameState, TEAM_COLORS } from '@alias/shared';
import type { GameActionPayload, ModeSettings, ModeSettingsUpdate, Team } from '@alias/shared';
import type { PrismaClient } from '@prisma/client';
import type { Room, RoomManager } from './RoomManager';
import type { WordService } from './WordService';
import { getHandler } from '../modes';
import type { IGameModeHandler } from '../modes';

export class GameEngine {
  private prisma: PrismaClient | null = null;
  private timerBroadcast: ((room: Room) => void) | null = null;
  private notificationBroadcast:
    | ((room: Room, message: string, type: 'info' | 'error' | 'success') => void)
    | null = null;

  constructor(
    private roomManager: RoomManager,
    private wordService: WordService
  ) {}

  /** Provide a callback that broadcasts current room state during active timer ticks */
  setTimerBroadcast(fn: (room: Room) => void): void {
    this.timerBroadcast = fn;
  }

  /** Provide a callback that sends in-game notifications to all room clients */
  setNotificationBroadcast(
    fn: (room: Room, message: string, type: 'info' | 'error' | 'success') => void
  ): void {
    this.notificationBroadcast = fn;
  }

  setPrisma(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async persistNewGameSession(room: Room): Promise<void> {
    if (!this.prisma) return;
    try {
      const session = await this.prisma.gameSession.create({
        data: {
          roomCode: room.code,
          hostPlayerId: room.hostPlayerId,
          playerCount: room.players.length,
          settings: room.settings as object,
          status: 'active',
        },
      });
      room.sessionId = session.id;
    } catch (err) {
      console.warn('[GameEngine] gameSession.create failed:', (err as Error).message);
    }
  }

  private async persistAbandonSession(room: Room): Promise<void> {
    const sid = room.sessionId;
    if (!sid) return;
    if (this.prisma) {
      try {
        await this.prisma.gameSession.update({
          where: { id: sid },
          data: { status: 'abandoned', completedAt: new Date() },
        });
      } catch (err) {
        console.warn('[GameEngine] gameSession abandon failed:', (err as Error).message);
      }
    }
    room.sessionId = undefined;
  }

  private async persistRoundProgress(
    room: Room,
    roundsPlayed: number,
    isGameOver: boolean
  ): Promise<void> {
    if (!this.prisma || !room.sessionId) return;
    try {
      await this.prisma.gameSession.update({
        where: { id: room.sessionId },
        data: {
          roundsPlayed,
          ...(isGameOver ? { status: 'completed', completedAt: new Date() } : {}),
        },
      });
    } catch (err) {
      console.warn('[GameEngine] gameSession progress update failed:', (err as Error).message);
    }
  }

  private getActiveHandler(room: Room): IGameModeHandler {
    return getHandler(room.settings.mode.gameMode);
  }

  private ensureTeamShells(room: Room): void {
    const teamMode = room.settings.general.teamMode ?? 'TEAMS';
    const teamCount =
      teamMode === 'SOLO'
        ? Math.max(1, Math.min(room.players.length, 16))
        : Math.max(2, Math.min(room.settings.general.teamCount, 8));
    const existing = room.teams ?? [];
    if (existing.length === teamCount) return;
    const names = [
      'Rockets',
      'Ninjas',
      'Cyberpunks',
      'Champions',
      'Kittens',
      'Thunders',
      'Stars',
      'Titans',
    ];
    room.teams = Array.from({ length: teamCount }, (_, i) => {
      const prev = existing[i];
      return {
        id: prev?.id ?? `team-${i}`,
        name: prev?.name ?? names[i % names.length] ?? `Team ${i + 1}`,
        score: prev?.score ?? 0,
        color: prev?.color ?? TEAM_COLORS[i % TEAM_COLORS.length].class,
        colorHex: prev?.colorHex ?? TEAM_COLORS[i % TEAM_COLORS.length].hex,
        players: prev?.players ?? [],
        nextPlayerIndex: prev?.nextPlayerIndex ?? 0,
      };
    });
  }

  private removePlayerFromTeams(room: Room, playerId: string): void {
    room.teams = (room.teams ?? []).map((t) => {
      const filtered = t.players.filter((p) => p.id !== playerId);
      return {
        ...t,
        players: filtered,
        nextPlayerIndex: t.nextPlayerIndex >= filtered.length ? 0 : t.nextPlayerIndex,
      };
    });
  }

  async handleAction(room: Room, payload: GameActionPayload, senderId?: string): Promise<void> {
    switch (payload.action) {
      case 'TEAM_LOCK': {
        room.teamsLocked = Boolean(payload.data.locked);
        break;
      }
      case 'TEAM_RENAME': {
        this.ensureTeamShells(room);
        const { teamId, name } = payload.data;
        room.teams = room.teams.map((t) => (t.id === teamId ? { ...t, name } : t));
        break;
      }
      case 'TEAM_LEAVE': {
        if (!senderId) break;
        this.ensureTeamShells(room);
        const targetId =
          payload.data && 'playerId' in payload.data && payload.data.playerId
            ? payload.data.playerId
            : senderId;
        this.removePlayerFromTeams(room, targetId);
        break;
      }
      case 'TEAM_JOIN': {
        if (!senderId) break;
        this.ensureTeamShells(room);
        const targetId =
          payload.data && 'playerId' in payload.data && payload.data.playerId
            ? payload.data.playerId
            : senderId;
        const me = room.players.find((p) => p.id === targetId);
        if (!me) break;
        const { teamId } = payload.data;
        this.removePlayerFromTeams(room, me.id);
        room.teams = room.teams.map((t) =>
          t.id === teamId ? { ...t, players: [...t.players, me] } : t
        );
        break;
      }
      case 'TEAM_SHUFFLE_UNASSIGNED': {
        this.ensureTeamShells(room);
        const assigned = new Set<string>();
        room.teams.forEach((t) => t.players.forEach((p) => assigned.add(p.id)));
        const unassigned = room.players.filter((p) => !assigned.has(p.id));
        const shuffled = this.shuffleArray(unassigned);
        shuffled.forEach((p) => {
          const smallestIdx = room.teams
            .map((t, i) => ({ i, n: t.players.length }))
            .sort((a, b) => a.n - b.n)[0]?.i;
          if (smallestIdx == null) return;
          const target = room.teams[smallestIdx];
          room.teams[smallestIdx] = { ...target, players: [...target.players, p] };
        });
        break;
      }
      case 'TEAM_SHUFFLE_ALL': {
        this.ensureTeamShells(room);
        const shuffled = this.shuffleArray([...room.players]);
        room.teams = room.teams.map((t) => ({ ...t, players: [], nextPlayerIndex: 0 }));
        shuffled.forEach((p, i) => {
          const idx = i % room.teams.length;
          const target = room.teams[idx];
          room.teams[idx] = { ...target, players: [...target.players, p] };
        });
        break;
      }
      case 'CORRECT':
      case 'SKIP':
      case 'GUESS_OPTION': {
        if (room.isPaused) break;
        if (!room.currentTask) break;

        const handler = this.getActiveHandler(room);
        const result = handler.handleAction(payload, room.currentTask, {
          room,
          senderId,
        });

        if (result.isCorrect) {
          room.currentRoundStats = {
            ...room.currentRoundStats,
            correct: room.currentRoundStats.correct + 1,
            words: [
              ...room.currentRoundStats.words,
              {
                word: room.currentTask.prompt,
                taskId: room.currentTask.id,
                result: payload.action === 'GUESS_OPTION' ? 'guessed' : 'correct',
              },
            ],
          };
        } else if (payload.action === 'SKIP') {
          room.currentRoundStats = {
            ...room.currentRoundStats,
            skipped: room.currentRoundStats.skipped + 1,
            words: [
              ...room.currentRoundStats.words,
              { word: room.currentTask.prompt, taskId: room.currentTask.id, result: 'skipped' },
            ],
          };
        }

        if (result.nextWord) {
          await this.nextWord(room);
          if (room.timeUp) {
            this.transitionToRoundSummary(room);
          }
        }

        if (result.endTurn) {
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
        room.timeLeft =
          'classicRoundTime' in room.settings.mode ? room.settings.mode.classicRoundTime : 0;
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
        const teamCount = Math.min(room.settings.general.teamCount, room.players.length);
        const teamNames = [
          'Rockets',
          'Ninjas',
          'Cyberpunks',
          'Champions',
          'Kittens',
          'Thunders',
          'Stars',
          'Titans',
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
        if ((room.settings.general.teamMode ?? 'TEAMS') === 'SOLO') {
          room.teams = room.players.map((p, i) => ({
            id: `team-${i}`,
            name: p.name,
            score: 0,
            color: TEAM_COLORS[i % TEAM_COLORS.length].class,
            colorHex: TEAM_COLORS[i % TEAM_COLORS.length].hex,
            players: [p],
            nextPlayerIndex: 0,
          }));
        } else {
          this.ensureTeamShells(room);
        }
        room.gameState = GameState.PRE_ROUND;
        room.currentTeamIndex = 0;
        room.roundsPlayed = 0;
        room.timeUp = false;
        room.isPaused = false;
        room.teamsLocked = true;
        room.revealedPlayerIds = [];
        room.imposterPhase = undefined;
        room.imposterPlayerId = undefined;
        room.imposterWord = undefined;

        if (room.settings.mode.gameMode === GameMode.IMPOSTER) {
          const pool = room.players;
          const picked =
            pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : undefined;
          room.imposterPlayerId = picked?.id;
          room.imposterPhase = 'REVEAL';
          // Pick a single word from the deck (secret for non-imposter clients)
          const { word, deck, usedWords } = await this.wordService.nextWord(
            room.wordDeck,
            room.settings,
            room.usedWords
          );
          room.wordDeck = deck;
          room.usedWords = usedWords;
          room.imposterWord = word;
          // IMPOSTER does not use classic currentTask/currentWord here — reveal is handled via private event.
          room.currentTask = null;
          room.currentWord = '';
          room.timeLeft = 0;
        }

        await this.persistNewGameSession(room);
        break;
      }

      case 'NEXT_ROUND': {
        if (room.teams.length === 0) break;
        room.currentTeamIndex = (room.currentTeamIndex + 1) % room.teams.length;
        room.gameState = GameState.PRE_ROUND;
        break;
      }

      case 'PAUSE_GAME': {
        const nextPaused = !room.isPaused;
        room.isPaused = nextPaused;
        if (nextPaused) {
          this.stopTimer(room);
        } else if (room.gameState === GameState.PLAYING && room.timeLeft > 0 && !room.timeUp) {
          this.startTimer(room);
        }
        break;
      }

      case 'IMPOSTER_READY': {
        if (room.settings.mode.gameMode !== GameMode.IMPOSTER) break;
        if (!senderId) break;
        if (room.imposterPhase !== 'REVEAL') break;
        const revealed = new Set(room.revealedPlayerIds ?? []);
        revealed.add(senderId);
        room.revealedPlayerIds = [...revealed];

        const allPlayerIds = room.players.map((p) => p.id);
        const allRevealed = allPlayerIds.length > 0 && allPlayerIds.every((id) => revealed.has(id));
        if (allRevealed) {
          room.imposterPhase = 'DISCUSSION';
          room.timeLeft = room.settings.mode.imposterDiscussionTime;
          room.timeUp = false;
          this.startTimer(room);
        }
        break;
      }

      case 'IMPOSTER_END_GAME': {
        if (room.settings.mode.gameMode !== GameMode.IMPOSTER) break;
        if (room.imposterPhase !== 'DISCUSSION') break;
        this.stopTimer(room);
        room.imposterPhase = 'RESULTS';
        room.timeLeft = 0;
        room.timeUp = false;
        break;
      }

      case 'UPDATE_SETTINGS': {
        const mergeModeSettings = (
          prev: ModeSettings,
          patch: ModeSettingsUpdate | undefined
        ): ModeSettings => {
          if (!patch) return prev;
          const nextGameMode = patch.gameMode ?? prev.gameMode;
          switch (nextGameMode) {
            case GameMode.IMPOSTER: {
              return {
                gameMode: GameMode.IMPOSTER,
                imposterDiscussionTime:
                  patch.imposterDiscussionTime ??
                  (prev.gameMode === GameMode.IMPOSTER ? prev.imposterDiscussionTime : 3 * 60),
              };
            }
            case GameMode.HARDCORE: {
              return {
                gameMode: GameMode.HARDCORE,
                classicRoundTime:
                  patch.classicRoundTime ??
                  (prev.gameMode !== GameMode.IMPOSTER ? prev.classicRoundTime : 60),
              };
            }
            case GameMode.CLASSIC:
            case GameMode.TRANSLATION:
            case GameMode.SYNONYMS:
            case GameMode.QUIZ: {
              return {
                gameMode: nextGameMode,
                classicRoundTime:
                  patch.classicRoundTime ??
                  (prev.gameMode !== GameMode.IMPOSTER ? prev.classicRoundTime : 60),
              };
            }
          }
          return prev;
        };

        room.settings = {
          ...room.settings,
          ...(payload.data.general
            ? { general: { ...room.settings.general, ...payload.data.general } }
            : {}),
          ...(payload.data.mode
            ? { mode: mergeModeSettings(room.settings.mode, payload.data.mode) }
            : {}),
        };
        break;
      }

      case 'RESET_GAME': {
        this.stopTimer(room);
        await this.persistAbandonSession(room);
        room.gameState = GameState.LOBBY;
        room.teams = [];
        room.teamsLocked = false;
        room.currentTeamIndex = 0;
        room.currentWord = '';
        room.currentTask = null;
        room.wordDeck = [];
        room.usedWords = [];
        room.timeLeft = 0;
        room.isPaused = false;
        room.currentRoundStats = {
          correct: 0,
          skipped: 0,
          words: [],
          teamId: '',
          explainerName: '',
        };
        break;
      }

      case 'REMATCH': {
        await this.persistNewGameSession(room);
        room.teams = room.teams.map((t) => ({
          ...t,
          score: 0,
          nextPlayerIndex: 0,
        }));
        room.gameState = GameState.PRE_ROUND;
        room.currentTeamIndex = 0;
        room.usedWords = [];
        room.currentWord = '';
        room.currentTask = null;
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
          .filter((team) => team.players.length > 0);
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
        const rawPoints =
          currentRoundStats.correct -
          (settings.general.skipPenalty ? currentRoundStats.skipped : 0);
        const points = Math.max(0, rawPoints);

        const activeTeam = teams[currentTeamIndex];
        const explainerId = currentRoundStats.explainerId;
        const correctCount = currentRoundStats.correct;
        room.teams = teams.map((t) => {
          const updated = { ...t };
          if (t.id === currentRoundStats.teamId) {
            updated.score = Math.max(0, t.score + points);
            if (correctCount > 0) {
              updated.players = t.players.map((p) => ({
                ...p,
                stats: {
                  ...p.stats,
                  explained: p.stats.explained + (p.id === explainerId ? correctCount : 0),
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
        const hasWinner = room.teams.some((t) => t.score >= settings.general.scoreToWin);
        const isGameOver = isLastTeam && hasWinner;
        room.gameState = isGameOver ? GameState.GAME_OVER : GameState.SCOREBOARD;

        await this.persistRoundProgress(room, room.roundsPlayed, isGameOver);
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
      room.usedWords
    );
    room.wordDeck = deck;
    room.usedWords = usedWords;

    // Let the active mode handler produce a GameTask from the raw word + remaining deck
    const handler = this.getActiveHandler(room);
    // Temporarily push word back so handler can pop it via its generateTask()
    room.wordDeck.push(word);
    const task = handler.generateTask(room.wordDeck, room.settings);
    room.currentTask = task;
    room.currentWord = task.prompt;
    room.currentTaskAnswered = undefined;

    if (deckReshuffled && room.currentRoundStats.words.length > 0) {
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
        if (
          room.settings.mode.gameMode === GameMode.IMPOSTER &&
          room.imposterPhase === 'DISCUSSION'
        ) {
          room.imposterPhase = 'RESULTS';
          room.timeUp = false;
        }
        this.timerBroadcast?.(room);
      } else if (ticksSinceSync >= 10) {
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
