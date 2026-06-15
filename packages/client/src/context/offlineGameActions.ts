import type { MutableRefObject, Dispatch } from 'react';
import type { GameActionPayload } from '@movli/shared';
import type { Action } from './gameReducer';
import { initialState } from './gameReducer';
import type { AppState, Player, Team } from '../types';
import { GameState, GameMode } from '../types';
import type { GameSoundId } from '../types';
import {
  deriveLobbyReadinessServer,
  getTeamColor,
  getTeamColorToken,
  shuffleArray,
} from '@movli/shared';
import { TEAM_NAMES, MAX_PLAYERS } from '../constants';
import { buildTeamShells } from '../utils/buildTeamShells';
import { AVATARS } from '../utils/avatars';
import { getUiStrings } from '../hooks/useT';
import { isOnlineOnlyGameMode } from '../constants/gameModeAvailability';

export type OfflineGameActionDeps = {
  stateRef: MutableRefObject<AppState>;
  dispatch: Dispatch<Action>;
  playSound: (soundId: GameSoundId) => void;
  nextWordLogic: () => void;
  nextOfflineImposterWord: () => string;
  offlineQuizLockTaskIdRef: MutableRefObject<string | null>;
};

/** Mirror LobbyScreen teamShells — persist shells before TEAM_* mutates state.teams. */
function materializeOfflineTeamsIfNeeded(state: AppState): Team[] {
  return buildTeamShells({
    teams: state.teams,
    teamCount: state.settings.general.teamCount ?? 2,
    teamMode: state.settings.general.teamMode ?? 'TEAMS',
    language: state.settings.general.language,
  });
}

/** Mirror server GameEngine START_GAME team setup for offline play. */
function prepareOfflineTeamsForStart(state: AppState): Team[] {
  const teamMode = state.settings.general.teamMode ?? 'TEAMS';
  if (teamMode === 'SOLO') {
    return state.players.map((p, i) => ({
      id: `team-${i}`,
      name: p.name,
      score: 0,
      color: getTeamColorToken(i),
      colorHex: getTeamColor(i).hex,
      players: [p],
      nextPlayerIndex: 0,
    }));
  }
  return materializeOfflineTeamsIfNeeded(state);
}

