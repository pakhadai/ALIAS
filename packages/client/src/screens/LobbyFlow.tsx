import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Check,
  Plus,
  Minus,
  FileText,
  PackageOpen,
  Copy,
  Loader2,
  Timer,
  Trophy,
  Gamepad2,
  BookOpen,
} from 'lucide-react';
import { Button } from '../components/Button';
import { ConfirmationModal } from '../components/Shared';
import { CustomDeckModal } from '../components/CustomDeck/CustomDeckModal';
import {
  GameState,
  Language,
  Category,
  GameSettings,
  GameMode,
} from '../types';
import { useGame } from '../context/GameContext';
import { useAuthContext } from '../context/AuthContext';
import { fetchStore, type WordPackItem } from '../services/api';
import { TRANSLATIONS, THEME_CONFIG } from '../constants';
import QRCode from 'qrcode';
import { AVATARS } from '../context/GameContext';
import { AvatarDisplay } from '../components/AvatarDisplay';
import type { RoomErrorCode } from '../types';

const ROOM_UNAVAILABLE_CODES: RoomErrorCode[] = [
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'ROOM_CREATE_FAILED',
];

function isRoomUnavailableError(code: RoomErrorCode | null): boolean {
  return code != null && ROOM_UNAVAILABLE_CODES.includes(code);
}

function isPlayerSocketConnected(p: { isConnected?: boolean }): boolean {
  return p.isConnected !== false;
}

