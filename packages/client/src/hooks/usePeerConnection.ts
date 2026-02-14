
import { useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import {
  GameState, PeerConnection, Player, AppState
} from '../types';
import {
  MAX_PLAYERS, RECONNECT_INTERVAL_MS, RECONNECT_MAX_TIME_S,
  BROADCAST_DEBOUNCE_MS, CONNECTION_TIMEOUT_MS, TRANSLATIONS
} from '../constants';

const validateSyncState = (state: any, initialState: any): Partial<AppState> | null => {
  if (!state || typeof state !== 'object') return null;
  const safe: any = {};

  if (state.gameState && Object.values(GameState).includes(state.gameState)) {
    safe.gameState = state.gameState;
  }
  if (typeof state.timeLeft === 'number') {
    safe.timeLeft = Math.max(0, Math.min(300, state.timeLeft));
  }
  if (typeof state.currentWord === 'string') {
    safe.currentWord = state.currentWord.replace(/<[^>]*>/g, '').slice(0, 50);
  }
  if (typeof state.isPaused === 'boolean') safe.isPaused = state.isPaused;
  if (typeof state.currentTeamIndex === 'number') safe.currentTeamIndex = state.currentTeamIndex;

  if (Array.isArray(state.players)) {
    safe.players = state.players.map((p: any) => ({
      id: String(p.id).slice(0, 50),
      persistentId: p.persistentId ? String(p.persistentId).slice(0, 50) : undefined,
      name: String(p.name).replace(/<[^>]*>/g, '').slice(0, 20),
      avatar: typeof p.avatar === 'string' ? p.avatar.slice(0, 4) : '🐶',
      isHost: Boolean(p.isHost),
      stats: { explained: Math.max(0, Number(p.stats?.explained) || 0) }
    })).slice(0, MAX_PLAYERS);
  }

  if (Array.isArray(state.teams)) {
    safe.teams = state.teams.map((team: any) => ({
      id: String(team.id || '').slice(0, 50),
      name: String(team.name || '').replace(/<[^>]*>/g, '').slice(0, 30),
      color: typeof team.color === 'string' ? team.color : '',
      colorHex: typeof team.colorHex === 'string' ? team.colorHex : '#888888',
      players: Array.isArray(team.players) ? team.players.map((p: any) => ({
        id: String(p.id).slice(0, 50),
        persistentId: p.persistentId ? String(p.persistentId).slice(0, 50) : undefined,
        name: String(p.name).replace(/<[^>]*>/g, '').slice(0, 20),
        avatar: typeof p.avatar === 'string' ? p.avatar.slice(0, 4) : '🐶',
        isHost: Boolean(p.isHost),
        stats: { explained: Math.max(0, Number(p.stats?.explained) || 0) }
      })) : [],
      score: Math.max(0, Number(team.score) || 0),
      nextPlayerIndex: Math.max(0, Number(team.nextPlayerIndex) || 0)
    })).slice(0, 10);
  }
  if (state.settings) safe.settings = { ...initialState.settings, ...state.settings };
  if (state.currentRoundStats) safe.currentRoundStats = state.currentRoundStats;

  return safe;
};

export const usePeerConnection = (
  state: AppState,
  dispatch: any,
  handleGameAction: any,
  initialState: any
) => {
  const peerRef = useRef<Peer | null>(null);
  const peerIdRef = useRef<string>('');
  const connectionsRef = useRef<PeerConnection[]>([]);
  const hostConnRef = useRef<PeerConnection | null>(null);
  const reconnectIntervalRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const pendingJoinRef = useRef<{ id: string, name: string, avatar: string, persistentId?: string } | null>(null);

  // Refs to avoid triggering peer recreation when these callbacks change
  const handleGameActionRef = useRef(handleGameAction);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { handleGameActionRef.current = handleGameAction; }, [handleGameAction]);

  const broadcastState = useCallback(() => {
    if (!stateRef.current.isHost || stateRef.current.gameMode === 'OFFLINE') return;
    const syncData = {
      type: 'SYNC_STATE',
      payload: {
        gameState: stateRef.current.gameState,
        settings: stateRef.current.settings,
        players: stateRef.current.players,
        teams: stateRef.current.teams,
        currentTeamIndex: stateRef.current.currentTeamIndex,
        currentWord: stateRef.current.currentWord,
        timeLeft: stateRef.current.timeLeft,
        currentRoundStats: stateRef.current.currentRoundStats,
        isPaused: stateRef.current.isPaused
      }
    };
    connectionsRef.current = connectionsRef.current.filter(c => !c.destroyed);
    connectionsRef.current.forEach(c => {
      try {
        if (c.open) c.send(syncData);
      } catch (e) {
        console.warn('Error sending to connection:', e);
      }
    });
  }, []);

  const sendJoinRequest = useCallback((playerData: { id: string, name: string, avatar: string, persistentId?: string }) => {
    if (hostConnRef.current?.open) {
      hostConnRef.current.send({
        type: 'JOIN_REQUEST',
        payload: playerData
      });
      pendingJoinRef.current = null;
    } else {
      // Queue for sending when connection opens
      pendingJoinRef.current = playerData;
    }
  }, []);

  const kickConnection = useCallback((playerId: string) => {
    const idx = connectionsRef.current.findIndex(c => c.playerId === playerId);
    if (idx !== -1) {
      try {
        connectionsRef.current[idx].send({ type: 'KICKED' });
        connectionsRef.current[idx].close();
      } catch (e) {
        console.warn('Error kicking connection:', e);
      }
      connectionsRef.current.splice(idx, 1);
    }
  }, []);

  const connectToHost = useCallback(() => {
    if (!peerRef.current || stateRef.current.isHost) return;

    if (hostConnRef.current) {
      try { hostConnRef.current.close(); } catch {}
      hostConnRef.current = null;
    }

    const conn = peerRef.current.connect(`alias-master-${stateRef.current.roomCode}`);
    hostConnRef.current = conn as any;

    const timeout = window.setTimeout(() => {
      if (!hostConnRef.current?.open) {
        dispatch({ type: 'SET_STATE', payload: { peerError: 'Connection timeout' } });
      }
    }, CONNECTION_TIMEOUT_MS);

    conn.on('open', () => {
      clearTimeout(timeout);
      dispatch({ type: 'SET_STATE', payload: { isConnected: true, isHostReconnecting: false, peerError: null } });
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }

      // Send pending join request if exists (queued from handleJoin before connection was ready)
      if (pendingJoinRef.current) {
        conn.send({ type: 'JOIN_REQUEST', payload: pendingJoinRef.current });
        pendingJoinRef.current = null;
      } else {
        // Only auto-send on reconnection (when player already has a name in localStorage)
        const p = JSON.parse(localStorage.getItem('alias_player') || '{}');
        if (p.name) {
          conn.send({ type: 'JOIN_REQUEST', payload: {
            id: stateRef.current.myPlayerId || peerRef.current!.id,
            persistentId: p.persistentId,
            name: p.name,
            avatar: p.avatar
          }});
        }
      }
    });

    conn.on('data', (data: any) => {
      if (data.type === 'SYNC_STATE') {
        const validated = validateSyncState(data.payload, initialState);
        if (validated) dispatch({ type: 'SET_STATE', payload: validated });
      } else if (data.type === 'KICKED') {
        const lang = stateRef.current.settings.language;
        const tr = TRANSLATIONS[lang];
        dispatch({ type: 'SET_STATE', payload: { gameState: GameState.MENU, peerError: null } });
        dispatch({ type: 'SHOW_NOTIF', payload: { message: tr.kicked, type: 'error' } });
        setTimeout(() => dispatch({ type: 'SHOW_NOTIF', payload: null }), 3000);
      }
    });

    conn.on('close', () => {
      dispatch({ type: 'SET_STATE', payload: { isConnected: false } });
      hostConnRef.current = null;

      if (stateRef.current.gameState !== GameState.MENU && !reconnectIntervalRef.current) {
        dispatch({ type: 'SET_STATE', payload: { isHostReconnecting: true, reconnectTimeLeft: RECONNECT_MAX_TIME_S } });
        let attempts = 0;
        reconnectIntervalRef.current = window.setInterval(() => {
          if (!reconnectIntervalRef.current) return;

          attempts++;
          dispatch({ type: 'SET_STATE', payload: { reconnectTimeLeft: Math.max(0, RECONNECT_MAX_TIME_S - (attempts * 3)) } });

          if (attempts >= 20) {
            if (reconnectIntervalRef.current) {
              clearInterval(reconnectIntervalRef.current);
              reconnectIntervalRef.current = null;
            }
            dispatch({ type: 'SET_STATE', payload: { isHostReconnecting: false, gameState: GameState.MENU } });
            return;
          }
          connectToHost();
        }, RECONNECT_INTERVAL_MS);
      }
    });
  }, [dispatch, initialState]);

  // Helper to fully clean up peer connections
  const cleanupPeer = useCallback(() => {
    connectionsRef.current.forEach(conn => {
      try { if (conn && !conn.destroyed) conn.close(); } catch {}
    });
    connectionsRef.current = [];
    if (hostConnRef.current && !hostConnRef.current.destroyed) {
      try { hostConnRef.current.close(); } catch {}
      hostConnRef.current = null;
    }
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch {}
      peerRef.current = null;
      peerIdRef.current = '';
    }
    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    pendingJoinRef.current = null;
  }, []);

  // Clean up peer when returning to MENU (separate from main effect to avoid peer recreation on screen transitions)
  useEffect(() => {
    if (state.gameState === GameState.MENU) {
      cleanupPeer();
    }
  }, [state.gameState, cleanupPeer]);

  // Main peer connection effect
  // Only depends on stable values (roomCode, isHost, gameMode) to prevent peer destruction on screen transitions
  useEffect(() => {
    if (state.gameMode === 'OFFLINE' || !state.roomCode) return;

    // Don't re-create peer if already connected with same room
    if (peerRef.current && !peerRef.current.destroyed) return;

    const peerId = state.isHost
      ? `alias-master-${state.roomCode}`
      : `alias-player-${state.roomCode}-${Math.floor(Math.random() * 1000)}`;
    const peer = new Peer(peerId);
    peerRef.current = peer;

    peer.on('open', (id) => {
      peerIdRef.current = id;
      dispatch({ type: 'SET_STATE', payload: { peerError: null } });
      if (!stateRef.current.isHost) connectToHost();
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && stateRef.current.isHost) {
        dispatch({ type: 'SET_STATE', payload: {
          roomCode: Math.floor(10000 + Math.random() * 90000).toString()
        } });
        try { peer.destroy(); } catch {}
        peerRef.current = null;
        peerIdRef.current = '';
      } else {
        dispatch({ type: 'SET_STATE', payload: { peerError: err.type } });
      }
    });

    peer.on('connection', (conn: any) => {
      if (!stateRef.current.isHost) return;

      connectionsRef.current.push(conn);

      conn.on('close', () => {
        const idx = connectionsRef.current.indexOf(conn);
        if (idx !== -1) connectionsRef.current.splice(idx, 1);

        // Remove disconnected player from state (only in lobby/teams phases to avoid breaking mid-game)
        if (conn.playerId) {
          const gs = stateRef.current.gameState;
          if (gs === GameState.LOBBY || gs === GameState.TEAMS) {
            const currentPlayers = stateRef.current.players.filter((p: Player) => p.id !== conn.playerId);
            dispatch({ type: 'UPDATE_PLAYERS', payload: currentPlayers });
            setTimeout(broadcastState, BROADCAST_DEBOUNCE_MS);
          }
        }
      });

      conn.on('data', (data: any) => {
        if (data.type === 'JOIN_REQUEST') {
          conn.playerId = data.payload.id;

          const currentPlayers = stateRef.current.players;
          const persistentId = data.payload.persistentId;
          const existingIdx = persistentId
            ? currentPlayers.findIndex((p: Player) => p.persistentId === persistentId)
            : currentPlayers.findIndex((p: Player) => p.id === data.payload.id);

          const newPlayer: Player = {
            id: String(data.payload.id || '').slice(0, 50),
            persistentId: persistentId || crypto.randomUUID(),
            name: String(data.payload.name || 'Player').replace(/<[^>]*>/g, '').slice(0, 20),
            avatar: typeof data.payload.avatar === 'string' ? data.payload.avatar.replace(/<[^>]*>/g, '').slice(0, 4) : '🐶',
            isHost: false,
            stats: existingIdx !== -1 ? currentPlayers[existingIdx].stats : { explained: 0 }
          };

          if (existingIdx !== -1) {
            const updated = [...currentPlayers];
            updated[existingIdx] = newPlayer;
            const updatedTeams = stateRef.current.teams.map((team: any) => ({
              ...team,
              players: team.players.map((p: any) =>
                (p.persistentId && p.persistentId === persistentId) || p.id === data.payload.id
                  ? { ...newPlayer, stats: p.stats }
                  : p
              )
            }));
            dispatch({ type: 'SET_STATE', payload: { players: updated, teams: updatedTeams } });
          } else {
            if (currentPlayers.length >= MAX_PLAYERS) return;
            dispatch({ type: 'UPDATE_PLAYERS', payload: [...currentPlayers, newPlayer] });
          }
          setTimeout(broadcastState, BROADCAST_DEBOUNCE_MS);
        } else if (data.type === 'GAME_ACTION') {
          handleGameActionRef.current(data.payload);
        }
      });
    });

    return () => {
      cleanupPeer();
    };
  }, [state.roomCode, state.isHost, state.gameMode, dispatch, connectToHost, broadcastState, cleanupPeer]);

  return { broadcastState, hostConn: hostConnRef.current, peerIdRef, sendJoinRequest, kickConnection };
};