export function applyOfflineGameAction(
  deps: OfflineGameActionDeps,
  payload: GameActionPayload
): void {
  const {
    stateRef,
    dispatch,
    playSound,
    nextWordLogic,
    nextOfflineImposterWord,
    offlineQuizLockTaskIdRef: _offlineQuizLockTaskIdRef,
  } = deps;

  // Offline mode: allow PAUSE_GAME from any local player.
  // (Other actions remain host-driven in offline mode.)
  if (!stateRef.current.isHost && payload.action !== 'PAUSE_GAME') return;

  switch (payload.action) {
    case 'TEAM_LOCK': {
      dispatch({ type: 'SET_STATE', payload: { teamsLocked: payload.data.locked } });
      break;
    }
    case 'TEAM_RENAME': {
      const { teamId, name } = payload.data;
      const baseTeams = materializeOfflineTeamsIfNeeded(stateRef.current);
      dispatch({
        type: 'SET_STATE',
        payload: {
          teams: baseTeams.map((t) => (t.id === teamId ? { ...t, name } : t)),
        },
      });
      break;
    }
    case 'TEAM_LEAVE': {
      const actorId =
        payload.data && 'playerId' in payload.data && payload.data.playerId
          ? payload.data.playerId
          : stateRef.current.myPlayerId;
      if (!actorId) break;
      const baseTeams = materializeOfflineTeamsIfNeeded(stateRef.current);
      dispatch({
        type: 'SET_STATE',
        payload: {
          teams: baseTeams.map((t) => ({
            ...t,
            players: t.players.filter((p) => p.id !== actorId),
            nextPlayerIndex:
              t.nextPlayerIndex >= t.players.filter((p) => p.id !== actorId).length
                ? 0
                : t.nextPlayerIndex,
          })),
        },
      });
      break;
    }
    case 'TEAM_JOIN': {
      const actorId =
        'playerId' in payload.data && payload.data.playerId
          ? payload.data.playerId
          : stateRef.current.myPlayerId;
      if (!actorId) break;
      const me = stateRef.current.players.find((p) => p.id === actorId);
      if (!me) break;
      const { teamId } = payload.data;
      const baseTeams = materializeOfflineTeamsIfNeeded(stateRef.current);
      dispatch({
        type: 'SET_STATE',
        payload: {
          teams: baseTeams.map((t) => ({
            ...t,
            players:
              t.id === teamId
                ? [...t.players.filter((p) => p.id !== actorId), me]
                : t.players.filter((p) => p.id !== actorId),
          })),
        },
      });
      break;
    }
    case 'TEAM_SHUFFLE_UNASSIGNED': {
      const baseTeams = materializeOfflineTeamsIfNeeded(stateRef.current);
      const assigned = new Set<string>();
      baseTeams.forEach((t) => t.players.forEach((p) => assigned.add(p.id)));
      const unassigned = stateRef.current.players.filter((p) => !assigned.has(p.id));
      const shuffled = shuffleArray(unassigned);
      const nextTeams = baseTeams.map((t) => ({ ...t, players: [...t.players] }));
      shuffled.forEach((p) => {
        const smallestIdx = nextTeams
          .map((t, i) => ({ i, n: t.players.length }))
          .sort((a, b) => a.n - b.n)[0]?.i;
        if (smallestIdx == null) return;
        const slot = nextTeams[smallestIdx];
        if (slot) slot.players.push(p);
      });
      dispatch({ type: 'SET_STATE', payload: { teams: nextTeams } });
      break;
    }
    case 'TEAM_SHUFFLE_ALL': {
      const baseTeams = materializeOfflineTeamsIfNeeded(stateRef.current);
      const teamCount = Math.max(1, baseTeams.length);
      const shuffled = shuffleArray([...stateRef.current.players]);
      const nextTeams: Team[] = baseTeams.map((t) => ({
        ...t,
        players: [],
        nextPlayerIndex: 0,
      }));
      shuffled.forEach((p, i) => {
        const idx = i % teamCount;
        const slot = nextTeams[idx];
        if (slot) slot.players.push(p);
      });
      dispatch({ type: 'SET_STATE', payload: { teams: nextTeams } });
      break;
    }
    case 'CORRECT': {
      playSound('correct');
      const taskPrompt = stateRef.current.currentTask?.prompt ?? stateRef.current.currentWord;
      const taskId = stateRef.current.currentTask?.id;
      dispatch({
        type: 'SET_STATE',
        payload: {
          currentRoundStats: {
            ...stateRef.current.currentRoundStats,
            correct: stateRef.current.currentRoundStats.correct + 1,
            words: [
              ...stateRef.current.currentRoundStats.words,
              { word: taskPrompt, taskId, result: 'correct' },
            ],
          },
        },
      });
      if (stateRef.current.timeUp) {
        dispatch({
          type: 'SET_STATE',
          payload: { gameState: GameState.ROUND_SUMMARY, timeUp: false },
        });
      } else {
        nextWordLogic();
      }
      break;
    }
    case 'SKIP': {
      playSound('skip');
      const skipPrompt = stateRef.current.currentTask?.prompt ?? stateRef.current.currentWord;
      const skipTaskId = stateRef.current.currentTask?.id;
      dispatch({
        type: 'SET_STATE',
        payload: {
          currentRoundStats: {
            ...stateRef.current.currentRoundStats,
            skipped: stateRef.current.currentRoundStats.skipped + 1,
            words: [
              ...stateRef.current.currentRoundStats.words,
              { word: skipPrompt, taskId: skipTaskId, result: 'skipped' },
            ],
          },
        },
      });
      if (stateRef.current.timeUp) {
        dispatch({
          type: 'SET_STATE',
          payload: { gameState: GameState.ROUND_SUMMARY, timeUp: false },
        });
      } else if (
        stateRef.current.settings.mode.gameMode === GameMode.HARDCORE &&
        stateRef.current.settings.mode.hardcoreVariant !== 'TABOO'
      ) {
        dispatch({
          type: 'SET_STATE',
          payload: { gameState: GameState.ROUND_SUMMARY, timeUp: false },
        });
      } else {
        nextWordLogic();
      }
      break;
    }
    case 'GUESS_OPTION': {
      const { settings, currentTask } = stateRef.current;
      if (settings.mode.gameMode !== GameMode.QUIZ || !currentTask?.answer) break;
      break;
    }
    case 'START_ROUND': {
      const teams = stateRef.current.teams;
      const teamIdx = stateRef.current.currentTeamIndex;
      const team = teams[teamIdx];
      if (!team || team.players.length === 0) {
        dispatch({ type: 'SET_STATE', payload: { gameState: GameState.LOBBY } });
        break;
      }
      const playerIdx = Math.min(team.nextPlayerIndex, team.players.length - 1);
      const explainer = team.players[playerIdx];
      if (!explainer) {
        dispatch({ type: 'SET_STATE', payload: { gameState: GameState.LOBBY } });
        break;
      }
      dispatch({
        type: 'SET_STATE',
        payload: {
          gameState: GameState.COUNTDOWN,
          currentRoundStats: {
            correct: 0,
            skipped: 0,
            words: [],
            teamId: team.id,
            explainerName: explainer.name,
            explainerId: explainer.id,
          },
        },
      });
      break;
    }
    case 'START_PLAYING': {
      playSound('start');
      const mode = stateRef.current.settings.mode;
      const isQuiz = mode.gameMode === GameMode.QUIZ;
      const classicTime = 'classicRoundTime' in mode ? mode.classicRoundTime : 0;
      const roundTime = isQuiz ? (mode.quizRoundTime ?? classicTime) : classicTime;
      const timeLeft = isQuiz
        ? mode.quizTimerMode === 'PER_TASK'
          ? mode.quizQuestionTime
          : (mode.quizRoundTime ?? roundTime)
        : classicTime;
      const quizRoundTimeLeft = isQuiz ? roundTime : undefined;
      dispatch({
        type: 'SET_STATE',
        payload: {
          gameState: GameState.PLAYING,
          timeLeft,
          quizRoundTimeLeft,
          quizTaskLockUntil: undefined,
          roundEndsAt: timeLeft > 0 ? Date.now() + timeLeft * 1000 : undefined,
          isPaused: false,
          timeUp: false,
        },
      });
      nextWordLogic();
      break;
    }
    case 'START_DUEL': {
      const duelPlayers = stateRef.current.players;
      const duelTeams: Team[] = duelPlayers.map((p, i) => ({
        id: `team-${i}`,
        name: p.name,
        score: 0,
        color: getTeamColorToken(i),
        colorHex: getTeamColor(i).hex,
        players: [p],
        nextPlayerIndex: 0,
      }));
      dispatch({
        type: 'SET_STATE',
        payload: { teams: duelTeams, gameState: GameState.VS_SCREEN },
      });
      break;
    }
    case 'GENERATE_TEAMS': {
      const teamNames = TEAM_NAMES[stateRef.current.uiLanguage];
      const teamCount = Math.min(
        stateRef.current.settings.general.teamCount,
        stateRef.current.players.length
      );
      const newTeams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
        id: `team-${i}`,
        name: teamNames[i % teamNames.length] ?? `Team ${i + 1}`,
        score: 0,
        color: getTeamColorToken(i),
        colorHex: getTeamColor(i).hex,
        players: [],
        nextPlayerIndex: 0,
      }));
      const shuffledPlayers = shuffleArray([...stateRef.current.players]);
      shuffledPlayers.forEach((p, i) => {
        const slot = newTeams[i % newTeams.length];
        if (slot) slot.players.push(p);
      });
      dispatch({ type: 'SET_STATE', payload: { teams: newTeams, gameState: GameState.TEAMS } });
      break;
    }
    case 'START_GAME': {
      const mode = stateRef.current.settings.mode.gameMode ?? GameMode.CLASSIC;
      if (isOnlineOnlyGameMode(mode)) {
        const uiStrings = getUiStrings(stateRef.current.uiLanguage);
        dispatch({
          type: 'SHOW_NOTIF',
          payload: {
            message: uiStrings.gameModeQuizOnlineOnly,
            type: 'error',
          },
        });
        break;
      }
      const teamMode = stateRef.current.settings.general.teamMode ?? 'TEAMS';
      const teamsForReadiness =
        teamMode === 'SOLO' ? [] : materializeOfflineTeamsIfNeeded(stateRef.current);
      const readiness = deriveLobbyReadinessServer({
        teamMode,
        playersCount: stateRef.current.players.length,
        teams: teamsForReadiness,
        playerIds: stateRef.current.players.map((p) => p.id),
      });
      if (!readiness.ok) break;

      const nextTeams = prepareOfflineTeamsForStart(stateRef.current);
      const startBase = {
        teams: nextTeams,
        currentTeamIndex: 0,
        teamsLocked: true,
        roundsPlayed: 0,
        timeUp: false,
        isPaused: false,
      };

      if (stateRef.current.settings.mode.gameMode === GameMode.IMPOSTER) {
        const ps = stateRef.current.players;
        const imposter = ps[Math.floor(Math.random() * Math.max(1, ps.length))];
        const w = nextOfflineImposterWord();
        dispatch({
          type: 'SET_STATE',
          payload: {
            ...startBase,
            gameState: GameState.PRE_ROUND,
            imposterPhase: 'REVEAL',
            imposterPlayerId: imposter?.id,
            revealedPlayerIds: [],
            imposterOfflineRevealIndex: 0,
            imposterWord: w,
            imposterSecret: null,
            timeLeft: 0,
            currentWord: '',
            currentTask: null,
          },
        });
      } else {
        dispatch({
          type: 'SET_STATE',
          payload: {
            ...startBase,
            gameState: GameState.PRE_ROUND,
            usedWords: [],
          },
        });
      }
      break;
    }
    case 'NEXT_ROUND':
      if (stateRef.current.teams.length === 0) break;
      dispatch({
        type: 'SET_STATE',
        payload: {
          gameState: GameState.PRE_ROUND,
          currentTeamIndex: (stateRef.current.currentTeamIndex + 1) % stateRef.current.teams.length,
        },
      });
      break;
    case 'PAUSE_GAME': {
      const nextPaused = !stateRef.current.isPaused;
      const tl = stateRef.current.timeLeft;
      dispatch({
        type: 'SET_STATE',
        payload: {
          isPaused: nextPaused,
          roundEndsAt: nextPaused
            ? undefined
            : stateRef.current.gameState === GameState.PLAYING && tl > 0 && !stateRef.current.timeUp
              ? Date.now() + tl * 1000
              : stateRef.current.roundEndsAt,
        },
      });
      break;
    }
    case 'IMPOSTER_READY': {
      if (stateRef.current.settings.mode.gameMode !== GameMode.IMPOSTER) break;
      const { players, revealedPlayerIds, imposterOfflineRevealIndex } = stateRef.current;
      const current = players[imposterOfflineRevealIndex];
      if (!current) break;
      const nextRevealed = revealedPlayerIds.includes(current.id)
        ? revealedPlayerIds
        : [...revealedPlayerIds, current.id];
      const nextIndex = imposterOfflineRevealIndex + 1;
      const allRevealed = nextRevealed.length >= players.length;
      if (allRevealed) {
        const discussionTime =
          'imposterDiscussionTime' in stateRef.current.settings.mode
            ? stateRef.current.settings.mode.imposterDiscussionTime
            : 3 * 60;
        dispatch({
          type: 'SET_STATE',
          payload: {
            imposterPhase: 'DISCUSSION',
            revealedPlayerIds: nextRevealed,
            imposterOfflineRevealIndex: nextIndex,
            timeLeft: discussionTime,
            isPaused: false,
          },
        });
      } else {
        dispatch({
          type: 'SET_STATE',
          payload: {
            imposterPhase: 'REVEAL',
            revealedPlayerIds: nextRevealed,
            imposterOfflineRevealIndex: nextIndex,
          },
        });
      }
      break;
    }
    case 'IMPOSTER_END_GAME': {
      if (stateRef.current.settings.mode.gameMode !== GameMode.IMPOSTER) break;
      dispatch({ type: 'SET_STATE', payload: { imposterPhase: 'RESULTS', timeLeft: 0 } });
      break;
    }
    case 'UPDATE_SETTINGS':
      dispatch({
        type: 'SET_STATE',
        payload: {
          settings: {
            ...stateRef.current.settings,
            ...(payload.data.general
              ? {
                  general: { ...stateRef.current.settings.general, ...payload.data.general },
                }
              : {}),
            ...(payload.data.mode
              ? {
                  mode: (() => {
                    const prev = stateRef.current.settings.mode;
                    const patch = payload.data.mode;
                    const nextGameMode = patch.gameMode ?? prev.gameMode;
                    switch (nextGameMode) {
                      case GameMode.IMPOSTER:
                        return {
                          gameMode: GameMode.IMPOSTER,
                          imposterDiscussionTime:
                            patch.imposterDiscussionTime ??
                            (prev.gameMode === GameMode.IMPOSTER
                              ? prev.imposterDiscussionTime
                              : 3 * 60),
                        };
                      case GameMode.HARDCORE:
                        return {
                          gameMode: GameMode.HARDCORE,
                          classicRoundTime:
                            patch.classicRoundTime ??
                            (prev.gameMode !== GameMode.IMPOSTER ? prev.classicRoundTime : 60),
                          hardcoreVariant:
                            patch.hardcoreVariant ??
                            (prev.gameMode === GameMode.HARDCORE
                              ? prev.hardcoreVariant
                              : 'SKIP_ENDS_TURN'),
                        };
                      case GameMode.CLASSIC:
                      case GameMode.TRANSLATION:
                      case GameMode.SYNONYMS:
                      default:
                        return {
                          gameMode: nextGameMode,
                          classicRoundTime:
                            patch.classicRoundTime ??
                            (prev.gameMode !== GameMode.IMPOSTER ? prev.classicRoundTime : 60),
                        };
                      case GameMode.QUIZ: {
                        const prevQuiz =
                          prev.gameMode === GameMode.QUIZ
                            ? prev
                            : {
                                gameMode: GameMode.QUIZ as const,
                                classicRoundTime:
                                  prev.gameMode !== GameMode.IMPOSTER ? prev.classicRoundTime : 60,
                                quizTimerMode: 'ROUND' as const,
                                quizRoundTime:
                                  prev.gameMode !== GameMode.IMPOSTER ? prev.classicRoundTime : 60,
                                quizQuestionTime: 10,
                                quizTypes: {
                                  synonyms: true,
                                  antonyms: true,
                                  taboo: true,
                                  translation: false,
                                },
                                quizWrongPenaltyEnabled: false,
                              };

                        return {
                          ...prevQuiz,
                          gameMode: GameMode.QUIZ,
                          classicRoundTime: patch.classicRoundTime ?? prevQuiz.classicRoundTime,
                          quizTimerMode: patch.quizTimerMode ?? prevQuiz.quizTimerMode,
                          quizRoundTime:
                            patch.quizRoundTime ?? patch.classicRoundTime ?? prevQuiz.quizRoundTime,
                          quizQuestionTime: patch.quizQuestionTime ?? prevQuiz.quizQuestionTime,
                          quizTypes: patch.quizTypes
                            ? { ...prevQuiz.quizTypes, ...patch.quizTypes }
                            : prevQuiz.quizTypes,
                          quizWrongPenaltyEnabled:
                            patch.quizWrongPenaltyEnabled ?? prevQuiz.quizWrongPenaltyEnabled,
                        };
                      }
                    }
                  })(),
                }
              : {}),
          },
        },
      });
      break;
    case 'RESET_GAME':
      dispatch({
        type: 'SET_STATE',
        payload: {
          gameState: GameState.LOBBY,
          teams: [],
          teamsLocked: false,
          currentTeamIndex: 0,
          currentWord: '',
          currentTask: null,
          wordDeck: [],
          timeLeft: 0,
          roundEndsAt: undefined,
          quizRoundTimeLeft: undefined,
          quizTaskLockUntil: undefined,
          roundsPlayed: 0,
          usedWords: [],
          isPaused: false,
          currentRoundStats: initialState.currentRoundStats,
          imposterPhase: undefined,
          imposterPlayerId: undefined,
          revealedPlayerIds: [],
          imposterSecret: null,
          imposterOfflineRevealIndex: 0,
          imposterWord: null,
        },
      });
      localStorage.removeItem('movli_active_session');
      break;
    case 'REMATCH': {
      const remTeams = stateRef.current.teams.map((t) => ({
        ...t,
        score: 0,
        nextPlayerIndex: 0,
      }));
      dispatch({
        type: 'SET_STATE',
        payload: {
          teams: remTeams,
          gameState: GameState.PRE_ROUND,
          currentTeamIndex: 0,
          roundsPlayed: 0,
          usedWords: [],
          roundEndsAt: undefined,
          quizRoundTimeLeft: undefined,
          quizTaskLockUntil: undefined,
          wordDeck: stateRef.current.wordDeck,
          currentWord: '',
          currentTask: null,
          imposterPhase:
            stateRef.current.settings.mode.gameMode === GameMode.IMPOSTER ? 'REVEAL' : undefined,
          revealedPlayerIds: [],
          imposterSecret: null,
          imposterOfflineRevealIndex: 0,
          imposterWord:
            stateRef.current.settings.mode.gameMode === GameMode.IMPOSTER
              ? nextOfflineImposterWord()
              : null,
        },
      });
      break;
    }
    case 'KICK_PLAYER': {
      const kickedPlayerId = payload.data;
      const updatedPlayers = stateRef.current.players.filter((p) => p.id !== kickedPlayerId);
      const updatedTeams = stateRef.current.teams.map((team) => {
        const newPlayers = team.players.filter((p) => p.id !== kickedPlayerId);
        return {
          ...team,
          players: newPlayers,
          nextPlayerIndex:
            team.nextPlayerIndex >= newPlayers.length
              ? Math.max(0, newPlayers.length - 1)
              : team.nextPlayerIndex,
        };
      });
      dispatch({
        type: 'SET_STATE',
        payload: { players: updatedPlayers, teams: updatedTeams },
      });
      break;
    }
    case 'TIME_UP': {
      playSound('end');
      dispatch({
        type: 'SET_STATE',
        payload: {
          gameState: GameState.ROUND_SUMMARY,
          timeLeft: 0,
          roundEndsAt: undefined,
        },
      });
      break;
    }
    case 'CONFIRM_ROUND': {
      const { currentRoundStats, teams, currentTeamIndex, settings } = stateRef.current;
      const isQuiz = settings.mode.gameMode === GameMode.QUIZ;
      const rawPoints =
        currentRoundStats.correct - (settings.general.skipPenalty ? currentRoundStats.skipped : 0);
      const points = isQuiz ? 0 : Math.max(0, rawPoints);

      const activeTeam = teams[currentTeamIndex];
      const updatedTeams = teams.map((t) => {
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
      const hasWinner = updatedTeams.some((t) => t.score >= settings.general.scoreToWin);
      const nextState = isLastTeam && hasWinner ? GameState.GAME_OVER : GameState.SCOREBOARD;

      dispatch({
        type: 'SET_STATE',
        payload: {
          teams: updatedTeams,
          gameState: nextState,
          roundsPlayed: (stateRef.current.roundsPlayed ?? 0) + 1,
          roundEndsAt: undefined,
        },
      });
      break;
    }
    case 'ADD_OFFLINE_PLAYER': {
      const { players } = stateRef.current;
      if (players.length >= MAX_PLAYERS) {
        dispatch({
          type: 'SHOW_NOTIF',
          payload: {
            message: `Ліміт гравців: ${MAX_PLAYERS}`,
            type: 'error',
          },
        });
        break;
      }
      const playerNum = players.length + 1;
      const uiStrings = getUiStrings(stateRef.current.uiLanguage);
      const newPlayer: Player = {
        id: `local-${playerNum}-${Date.now()}`,
        name: payload.data?.name || `${uiStrings.playerN} ${playerNum}`,
        avatar: payload.data?.avatar || AVATARS[playerNum % AVATARS.length] || AVATARS[0] || '🙂',
        isHost: false,
        stats: { explained: 0, guessed: 0 },
      };
      dispatch({ type: 'UPDATE_PLAYERS', payload: [...players, newPlayer] });
      break;
    }
    case 'REMOVE_OFFLINE_PLAYER': {
      const removeId = payload.data;
      const updatedPlayers = stateRef.current.players.filter((p) => p.id !== removeId);
      const baseTeams = materializeOfflineTeamsIfNeeded(stateRef.current);
      const updatedTeams = baseTeams.map((team) => {
        const newPlayers = team.players.filter((p) => p.id !== removeId);
        return {
          ...team,
          players: newPlayers,
          nextPlayerIndex:
            team.nextPlayerIndex >= newPlayers.length
              ? Math.max(0, newPlayers.length - 1)
              : team.nextPlayerIndex,
        };
      });
      dispatch({
        type: 'SET_STATE',
        payload: { players: updatedPlayers, teams: updatedTeams },
      });
      break;
    }
  }
}
