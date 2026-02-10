
import { useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { 
  GameState, PeerConnection, Player, AppState, NetworkMessage 
} from '../types';
import { 
  MAX_PLAYERS, RECONNECT_INTERVAL_MS, RECONNECT_MAX_TIME_S, 
  BROADCAST_DEBOUNCE_MS, CONNECTION_TIMEOUT_MS 
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
      name: String(p.name).replace(/<[^>]*>/g, '').slice(0, 20),
      avatar: typeof p.avatar === 'string' ? p.avatar.slice(0, 4) : '🐶',
      isHost: Boolean(p.isHost),
      stats: { explained: Math.max(0, Number(p.stats?.explained) || 0) }
    })).slice(0, MAX_PLAYERS);
  }

  if (Array.isArray(state.teams)) safe.teams = state.teams;
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
  const connectionsRef = useRef<PeerConnection[]>([]);
  const hostConnRef = useRef<PeerConnection | null>(null);
  const reconnectIntervalRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  const broadcastState = useCallback(() => {
    if (!state.isHost || state.gameMode === 'OFFLINE') return;
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
    connectionsRef.current.forEach(c => c.open && c.send(syncData));
  }, [state.isHost, state.gameMode]);

  const connectToHost = useCallback(() => {
    if (!peerRef.current || stateRef.current.isHost) return;
    
    if (hostConnRef.current) {
        hostConnRef.current.close();
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
      const p = JSON.parse(localStorage.getItem('alias_player') || '{}');
      conn.send({ type: 'JOIN_REQUEST', payload: { id: peerRef.current!.id, ...p } });
    });

    conn.on('data', (data: any) => {
      if (data.type === 'SYNC_STATE') {
        const validated = validateSyncState(data.payload, initialState);
        if (validated) dispatch({ type: 'SET_STATE', payload: validated });
      }
    });

    conn.on('close', () => {
      dispatch({ type: 'SET_STATE', payload: { isConnected: false } });
      hostConnRef.current = null;
      
      if (stateRef.current.gameState !== GameState.MENU && !reconnectIntervalRef.current) {
        dispatch({ type: 'SET_STATE', payload: { isHostReconnecting: true, reconnectTimeLeft: RECONNECT_MAX_TIME_S } });
        let attempts = 0;
        reconnectIntervalRef.current = window.setInterval(() => {
          attempts++;
          dispatch({ type: 'SET_STATE', payload: { reconnectTimeLeft: Math.max(0, RECONNECT_MAX_TIME_S - (attempts * 3)) } });
          
          if (attempts >= 20) {
            clearInterval(reconnectIntervalRef.current!);
            reconnectIntervalRef.current = null;
            dispatch({ type: 'SET_STATE', payload: { isHostReconnecting: false, gameState: GameState.MENU } });
            return;
          }
          connectToHost();
        }, RECONNECT_INTERVAL_MS);
      }
    });
  }, [dispatch, initialState]);

  useEffect(() => {
    if (state.gameMode === 'OFFLINE' || !state.roomCode || state.gameState === GameState.MENU) return;
    
    const peerId = state.isHost ? `alias-master-${state.roomCode}` : `alias-player-${state.roomCode}-${Math.floor(Math.random()*1000)}`;
    const peer = new Peer(peerId);
    peerRef.current = peer;

    peer.on('open', () => {
      dispatch({ type: 'SET_STATE', payload: { peerError: null } });
      if (!state.isHost) connectToHost();
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && state.isHost) {
        // Handle two hosts with same code
        dispatch({ type: 'SET_STATE', payload: { 
          roomCode: Math.floor(10000 + Math.random() * 90000).toString() 
        } });
      } else {
        dispatch({ type: 'SET_STATE', payload: { peerError: err.type } });
      }
    });

    peer.on('connection', (conn: any) => {
      if (state.isHost) {
        connectionsRef.current.push(conn);
        conn.on('data', (data: any) => {
          if (data.type === 'JOIN_REQUEST') {
            const currentPlayers = stateRef.current.players;
            // Check for existing player to avoid double entries on reconnect
            const existingIdx = currentPlayers.findIndex(p => p.id === data.payload.id);
            const newPlayer = { 
              ...data.payload, 
              name: String(data.payload.name).replace(/<[^>]*>/g, '').slice(0, 20),
              isHost: false, 
              stats: { explained: 0 } 
            };

            if (existingIdx !== -1) {
              const updated = [...currentPlayers];
              updated[existingIdx] = newPlayer;
              dispatch({ type: 'UPDATE_PLAYERS', payload: updated });
            } else {
              dispatch({ type: 'UPDATE_PLAYERS', payload: [...currentPlayers, newPlayer] });
            }
            setTimeout(broadcastState, BROADCAST_DEBOUNCE_MS);
          } else if (data.type === 'GAME_ACTION') {
            handleGameAction(data.payload);
          }
        });
      }
    });

    return () => { 
      peer.destroy();
      if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };
  }, [state.roomCode, state.isHost, state.gameMode, connectToHost, handleGameAction, broadcastState, dispatch]);

  return { broadcastState, hostConn: hostConnRef.current };
};
