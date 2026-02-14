import { GameState, TEAM_COLORS } from '@alias/shared';
import type { GameActionPayload, Team } from '@alias/shared';
import type { Room, RoomManager } from './RoomManager';
import type { WordService } from './WordService';

export class GameEngine {
  constructor(
    private roomManager: RoomManager,
    private wordService: WordService,
  ) {}

  handleAction(room: Room, payload: GameActionPayload): void {
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
        this.nextWord(room);
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
        this.nextWord(room);
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
        this.nextWord(room);
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
        room.gameState = GameState.LOBBY;
        room.teams = [];
        room.currentTeamIndex = 0;
        room.currentWord = '';
        room.wordDeck = [];
        room.timeLeft = 0;
        room.isPaused = false;
        room.currentRoundStats = {
          correct: 0, skipped: 0, words: [], teamId: '', explainerName: '',
        };
        break;
      }

      case 'REMATCH': {
        room.teams = room.teams.map((t) => ({
          ...t,
          score: 0,
          nextPlayerIndex: 0,
        }));
        room.gameState = GameState.PRE_ROUND;
        room.currentTeamIndex = 0;
        room.wordDeck = [];
        room.currentWord = '';
        break;
      }

      case 'KICK_PLAYER': {
        const kickedId = payload.data;
        room.players = room.players.filter((p) => p.id !== kickedId);
        room.teams = room.teams.map((team) => {
          const filtered = team.players.filter((p) => p.id !== kickedId);
          return {
            ...team,
            players: filtered,
            nextPlayerIndex:
              team.nextPlayerIndex >= filtered.length
                ? Math.max(0, filtered.length - 1)
                : team.nextPlayerIndex,
          };
        });
        break;
      }

      case 'TIME_UP': {
        this.stopTimer(room);
        room.gameState = GameState.ROUND_SUMMARY;
        room.timeLeft = 0;
        break;
      }

      case 'CONFIRM_ROUND': {
        const { currentRoundStats, teams, currentTeamIndex, settings } = room;
        const rawPoints = currentRoundStats.correct - (settings.skipPenalty ? currentRoundStats.skipped : 0);
        const points = Math.max(0, rawPoints);

        const activeTeam = teams[currentTeamIndex];
        room.teams = teams.map((t) => {
          const updated = { ...t };
          if (t.id === currentRoundStats.teamId) {
            updated.score = Math.max(0, t.score + points);
          }
          if (activeTeam && t.id === activeTeam.id) {
            updated.nextPlayerIndex = (t.nextPlayerIndex + 1) % (t.players.length || 1);
          }
          return updated;
        });

        const isLastTeam = currentTeamIndex === teams.length - 1;
        const hasWinner = room.teams.some((t) => t.score >= settings.scoreToWin);
        room.gameState = isLastTeam && hasWinner ? GameState.GAME_OVER : GameState.SCOREBOARD;
        break;
      }
    }
  }

  private nextWord(room: Room): void {
    const { word, deck } = this.wordService.nextWord(room.wordDeck, room.settings);
    room.currentWord = word;
    room.wordDeck = deck;
  }

  private startTimer(room: Room): void {
    this.stopTimer(room);
    room.timerInterval = setInterval(() => {
      if (room.isPaused) return;
      room.timeLeft--;
      if (room.timeLeft <= 0) {
        this.handleAction(room, { action: 'TIME_UP' });
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
