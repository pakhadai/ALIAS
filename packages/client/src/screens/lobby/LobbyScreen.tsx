import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Plus,
  Minus,
  FileText,
  Loader2,
  Timer,
  Trophy,
  Gamepad2,
  BookOpen,
} from 'lucide-react';
import { Button } from '../../components/Button';
import {
  ConfirmationModal,
  bottomSheetBackdropClass,
  bottomSheetPanelClass,
} from '../../components/Shared';
import { GameState, Language, GameMode } from '../../types';
import type { RoomErrorCode } from '../../types';
import { useGame } from '../../context/GameContext';
import { AVATARS } from '../../utils/avatars';
import { AvatarDisplay } from '../../components/AvatarDisplay';
import { TRANSLATIONS } from '../../constants';
import { useT } from '../../hooks/useT';
import QRCode from 'qrcode';

const ROOM_UNAVAILABLE_CODES: RoomErrorCode[] = [
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'ROOM_CREATE_FAILED',
];

function isRoomUnavailableError(code: RoomErrorCode | null): boolean {
  return code != null && ROOM_UNAVAILABLE_CODES.includes(code);
}

export function isPlayerSocketConnected(p: { isConnected?: boolean }): boolean {
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
  const t = useT();
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addPlayerSheetOpen, setAddPlayerSheetOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSheetOpen, setQrSheetOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState(AVATARS[0]);

  const joinUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomCode}`;

  useEffect(() => {
    if (gameMode === 'ONLINE' && roomCode) {
      QRCode.toDataURL(joinUrl, { margin: 1 }).then(setQrCodeData).catch(console.error);
    }
  }, [joinUrl, gameMode, roomCode]);

  useEffect(() => {
    if (showQrModal && qrCodeData) {
      const r = requestAnimationFrame(() => setQrSheetOpen(true));
      return () => cancelAnimationFrame(r);
    }
    setQrSheetOpen(false);
  }, [showQrModal, qrCodeData]);

  useEffect(() => {
    if (showAddPlayer) {
      const r = requestAnimationFrame(() => setAddPlayerSheetOpen(true));
      return () => cancelAnimationFrame(r);
    }
    setAddPlayerSheetOpen(false);
  }, [showAddPlayer]);

  const closeQrModal = () => {
    setQrSheetOpen(false);
    setTimeout(() => setShowQrModal(false), 280);
  };

  const closeAddPlayerModal = () => {
    setAddPlayerSheetOpen(false);
    setTimeout(() => setShowAddPlayer(false), 280);
  };

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

  // suppress unused-var lint on showNotification (available via context, may be used by parent)
  void showNotification;

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
            leaveRoom();
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
            className={bottomSheetBackdropClass(qrSheetOpen, 'z-120')}
            onClick={closeQrModal}
            role="presentation"
          >
            <div
              className={bottomSheetPanelClass(qrSheetOpen, 'p-6 flex flex-col items-center gap-5')}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex justify-center w-full">
                <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
              </div>
              <div className="bg-(--ui-surface) p-6 rounded-2xl border border-(--ui-border) w-full flex justify-center">
                <img
                  src={qrCodeData}
                  alt="QR"
                  className="w-[min(80vw,320px)] h-[min(80vw,320px)] max-w-full rounded-xl"
                />
              </div>
              <p className="text-(--ui-fg) text-[10px] uppercase tracking-[0.5em] font-bold text-center px-2">
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
              <div className="bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] rounded-2xl p-6 text-center animate-shake">
                <p className="text-(--ui-danger) font-sans text-sm mb-2 font-bold uppercase tracking-wider">
                  {t.connectionFailed}
                </p>
                <p className="text-(--ui-fg-muted) text-xs">
                  {t.roomNotFound.replace('{0}', roomCode)}
                </p>
                <button
                  type="button"
                  onClick={() => setGameState(GameState.JOIN_INPUT)}
                  className="mt-4 px-6 py-2 bg-[color-mix(in_srgb,var(--ui-danger)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_35%,transparent)] rounded-xl text-(--ui-danger) text-xs uppercase tracking-wider transition-colors"
                >
                  {t.tryAgain}
                </button>
              </div>
            ) : connectionError ? (
              <div className="bg-[color-mix(in_srgb,var(--ui-warning)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-warning)_30%,transparent)] rounded-2xl p-6 text-center">
                <p className="text-(--ui-warning) font-sans text-sm mb-2 font-bold uppercase tracking-wider">
                  {t.connectionFailed}
                </p>
                <p className="text-(--ui-fg-muted) text-xs">{connectionError}</p>
                <button
                  type="button"
                  onClick={() => setGameState(GameState.JOIN_INPUT)}
                  className="mt-4 px-6 py-2 bg-[color-mix(in_srgb,var(--ui-warning)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-warning)_28%,transparent)] border border-[color-mix(in_srgb,var(--ui-warning)_35%,transparent)] rounded-xl text-(--ui-warning) text-xs uppercase tracking-wider transition-colors"
                >
                  {t.tryAgain}
                </button>
              </div>
            ) : (
              <div className="bg-(--ui-surface) border border-(--ui-border) rounded-2xl p-6 text-center">
                <p className="text-(--ui-fg-muted) text-sm">{t.lostServerConnection}</p>
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
                className="p-4 rounded-3xl inline-block shadow-2xl bg-(--ui-card) ring-1 ring-(--ui-border) transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
              >
                <img src={qrCodeData} alt="QR" className="w-32 h-32 rounded-lg" />
              </div>
              <p
                className={`text-[8px] uppercase tracking-[0.5em] font-bold ${currentTheme.textSecondary}`}
              >
                {t.roomCode}
              </p>
              <div className={`text-4xl font-serif tracking-[0.2em] ${currentTheme.textMain}`}>
                {roomCode}
              </div>

              {settings.general.customDeckCode && (
                <div className="mt-1 mx-auto max-w-xs rounded-2xl border border-(--ui-border) bg-(--ui-surface) px-4 py-3 text-left">
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
                      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border max-w-[220px] truncate ${'border-(--ui-border) text-(--ui-fg-muted) bg-(--ui-surface)'}`}
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
                    } ${
                      !online
                        ? 'opacity-75 border-[color-mix(in_srgb,var(--ui-warning)_35%,transparent)]'
                        : ''
                    }`}
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
                          className="p-1.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--ui-danger)_16%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] transition-colors group"
                          title={t.kickPlayerTitle}
                        >
                          <X
                            size={14}
                            className="text-(--ui-danger) opacity-80 group-hover:opacity-100"
                          />
                        </button>
                      )}
                      {isHost && gameMode === 'OFFLINE' && !p.isHost && (
                        <button
                          type="button"
                          onClick={() => removeOfflinePlayer(p.id)}
                          className="p-1.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--ui-danger)_16%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] transition-colors group"
                        >
                          <Minus
                            size={14}
                            className="text-(--ui-danger) opacity-80 group-hover:opacity-100"
                          />
                        </button>
                      )}
                      {gameMode === 'ONLINE' && online && (
                        <div
                          className="w-3.5 h-3.5 rounded-full bg-(--ui-success) shadow-[0_0_6px_color-mix(in_srgb,var(--ui-success)_60%,transparent)]"
                          title={t.playerOnlineHint}
                        />
                      )}
                      {gameMode === 'ONLINE' && !online && (
                        <div
                          className="w-3.5 h-3.5 rounded-full bg-(--ui-warning) shadow-[0_0_6px_color-mix(in_srgb,var(--ui-warning)_60%,transparent)] animate-pulse"
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
              <div
                className={bottomSheetBackdropClass(addPlayerSheetOpen, 'z-100')}
                onClick={closeAddPlayerModal}
                role="presentation"
              >
                <div
                  className={`relative ${bottomSheetPanelClass(addPlayerSheetOpen, 'p-8 pt-10')}`}
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                >
                  <button
                    type="button"
                    onClick={closeAddPlayerModal}
                    className="absolute top-6 right-6 opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <X size={24} className={currentTheme.iconColor} />
                  </button>
                  <div className="flex justify-center mb-4">
                    <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
                  </div>
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
                          closeAddPlayerModal();
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