export const LobbyScreen = () => {
  const {
    setGameState,
    currentTheme,
    roomCode,
    players,
    settings,
    sendAction,
    isHost,
    gameMode,
    myPlayerId,
    connectionError,
    connectionErrorCode,
    isConnected,
    isReconnecting,
    addOfflinePlayer,
    removeOfflinePlayer,
    leaveRoom,
    showNotification,
  } = useGame();
  const general = settings.general;
  const modeSettings = settings.mode;
  const t = TRANSLATIONS[general.language];
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState(AVATARS[0]);

  const joinUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomCode}`;

  useEffect(() => {
    if (gameMode === 'ONLINE' && roomCode) {
      QRCode.toDataURL(joinUrl, { margin: 1 }).then(setQrCodeData).catch(console.error);
    }
  }, [joinUrl, gameMode, roomCode]);

  const canCreateTeams = players.length >= 2;
  const categoriesPreview = useMemo(() => {
    const cats = general.categories ?? [];
    const names = cats
      .map((cat) => {
        const key = `cat_${String(cat).toLowerCase()}` as keyof typeof t;
        return t[key] ?? String(cat);
      })
      .slice(0, 2);
    const rest = Math.max(0, cats.length - names.length);
    return rest > 0 ? `${names.join(', ')} +${rest}` : names.join(', ');
  }, [general.categories, t]);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      showNotification(t.shareCopied ?? 'Copied!', 'success');
    } catch {
      showNotification('Clipboard недоступний', 'error');
    }
  };

  return (
    <div className={`flex flex-col min-h-screen items-center ${currentTheme.bg} p-6 md:p-8`}>
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <ConfirmationModal
          isOpen={showExitConfirm}
          title={t.leaveLobbyConfirm}
          message={t.leaveLobbyMsg}
          isDanger
          theme={currentTheme}
          onCancel={() => setShowExitConfirm(false)}
          onConfirm={() => {
            if (gameMode === 'ONLINE') leaveRoom();
            else setGameState(GameState.MENU);
          }}
          confirmText={t.confirmExit}
          cancelText={t.goBack}
        />

        <ConfirmationModal
          isOpen={!!kickTarget}
          title={t.kickConfirmTitle ?? 'Вигнати гравця?'}
          message={(t.kickConfirmMsg ?? 'Точно вигнати {0}?').replace(
            '{0}',
            kickTarget?.name ?? ''
          )}
          isDanger
          theme={currentTheme}
          onCancel={() => setKickTarget(null)}
          onConfirm={() => {
            if (kickTarget) sendAction({ action: 'KICK_PLAYER', data: kickTarget.id });
            setKickTarget(null);
          }}
          confirmText={t.kickConfirmYes ?? 'Так, вигнати'}
          cancelText={t.goBack}
        />

        {showQrModal && qrCodeData && (
          <div
            className="fixed inset-0 z-120 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowQrModal(false)}
          >
            <div
              className="flex flex-col items-center gap-6 max-w-[min(92vw,420px)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white p-8 rounded-2xl shadow-2xl ring-1 ring-black/10 animate-pop-in w-full flex justify-center">
                <img
                  src={qrCodeData}
                  alt="QR"
                  className="w-[min(80vw,320px)] h-[min(80vw,320px)] max-w-full rounded-xl"
                />
              </div>
              <p className="text-(--ui-fg) text-[10px] uppercase tracking-[0.5em] font-bold text-center px-4">
                {t.scanToJoin ?? 'Відскануйте для приєднання'}
              </p>
            </div>
          </div>
        )}

        <header className="flex justify-between items-center py-6 mb-4 shrink-0">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-2 opacity-30 hover:opacity-100 transition-opacity"
          >
            <X size={20} className={currentTheme.iconColor} />
          </button>
          <h2
            className={`text-[10px] font-sans uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}
          >
            {t.lobby}
          </h2>
          {isHost ? (
            <button
              onClick={() => setGameState(GameState.SETTINGS)}
              className="p-2 opacity-30 hover:opacity-100 transition-opacity"
            >
              <SettingsIcon size={20} className={currentTheme.iconColor} />
            </button>
          ) : (
            <div className="w-10"></div>
          )}
        </header>

        {/* Guest online: room gone vs relay/other errors vs plain disconnect */}
        {!isHost && gameMode === 'ONLINE' && !isConnected && !isReconnecting && (
          <div className="w-full max-w-sm mx-auto mb-6 space-y-3">
            {isRoomUnavailableError(connectionErrorCode) ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center animate-shake">
                <p className="text-red-400 font-sans text-sm mb-2 font-bold uppercase tracking-wider">
                  {t.connectionFailed}
                </p>
                <p className="text-red-300/60 text-xs">{t.roomNotFound.replace('{0}', roomCode)}</p>
                <button
                  type="button"
                  onClick={() => setGameState(GameState.JOIN_INPUT)}
                  className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-red-300 text-xs uppercase tracking-wider transition-colors"
                >
                  {t.tryAgain}
                </button>
              </div>
            ) : connectionError ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center">
                <p className="text-amber-400 font-sans text-sm mb-2 font-bold uppercase tracking-wider">
                  {t.connectionFailed}
                </p>
                <p className="text-amber-200/70 text-xs">{connectionError}</p>
                <button
                  type="button"
                  onClick={() => setGameState(GameState.JOIN_INPUT)}
                  className="mt-4 px-6 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-amber-200 text-xs uppercase tracking-wider transition-colors"
                >
                  {t.tryAgain}
                </button>
              </div>
            ) : (
              <div className="bg-slate-500/10 border border-slate-500/25 rounded-2xl p-6 text-center">
                <p className="text-slate-400 text-sm">{t.lostServerConnection}</p>
              </div>
            )}
          </div>
        )}

        <main className="flex-1 flex flex-col items-center space-y-10">
          {gameMode === 'ONLINE' && qrCodeData && (
            <div className="w-full max-w-xs text-center space-y-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowQrModal(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setShowQrModal(true);
                }}
                className={`p-4 rounded-3xl inline-block shadow-2xl ${
                  currentTheme.isDark
                    ? 'bg-white ring-1 ring-white/10'
                    : 'bg-white ring-1 ring-slate-200/80'
                } transition-transform duration-150 ease-out active:scale-95 cursor-pointer`}
              >
                <img src={qrCodeData} alt="QR" className="w-32 h-32 rounded-lg" />
              </div>
              <p
                className={`text-[8px] uppercase tracking-[0.5em] font-bold ${currentTheme.textSecondary}`}
              >
                {t.roomCode}
              </p>
              <button
                type="button"
                onClick={copyRoomCode}
                className={`inline-flex items-center gap-3 px-4 py-2 rounded-2xl transition-all duration-150 ease-out active:scale-95 ${
                  currentTheme.isDark
                    ? 'bg-(--ui-surface) border border-(--ui-border) hover:bg-(--ui-surface-hover)'
                    : 'bg-(--ui-card) border border-(--ui-border) hover:bg-(--ui-surface-hover)'
                }`}
                title={t.copyRoomCodeTitle ?? 'Скопіювати код'}
              >
                <span className={`text-4xl font-serif tracking-[0.2em] ${currentTheme.textMain}`}>
                  {roomCode}
                </span>
                <Copy size={18} className={currentTheme.iconColor} />
              </button>

              {settings.general.customDeckCode && (
                <div
                  className={`mt-1 mx-auto max-w-xs rounded-2xl border px-4 py-3 text-left ${
                    currentTheme.isDark
                      ? 'border-indigo-400/35 bg-indigo-500/10'
                      : 'border-indigo-300 bg-indigo-50'
                  }`}
                >
                  <p
                    className={`text-[8px] uppercase tracking-[0.25em] font-bold mb-1 ${currentTheme.textSecondary}`}
                  >
                    {t.customDeckLobbyLabel}
                  </p>
                  <p className={`text-sm font-semibold leading-snug ${currentTheme.textMain}`}>
                    {settings.general.customDeckName || settings.general.customDeckCode}
                  </p>
                  <p
                    className={`text-[10px] font-mono mt-0.5 opacity-60 ${currentTheme.textSecondary}`}
                  >
                    {settings.general.customDeckCode}
                  </p>
                </div>
              )}

              {!isHost && (
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      currentTheme.isDark
                        ? 'border-(--ui-border) text-(--ui-fg-muted)'
                        : 'border-(--ui-border) text-(--ui-fg-muted)'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Timer size={12} className={currentTheme.iconColor} />
                      {'classicRoundTime' in settings.mode ? settings.mode.classicRoundTime : 0}s
                    </span>
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      currentTheme.isDark
                        ? 'border-(--ui-border) text-(--ui-fg-muted)'
                        : 'border-(--ui-border) text-(--ui-fg-muted)'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy size={12} className={currentTheme.iconColor} />
                      {settings.general.scoreToWin} {t.pts}
                    </span>
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      currentTheme.isDark
                        ? 'border-(--ui-border) text-(--ui-fg-muted)'
                        : 'border-(--ui-border) text-(--ui-fg-muted)'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Gamepad2 size={12} className={currentTheme.iconColor} />
                      {(settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.CLASSIC &&
                        (t.gameModeClassic ?? 'Classic')}
                      {(settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.TRANSLATION &&
                        (t.gameModeTranslation ?? 'Translation')}
                      {(settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.SYNONYMS &&
                        (t.gameModeSynonyms ?? 'Synonyms')}
                      {(settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.QUIZ &&
                        (t.gameModeQuiz ?? 'Quiz')}
                      {(settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.HARDCORE &&
                        (t.gameModeHardcore ?? 'Hardcore')}
                    </span>
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      currentTheme.isDark
                        ? 'border-(--ui-border) text-(--ui-fg-muted)'
                        : 'border-(--ui-border) text-(--ui-fg-muted)'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen size={12} className={currentTheme.iconColor} />
                      {categoriesPreview || '—'}
                    </span>
                  </span>
                  {settings.general.customDeckCode && (
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border max-w-[220px] truncate ${
                        currentTheme.isDark
                          ? 'border-indigo-400/40 text-indigo-200/90 bg-indigo-500/10'
                          : 'border-indigo-200 text-indigo-800 bg-indigo-50'
                      }`}
                      title={settings.general.customDeckName || settings.general.customDeckCode}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <FileText size={12} className="shrink-0" />
                        <span className="truncate">
                          {settings.general.customDeckName || settings.general.customDeckCode}
                        </span>
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="w-full max-w-sm space-y-6">
            <h3 className={`font-serif text-xl ${currentTheme.textMain}`}>
              {t.players} ({players.length})
            </h3>
            <div className="space-y-3">
              {players.map((p: any) => {
                const online = gameMode === 'OFFLINE' || isPlayerSocketConnected(p);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center p-4 rounded-2xl border transition-opacity ${
                      currentTheme.isDark
                        ? 'bg-(--ui-surface) border-(--ui-border)'
                        : 'bg-(--ui-card) border-(--ui-border)'
                    } ${!online ? 'opacity-75 border-amber-500/35' : ''}`}
                  >
                    {p.avatarId != null ? (
                      <AvatarDisplay avatarId={p.avatarId} size={36} />
                    ) : (
                      <span className="text-2xl">{p.avatar}</span>
                    )}
                    <div className="ml-4 flex flex-col min-w-0 flex-1">
                      <span className={`font-bold truncate ${currentTheme.textMain}`}>
                        {p.name}
                      </span>
                      {gameMode === 'ONLINE' && !online && (
                        <span
                          className={`text-[9px] uppercase tracking-widest font-bold mt-0.5 ${currentTheme.textSecondary}`}
                        >
                          {t.playerDisconnected}
                        </span>
                      )}
                    </div>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      {isHost && !p.isHost && p.id !== myPlayerId && gameMode === 'ONLINE' && (
                        <button
                          type="button"
                          onClick={() => setKickTarget({ id: p.id, name: p.name })}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 border border-red-500/30 transition-colors group"
                          title={t.kickPlayerTitle}
                        >
                          <X size={14} className="text-red-400 group-hover:text-red-300" />
                        </button>
                      )}
                      {isHost && gameMode === 'OFFLINE' && !p.isHost && (
                        <button
                          type="button"
                          onClick={() => removeOfflinePlayer(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 border border-red-500/30 transition-colors group"
                        >
                          <Minus size={14} className="text-red-400 group-hover:text-red-300" />
                        </button>
                      )}
                      {gameMode === 'ONLINE' && online && (
                        <div
                          className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                          title={t.playerOnlineHint}
                        />
                      )}
                      {gameMode === 'ONLINE' && !online && (
                        <div
                          className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse"
                          title={t.playerDisconnected}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Player button for offline mode */}
            {isHost && gameMode === 'OFFLINE' && (
              <button
                onClick={() => {
                  setNewPlayerName('');
                  setNewPlayerAvatar(AVATARS[(players.length + 1) % AVATARS.length]);
                  setShowAddPlayer(true);
                }}
                className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-dashed transition-all ${currentTheme.isDark ? 'border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:border-(--ui-border)' : 'border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:border-(--ui-border)'}`}
              >
                <Plus size={18} />
                <span className="text-[10px] uppercase tracking-widest font-bold">
                  {t.addPlayer}
                </span>
              </button>
            )}

            {/* Add Player Modal */}
            {showAddPlayer && (
              <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
                <div
                  className={`relative w-full max-w-sm p-10 rounded-[2.5rem] shadow-2xl ${currentTheme.card} animate-pop-in`}
                >
                  <button
                    onClick={() => setShowAddPlayer(false)}
                    className="absolute top-8 right-8 opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <X size={24} className={currentTheme.iconColor} />
                  </button>
                  <h2 className={`text-2xl font-serif mb-8 text-center ${currentTheme.textMain}`}>
                    {t.addPlayerTitle}
                  </h2>
                  <div className="space-y-6">
                    <input
                      autoFocus
                      value={newPlayerName}
                      onChange={(e) =>
                        setNewPlayerName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))
                      }
                      placeholder={t.namePlaceholder}
                      className="w-full bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) placeholder:text-(--ui-fg-muted) rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-(--ui-accent) focus:border-(--ui-accent) transition-all font-sans font-bold text-center text-sm"
                    />
                    <div className="grid grid-cols-6 gap-2">
                      {AVATARS.slice(0, 12).map((a) => (
                        <button
                          key={a}
                          onClick={() => setNewPlayerAvatar(a)}
                          className={`text-2xl p-2 rounded-xl transition-all ${newPlayerAvatar === a ? 'bg-[color-mix(in_srgb,var(--ui-accent)_18%,transparent)] scale-110 shadow-lg' : 'hover:bg-(--ui-surface-hover) opacity-60 hover:opacity-100'}`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <Button
                      themeClass={currentTheme.button}
                      fullWidth
                      size="lg"
                      onClick={() => {
                        const name = newPlayerName.trim();
                        if (name) {
                          addOfflinePlayer(name, newPlayerAvatar);
                          setShowAddPlayer(false);
                        }
                      }}
                      disabled={!newPlayerName.trim()}
                    >
                      {t.add}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="w-full max-w-sm mx-auto py-8">
          {isHost ? (
            players.length <= 3 ? (
              <Button
                themeClass={currentTheme.button}
                fullWidth
                size="xl"
                onClick={() => sendAction({ action: 'START_DUEL' })}
                disabled={!canCreateTeams}
                className={canCreateTeams ? 'animate-pulse' : ''}
              >
                {t.startGame}
              </Button>
            ) : (
              <Button
                themeClass={currentTheme.button}
                fullWidth
                size="xl"
                onClick={() => sendAction({ action: 'GENERATE_TEAMS' })}
                disabled={!canCreateTeams}
                className={canCreateTeams ? 'animate-pulse' : ''}
              >
                {t.createTeams}
              </Button>
            )
          ) : (
            <div className="flex items-center justify-center gap-3 text-center text-[10px] uppercase tracking-widest opacity-60">
              <Loader2 size={16} className={`animate-spin ${currentTheme.iconColor}`} />
              <span className="animate-pulse">{t.waitHost}</span>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export const TeamSetupScreen = () => {
  const { teams, settings, currentTheme, sendAction, setGameState, isHost, gameMode } = useGame();
  const t = TRANSLATIONS[settings.general.language];

  // Check that all teams have at least one player
  const allTeamsHavePlayers = teams.every((team) => team.players.length > 0);

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8`}>
      <header className="flex justify-between items-center py-6 mb-8">
        <button
          onClick={() => setGameState(GameState.LOBBY)}
          className="p-2 opacity-30 hover:opacity-100 transition-opacity"
        >
          <X size={20} className={currentTheme.iconColor} />
        </button>
        <h2
          className={`text-[10px] font-sans uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}
        >
          {t.teams}
        </h2>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
        {teams.map((team: any) => (
          <div
            key={team.id}
            className={`p-6 rounded-3xl border ${currentTheme.isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}
            style={{ borderLeftWidth: '6px', borderLeftColor: team.colorHex || undefined }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${team.color}`} />
              <h3 className={`font-serif text-xl ${currentTheme.textMain}`}>{team.name}</h3>
              <span className={`ml-auto text-[10px] ${currentTheme.textSecondary}`}>
                ({team.players.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.players.map((p: any) => {
                const online = gameMode === 'OFFLINE' || isPlayerSocketConnected(p);
                return (
                  <div
                    key={p.id}
                    className={`px-3 py-1.5 rounded-full flex items-center gap-2 border ${
                      currentTheme.isDark
                        ? 'bg-white/5 border-white/5'
                        : 'bg-slate-100 border-slate-200'
                    } ${gameMode === 'ONLINE' && !online ? 'opacity-70 border-amber-500/30' : ''}`}
                  >
                    {p.avatarId != null ? (
                      <AvatarDisplay avatarId={p.avatarId} size={20} />
                    ) : (
                      <span>{p.avatar}</span>
                    )}
                    <span
                      className={`text-[10px] uppercase tracking-widest font-bold ${currentTheme.textSecondary}`}
                    >
                      {p.name}
                    </span>
                    {gameMode === 'ONLINE' && !online && (
                      <span className="text-[8px] font-bold uppercase text-amber-500/90">
                        {t.playerDisconnected}
                      </span>
                    )}
                  </div>
                );
              })}
              {team.players.length === 0 && (
                <span className={`text-[10px] italic ${currentTheme.textSecondary} opacity-50`}>
                  {t.noPlayersInTeam}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="py-8 space-y-4">
        {isHost && (
          <button
            onClick={() => sendAction({ action: 'GENERATE_TEAMS' })}
            className={`w-full text-center text-[9px] uppercase tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity mb-4 ${currentTheme.textMain}`}
          >
            {t.shuffle}
          </button>
        )}
        {isHost ? (
          <Button
            themeClass={currentTheme.button}
            fullWidth
            size="xl"
            onClick={() => sendAction({ action: 'START_GAME' })}
            disabled={!allTeamsHavePlayers}
          >
            {t.startGame}
          </Button>
        ) : (
          <p className="text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse">
            {t.waitTeams}
          </p>
        )}
      </footer>
    </div>
  );
};

export const SettingsScreen = () => {
  const { settings, currentTheme, setGameState, isHost, sendAction, gameState } = useGame();
  const { isAuthenticated } = useAuthContext();
  const t = TRANSLATIONS[settings.general.language];
  const [showCustomDeckPicker, setShowCustomDeckPicker] = useState(false);
  const [ownedPacks, setOwnedPacks] = useState<WordPackItem[]>([]);
  const isDark = currentTheme.isDark;

  useEffect(() => {
    fetchStore()
      .then((data) => setOwnedPacks(data.wordPacks.filter((p) => p.owned)))
      .catch(() => {});
  }, []);

  const updateGeneral = <K extends keyof GameSettings['general']>(
    key: K,
    value: GameSettings['general'][K]
  ) => {
    if (!isHost) return;
    if (
      gameState !== GameState.LOBBY &&
      gameState !== GameState.MENU &&
      gameState !== GameState.SETTINGS
    )
      return;
    sendAction({ action: 'UPDATE_SETTINGS', data: { general: { [key]: value } } });
  };

  const updateMode = (patch: Partial<GameSettings['mode']>) => {
    if (!isHost) return;
    if (
      gameState !== GameState.LOBBY &&
      gameState !== GameState.MENU &&
      gameState !== GameState.SETTINGS
    )
      return;
    sendAction({ action: 'UPDATE_SETTINGS', data: { mode: patch as any } });
  };

  const clearCustomDeck = () => {
    if (!isHost) return;
    sendAction({
      action: 'UPDATE_SETTINGS',
      data: { general: { customDeckCode: undefined, customDeckName: undefined } },
    });
  };

  const applyCustomDeck = (code: string, name: string) => {
    if (!isHost) return;
    sendAction({
      action: 'UPDATE_SETTINGS',
      data: { general: { customDeckCode: code, customDeckName: name } },
    });
  };

  const togglePack = (packId: string) => {
    if (!isHost) return;
    const current = settings.general.selectedPackIds ?? [];
    const next = current.includes(packId)
      ? current.filter((id) => id !== packId)
      : [...current, packId];
    updateGeneral('selectedPackIds', next);
  };

  const categoriesList = [
    Category.GENERAL,
    Category.FOOD,
    Category.TRAVEL,
    Category.SCIENCE,
    Category.MOVIES,
    Category.CUSTOM,
  ];

  return (
    <div
      className={`flex flex-col min-h-screen items-center ${currentTheme.bg} p-6 md:p-8 overflow-y-auto no-scrollbar`}
    >
      <div className="max-w-2xl w-full">
        <header className="flex justify-between items-center py-6 mb-8">
          <button
            onClick={() => setGameState(GameState.LOBBY)}
            className="p-2 opacity-30 hover:opacity-100 transition-opacity"
          >
            <X size={20} className={currentTheme.iconColor} />
          </button>
          <h2
            className={`text-[10px] font-sans uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}
          >
            {t.settings}
          </h2>
          <div className="w-10"></div>
        </header>

        <div className="w-full space-y-6 pb-32">
          {/* BLOCK 1: Game Mode */}
          <div
            className={`p-6 rounded-3xl border space-y-5 ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'
            }`}
          >
            <div className="space-y-2">
              <h3 className={`text-xs font-bold tracking-[0.35em] uppercase ${currentTheme.textMain}`}>
                {t.gameMode ?? 'Режим гри'}
              </h3>
              <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [GameMode.CLASSIC, t.gameModeClassic ?? 'Classic'],
                  [GameMode.TRANSLATION, t.gameModeTranslation ?? 'Translation'],
                  [GameMode.SYNONYMS, t.gameModeSynonyms ?? 'Synonyms'],
                  [GameMode.QUIZ, t.gameModeQuiz ?? 'Quiz'],
                  [GameMode.HARDCORE, t.gameModeHardcore ?? 'Hardcore'],
                  [GameMode.IMPOSTER, t.gameModeImposter ?? 'Imposter'],
                ] as const
              ).map(([mode, label]) => {
                const active = (settings.mode.gameMode ?? GameMode.CLASSIC) === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateMode({ gameMode: mode })}
                    className={`py-3 px-2 rounded-xl border text-center text-[10px] font-bold uppercase tracking-wide transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform leading-tight ${
                      active
                        ? 'bg-champagne-gold text-black border-champagne-gold'
                        : isDark
                          ? 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                          : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {(() => {
              const m = settings.mode.gameMode ?? GameMode.CLASSIC;
              const hint =
                m === GameMode.TRANSLATION
                  ? (t.gameModeHintTranslation ??
                    'У колоді використовуйте формат «Слово|Переклад» (кастомні слова або свій словник).')
                  : m === GameMode.QUIZ
                    ? (t.gameModeHintQuiz ??
                      'Усі обирають варіант на екрані; перша правильна відповідь дає бал команді.')
                    : m === GameMode.SYNONYMS
                      ? (t.gameModeHintSynonyms ??
                        'Поки що як класика — окрема колода синонімів з’явиться пізніше.')
                      : m === GameMode.HARDCORE
                        ? (t.gameModeHintHardcore as string | undefined)
                        : m === GameMode.IMPOSTER
                          ? (t.gameModeHintImposter as string | undefined)
                          : (t.gameModeHintClassic as string | undefined);
              if (!hint) return null;
              return <p className={`text-[10px] leading-relaxed opacity-50 ${currentTheme.textSecondary}`}>{hint}</p>;
            })()}
          </div>

          {/* BLOCK 2: Content */}
          <div
            className={`p-6 rounded-3xl border space-y-6 ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'
            }`}
          >
            <div className="space-y-2">
              <h3 className={`text-xs font-bold tracking-[0.35em] uppercase ${currentTheme.textMain}`}>
                {t.content ?? 'Словник'}
              </h3>
              <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            </div>

            <div className="space-y-3">
              <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                {t.language}
              </p>
              <div className="flex gap-2">
                {[Language.UA, Language.DE, Language.EN].map((l) => (
                  <button
                    key={l}
                    onClick={() => updateGeneral('language', l)}
                    className={`flex-1 py-3 rounded-xl border transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                      settings.general.language === l
                        ? 'bg-champagne-gold text-black border-champagne-gold'
                        : isDark
                          ? 'bg-white/5 border-white/10 text-white/40'
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {(settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.TRANSLATION && (
              <div className="space-y-2">
                <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                  {t.targetAnswerLanguage ?? 'Мова відповіді (підказка)'}
                </p>
                <div className="flex gap-2">
                  {[Language.UA, Language.DE, Language.EN].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => updateGeneral('targetLanguage', l)}
                      className={`flex-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                        (settings.general.targetLanguage ?? Language.EN) === l
                          ? `border-yellow-500 bg-yellow-500/15 ${isDark ? 'text-yellow-400' : 'text-amber-900'}`
                          : isDark
                            ? 'bg-white/5 border-white/10 text-white/40'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                {t.categories}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {categoriesList.map((cat) => {
                  const catKey = `cat_${cat.toLowerCase()}` as keyof typeof t;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        const newCats = settings.general.categories.includes(cat)
                          ? settings.general.categories.filter((c) => c !== cat)
                          : [...settings.general.categories, cat];
                        if (newCats.length > 0) updateGeneral('categories', newCats);
                      }}
                      className={`p-3 rounded-xl border text-[10px] uppercase tracking-widest font-bold transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                        settings.general.categories.includes(cat)
                          ? 'border-yellow-500 bg-yellow-500 text-black'
                          : isDark
                            ? 'border-white/10 bg-white/5 text-white/40'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      {t[catKey] || cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {settings.general.categories.includes(Category.CUSTOM) && (
              <div className="space-y-3">
                <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                  {t.customWords}
                </p>
                <textarea
                  value={settings.general.customWords || ''}
                  onChange={(e) => updateGeneral('customWords', e.target.value)}
                  placeholder={t.customWordsPlaceholder || 'Enter words separated by commas...'}
                  className={`w-full h-24 p-4 rounded-xl border resize-none ${currentTheme.bg} ${currentTheme.textMain} border-white/10 focus:border-yellow-500 outline-none`}
                />
              </div>
            )}

            {/* Pack selection — visible when user has any owned packs (isDefault or purchased) */}
            {ownedPacks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                    {isAuthenticated ? 'Мої набори слів' : 'Доступні набори'}
                  </p>
                  {(settings.general.selectedPackIds?.length ?? 0) > 0 && (
                    <button
                      onClick={() => isHost && updateGeneral('selectedPackIds', [])}
                      className={`text-[9px] uppercase tracking-widest font-bold transition-opacity ${
                        isDark ? 'text-white/30 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'
                      } ${!isHost ? 'pointer-events-none' : ''}`}
                    >
                      Скинути
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ownedPacks.map((pack) => {
                    const isSelected = (settings.general.selectedPackIds ?? []).includes(pack.id);
                    return (
                      <button
                        key={pack.id}
                        onClick={() => togglePack(pack.id)}
                        disabled={!isHost}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform disabled:pointer-events-none ${
                          isSelected
                            ? 'border-[#D4AF6A] bg-[#D4AF6A]/10 text-[#D4AF6A]'
                            : isDark
                              ? 'border-white/10 bg-white/5 text-white/40 hover:text-white/70 hover:border-white/20'
                              : 'border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check size={10} />}
                        <span>{pack.name}</span>
                        <span className={`font-normal ${isSelected ? 'text-[#D4AF6A]/60' : 'opacity-40'}`}>
                          {pack.wordCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {(settings.general.selectedPackIds?.length ?? 0) === 0 && (
                  <p className={`text-[10px] ${isDark ? 'text-white/25' : 'text-slate-400'}`}>
                    Не вибрано — використовуються стандартні слова
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                {t.customDeckLobbyLabel ?? 'Власний словник'}
              </p>
              {settings.general.customDeckCode ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white leading-tight truncate">
                        {settings.general.customDeckName || settings.general.customDeckCode}
                      </p>
                      <p className="text-[10px] text-indigo-300/80 font-mono mt-0.5">
                        {settings.general.customDeckCode}
                      </p>
                    </div>
                  </div>
                  {isHost && (
                    <button
                      type="button"
                      onClick={clearCustomDeck}
                      className="text-slate-400 hover:text-white transition-colors p-1 shrink-0"
                      aria-label={t.close}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => isHost && setShowCustomDeckPicker(true)}
                  disabled={!isHost}
                    className="w-full p-3 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-white hover:border-indigo-500/40 transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform flex items-center gap-2 disabled:opacity-30"
                >
                  <FileText size={14} />
                  <span className="text-xs">Вибрати зі своїх словників…</span>
                </button>
              )}
            </div>
          </div>

          {/* BLOCK 3: Rules (dynamic) */}
          <div
            className={`p-6 rounded-3xl border space-y-6 ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'
            }`}
          >
            <div className="space-y-2">
              <h3 className={`text-xs font-bold tracking-[0.35em] uppercase ${currentTheme.textMain}`}>
                {t.rules ?? 'Правила'}
              </h3>
              <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            </div>

            {(() => {
              const mode = settings.mode;
              if (mode.gameMode === GameMode.IMPOSTER) {
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                        {t.imposterDiscussionTime ?? 'Час обговорення'}
                      </p>
                      <span className={`text-xs font-bold ${currentTheme.textAccent}`}>
                        {Math.round(mode.imposterDiscussionTime / 60)} хв
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([3, 5, 10] as const).map((min) => {
                        const active = mode.imposterDiscussionTime === min * 60;
                        return (
                          <button
                            key={min}
                            type="button"
                            onClick={() => updateMode({ imposterDiscussionTime: min * 60 })}
                            className={`py-3 rounded-xl border text-center text-[10px] font-bold uppercase tracking-wide transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                              active
                                ? 'bg-champagne-gold text-black border-champagne-gold'
                                : isDark
                                  ? 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {min} {t.min ?? 'хв'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                      {t.roundTime}
                    </p>
                    <span className={`text-xs font-bold ${currentTheme.textAccent}`}>
                      {'classicRoundTime' in mode ? mode.classicRoundTime : 0}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="10"
                    value={'classicRoundTime' in mode ? mode.classicRoundTime : 0}
                    onChange={(e) => updateMode({ classicRoundTime: parseInt(e.target.value) })}
                    className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-yellow-500 ${
                      isDark ? 'bg-white/10' : 'bg-slate-200'
                    }`}
                  />
                </div>
              );
            })()}

            <div className="space-y-4">
              <div className="flex justify-between">
                <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                  {t.scoreToWin}
                </p>
                <span className={`text-xs font-bold ${currentTheme.textAccent}`}>{settings.general.scoreToWin}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.general.scoreToWin}
                onChange={(e) => updateGeneral('scoreToWin', parseInt(e.target.value))}
                className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-yellow-500 ${
                  isDark ? 'bg-white/10' : 'bg-slate-200'
                }`}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                  {t.teamCount}
                </p>
                <span className={`text-xs font-bold ${currentTheme.textAccent}`}>{settings.general.teamCount}</span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                step="1"
                value={settings.general.teamCount}
                onChange={(e) => updateGeneral('teamCount', parseInt(e.target.value))}
                className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-yellow-500 ${
                  isDark ? 'bg-white/10' : 'bg-slate-200'
                }`}
              />
            </div>

            <div className="space-y-4">
              <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                {t.skipPenalty}
              </p>
              <button
                onClick={() => updateGeneral('skipPenalty', !settings.general.skipPenalty)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  settings.general.skipPenalty
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : isDark
                      ? 'border-white/10 bg-white/5 opacity-40'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <span className={currentTheme.textMain}>
                  {settings.general.skipPenalty ? t.enabled : t.disabled}
                </span>
                <div className={`w-12 h-6 rounded-full transition-all relative ${settings.general.skipPenalty ? 'bg-yellow-500' : isDark ? 'bg-white/20' : 'bg-slate-300'}`}>
                  <div
                    className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${
                      settings.general.skipPenalty ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 bg-linear-to-t from-black/80 to-transparent pointer-events-none flex justify-center">
        <div className="max-w-2xl w-full pointer-events-auto">
          <Button
            themeClass={currentTheme.button}
            fullWidth
            size="xl"
            onClick={() => setGameState(GameState.LOBBY)}
          >
            {t.save}
          </Button>
        </div>
      </div>

      {showCustomDeckPicker && (
        <CustomDeckModal
          onClose={() => setShowCustomDeckPicker(false)}
          onSelectDeck={(code, name) => {
            applyCustomDeck(code, name);
            setShowCustomDeckPicker(false);
          }}
        />
      )}
    </div>
  );
};
