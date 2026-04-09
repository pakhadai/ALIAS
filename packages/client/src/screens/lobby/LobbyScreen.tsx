import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Settings as SettingsIcon, Loader2, Lock, Unlock } from 'lucide-react';
import { Button } from '../../components/Button';
import {
  ConfirmationModal,
  bottomSheetBackdropClass,
  bottomSheetPanelClass,
} from '../../components/Shared';
import { GameState, GameMode } from '../../types';
import type { RoomErrorCode } from '../../types';
import { useGame } from '../../context/GameContext';
import { AVATARS } from '../../utils/avatars';
import { useT } from '../../hooks/useT';
import { MAX_PLAYERS, TEAM_COLORS, TEAM_NAMES } from '../../constants';
import QRCode from 'qrcode';
import type { Player } from '../../types';
import { AssignPlayerSheet } from './components/AssignPlayerSheet';
import { PlayersSection } from './components/PlayersSection';
import { TeamCard } from './components/TeamCard';
import { UnassignedPool } from './components/UnassignedPool';
import { OnlineLobbyIntro } from './components/OnlineLobbyIntro';

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
    teams,
    teamsLocked,
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
  const isSolo = (settings.general.teamMode ?? 'TEAMS') === 'SOLO';
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addPlayerSheetOpen, setAddPlayerSheetOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSheetOpen, setQrSheetOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState(AVATARS[0]);
  const [kickMenuPlayerId, setKickMenuPlayerId] = useState<string | null>(null);
  const [recentlyJoinedIds, setRecentlyJoinedIds] = useState<Set<string>>(new Set());
  const [showAssignPlayer, setShowAssignPlayer] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Player | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [showShuffleAllConfirm, setShowShuffleAllConfirm] = useState(false);

  const joinUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomCode}`;
  const prevPlayerIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (gameMode === 'ONLINE' && roomCode) {
      QRCode.toDataURL(joinUrl, { margin: 1 }).then(setQrCodeData).catch(console.error);
    }
  }, [joinUrl, gameMode, roomCode]);

  useEffect(() => {
    const prev = new Set(prevPlayerIdsRef.current);
    const current = players.map((p) => p.id);
    prevPlayerIdsRef.current = current;
    const additions = current.filter((id) => !prev.has(id));
    if (additions.length === 0) return;
    setRecentlyJoinedIds((s) => {
      const next = new Set(s);
      additions.forEach((id) => next.add(id));
      return next;
    });
    const t = setTimeout(() => {
      setRecentlyJoinedIds((s) => {
        const next = new Set(s);
        additions.forEach((id) => next.delete(id));
        return next;
      });
    }, 900);
    return () => clearTimeout(t);
  }, [players]);

  const closeAssignSheet = () => {
    setShowAssignPlayer(false);
    setAssignTarget(null);
  };

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

  // Defensive: if we reach the cap while the modal is open, close it.
  useEffect(() => {
    if (!showAddPlayer) return;
    if (gameMode !== 'OFFLINE') return;
    if (players.length < MAX_PLAYERS) return;
    showNotification(`Ліміт гравців: ${MAX_PLAYERS}`, 'error');
    setShowAddPlayer(false);
  }, [showAddPlayer, players.length, gameMode, showNotification]);

  const closeQrModal = () => {
    setQrSheetOpen(false);
    setTimeout(() => setShowQrModal(false), 280);
  };

  const closeAddPlayerModal = () => {
    setAddPlayerSheetOpen(false);
    setTimeout(() => setShowAddPlayer(false), 280);
  };

  const canAddOfflinePlayer = isHost && gameMode === 'OFFLINE' && players.length < MAX_PLAYERS;
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

  const modeLabel =
    (settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.CLASSIC
      ? (t.gameModeClassic ?? 'Classic')
      : (settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.TRANSLATION
        ? (t.gameModeTranslation ?? 'Translation')
        : (settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.SYNONYMS
          ? (t.gameModeSynonyms ?? 'Synonyms')
          : (settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.QUIZ
            ? (t.gameModeQuiz ?? 'Quiz')
            : (settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.HARDCORE
              ? (t.gameModeHardcore ?? 'Hardcore')
              : (settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.IMPOSTER
                ? (t.gameModeImposter ?? 'Imposter')
                : '—';

  const shareJoinLink = async () => {
    if (!roomCode) return;
    const title = t.lobby ?? 'Lobby';
    const text = `${t.roomCode}: ${roomCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: joinUrl });
        return;
      }
    } catch {
      // ignore share cancellation / errors
    }
    try {
      await navigator.clipboard.writeText(joinUrl);
      showNotification(t.linkCopied ?? 'Посилання скопійовано', 'success');
    } catch {
      showNotification(t.copyFailed ?? 'Не вдалося скопіювати', 'error');
    }
  };

  const teamShells = useMemo(() => {
    if (isSolo) return [];
    const desiredCount = Math.max(2, Math.min(settings.general.teamCount, 8));
    if (teams.length === desiredCount) return teams;
    const names = TEAM_NAMES[settings.general.language] ?? TEAM_NAMES.EN;
    return Array.from({ length: desiredCount }, (_, i) => ({
      id: `team-${i}`,
      name: names[i % names.length] ?? `Team ${i + 1}`,
      score: 0,
      color: TEAM_COLORS[i % TEAM_COLORS.length].class,
      colorHex: TEAM_COLORS[i % TEAM_COLORS.length].hex,
      players: teams[i]?.players ?? [],
      nextPlayerIndex: 0,
    }));
  }, [isSolo, settings.general.language, settings.general.teamCount, teams]);

  const assignedPlayerIds = useMemo(() => {
    const s = new Set<string>();
    teamShells.forEach((t) => t.players.forEach((p) => s.add(p.id)));
    return s;
  }, [teamShells]);
  const unassigned = useMemo(
    () => players.filter((p) => !assignedPlayerIds.has(p.id)),
    [players, assignedPlayerIds]
  );

  const myTeamId = useMemo(() => {
    if (!myPlayerId) return null;
    for (const t of teamShells) {
      if (t.players.some((p) => p.id === myPlayerId)) return t.id;
    }
    return null;
  }, [myPlayerId, teamShells]);

  const canSelfSwitch = !teamsLocked || isHost || gameMode === 'OFFLINE';
  const canHostAssignOffline = isHost && gameMode === 'OFFLINE';

  const startValidation = useMemo(() => {
    if (!isHost) return { ok: false, reason: '' };
    if (players.length < 2) return { ok: false, reason: 'Потрібно мінімум 2 гравці' };
    if (isSolo) return { ok: true, reason: '' };
    if (unassigned.length > 0) return { ok: false, reason: 'Розподіліть усіх гравців по командах' };
    if (teamShells.some((t) => t.players.length === 0))
      return { ok: false, reason: 'У кожній команді має бути гравець' };
    return { ok: true, reason: '' };
  }, [isHost, isSolo, players.length, teamShells, unassigned.length]);

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

        <ConfirmationModal
          isOpen={showShuffleAllConfirm}
          title="Перемішати всіх?"
          message="Це перерозподілить усіх гравців по командах заново."
          isDanger
          theme={currentTheme}
          onCancel={() => setShowShuffleAllConfirm(false)}
          onConfirm={() => {
            setShowShuffleAllConfirm(false);
            sendAction({ action: 'TEAM_SHUFFLE_ALL' });
          }}
          confirmText="Так, перемішати"
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
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
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
            aria-label={t.confirmExit ?? 'Exit'}
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
              aria-label={t.settings ?? 'Settings'}
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
          {gameMode === 'ONLINE' && (
            <OnlineLobbyIntro
              theme={currentTheme}
              t={t}
              roomCode={roomCode}
              settings={settings}
              modeLabel={modeLabel}
              categoriesPreview={categoriesPreview}
              qrCodeData={qrCodeData}
              isHost={isHost}
              onShare={() => void shareJoinLink()}
              onShowQr={() => (qrCodeData ? setShowQrModal(true) : null)}
              onOpenSettings={() => setGameState(GameState.SETTINGS)}
            />
          )}

          <PlayersSection
            theme={currentTheme}
            t={t}
            players={players}
            gameMode={gameMode}
            isHost={isHost}
            myPlayerId={myPlayerId}
            recentlyJoinedIds={recentlyJoinedIds}
            kickMenuPlayerId={kickMenuPlayerId}
            setKickMenuPlayerId={setKickMenuPlayerId}
            onKick={(p) => setKickTarget(p)}
            onRemoveOffline={(id) => removeOfflinePlayer(id)}
            canAddOfflinePlayer={canAddOfflinePlayer}
            onAddOfflineClick={() => {
              if (!canAddOfflinePlayer) {
                showNotification(`Ліміт гравців: ${MAX_PLAYERS}`, 'error');
                return;
              }
              setNewPlayerName('');
              setNewPlayerAvatar(AVATARS[(players.length + 1) % AVATARS.length]);
              setShowAddPlayer(true);
            }}
          />

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
                {players.length >= MAX_PLAYERS && (
                  <div className="mb-6 rounded-2xl border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--ui-danger)_10%,transparent)] p-4 text-center">
                    <p className="text-(--ui-danger) text-xs font-bold uppercase tracking-widest">
                      Ліміт гравців досягнуто
                    </p>
                    <p className="text-[11px] text-(--ui-fg-muted) mt-2">
                      Максимум: {MAX_PLAYERS}. Видаліть когось, щоб додати нового гравця.
                    </p>
                  </div>
                )}
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
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setNewPlayerAvatar(a)}
                        className={`shrink-0 text-2xl p-2 rounded-xl transition-all ${
                          newPlayerAvatar === a
                            ? 'bg-[color-mix(in_srgb,var(--ui-accent)_18%,transparent)] scale-110 shadow-lg'
                            : 'hover:bg-(--ui-surface-hover) opacity-60 hover:opacity-100'
                        }`}
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
                      if (players.length >= MAX_PLAYERS) {
                        showNotification(`Ліміт гравців: ${MAX_PLAYERS}`, 'error');
                        return;
                      }
                      const name = newPlayerName.trim();
                      if (name) {
                        addOfflinePlayer(name, newPlayerAvatar);
                        closeAddPlayerModal();
                      }
                    }}
                    disabled={!newPlayerName.trim() || players.length >= MAX_PLAYERS}
                  >
                    {t.add}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isSolo && (
            <div className="w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`font-serif text-xl ${currentTheme.textMain}`}>{t.teams}</h3>
                {isHost && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => sendAction({ action: 'TEAM_SHUFFLE_UNASSIGNED' })}
                      className="px-3 py-2 rounded-xl border border-(--ui-border) bg-(--ui-surface) hover:bg-(--ui-surface-hover) text-[9px] uppercase tracking-widest font-bold text-(--ui-fg-muted) transition-all active:scale-[0.98]"
                      disabled={players.length < 2}
                    >
                      {t.shuffle}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowShuffleAllConfirm(true)}
                      className="px-3 py-2 rounded-xl border border-(--ui-border) bg-(--ui-surface) hover:bg-(--ui-surface-hover) text-[9px] uppercase tracking-widest font-bold text-(--ui-fg-muted) transition-all active:scale-[0.98]"
                      disabled={players.length < 2}
                    >
                      Shuffle all
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        sendAction({ action: 'TEAM_LOCK', data: { locked: !teamsLocked } })
                      }
                      className="p-2 rounded-xl border border-(--ui-border) bg-(--ui-surface) hover:bg-(--ui-surface-hover) transition-all active:scale-[0.98]"
                      aria-label={teamsLocked ? 'Unlock teams' : 'Lock teams'}
                      title={teamsLocked ? 'Unlock' : 'Lock'}
                    >
                      {teamsLocked ? (
                        <Lock size={16} className={`${currentTheme.iconColor} opacity-70`} />
                      ) : (
                        <Unlock size={16} className={`${currentTheme.iconColor} opacity-70`} />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <UnassignedPool
                unassigned={unassigned}
                canHostAssignOffline={canHostAssignOffline}
                onPick={(p) => {
                  setAssignTarget(p);
                  setShowAssignPlayer(true);
                }}
              />

              <div className="space-y-3">
                {teamShells.map((team) => {
                  const isMine = myTeamId === team.id;
                  const joinDisabled = !canSelfSwitch || (!!teamsLocked && !isHost);
                  return (
                    <TeamCard
                      key={team.id}
                      team={team}
                      teamCount={teamShells.length}
                      playersTotal={players.length}
                      t={t}
                      theme={currentTheme}
                      isHost={isHost}
                      myPlayerId={myPlayerId}
                      isMine={isMine}
                      joinDisabled={joinDisabled}
                      canHostAssignOffline={canHostAssignOffline}
                      onAssignPick={(p) => {
                        setAssignTarget(p);
                        setShowAssignPlayer(true);
                      }}
                      editingTeamId={editingTeamId}
                      teamNameDraft={teamNameDraft}
                      setEditingTeamId={setEditingTeamId}
                      setTeamNameDraft={setTeamNameDraft}
                      sendAction={sendAction}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <footer className="w-full max-w-sm mx-auto py-8">
          {isHost ? (
            <div className="space-y-3">
              {!startValidation.ok && startValidation.reason && (
                <p className="text-center text-[10px] font-sans text-(--ui-fg-muted) opacity-80">
                  {startValidation.reason}
                </p>
              )}
              <Button
                themeClass={currentTheme.button}
                fullWidth
                size="xl"
                onClick={() => sendAction({ action: 'START_GAME' })}
                disabled={!startValidation.ok}
                className={startValidation.ok ? 'animate-pulse' : ''}
              >
                {t.startGame}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 text-center text-[10px] uppercase tracking-widest opacity-60">
              <Loader2 size={16} className={`animate-spin ${currentTheme.iconColor}`} />
              <span className="animate-pulse">{t.waitHost}</span>
            </div>
          )}
        </footer>
      </div>

      <AssignPlayerSheet
        isOpen={showAssignPlayer}
        target={assignTarget}
        teamShells={teamShells}
        t={t}
        onClose={closeAssignSheet}
        sendAction={sendAction}
      />
    </div>
  );
};
