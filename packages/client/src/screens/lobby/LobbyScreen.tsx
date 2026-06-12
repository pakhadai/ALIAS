import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { FixedBottomBar, ScreenShell, AppHeader } from '../../components/layout';
import { ModalSheet } from '../../components/ModalSheet';
import { ModalSheetTitle } from '../../components/Shared';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { GameState, GameMode } from '../../types';
import type { RoomErrorCode } from '../../types';
import { useGame } from '../../context/GameContext';
import { useLobbyExit } from '../../context/LobbyExitContext';
import { useT } from '../../hooks/useT';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { footerIslandClassName } from '../../constants/footerLayout';
import { typographyClass, systemBannerClass } from '../../constants/typography';
import { buildTeamShells } from '../../utils/buildTeamShells';
import { buildRoomJoinUrl, buildTelegramLobbyInviteUrl } from '../../utils/roomJoin';
import { MAX_PLAYERS } from '../../constants';
import QRCode from 'qrcode';
import type { Player } from '../../types';
import { AssignPlayerSheet } from './components/AssignPlayerSheet';
import { AddOfflinePlayerSheet } from './components/AddOfflinePlayerSheet';
import { LobbyAvatarStrip } from './components/LobbyAvatarStrip';
import { PlayersSection } from './components/PlayersSection';
import { TeamCard } from './components/TeamCard';
import { UnassignedPool } from './components/UnassignedPool';
import { OnlineLobbyIntro } from './components/OnlineLobbyIntro';
import { LobbyRulesSummaryCard } from './components/LobbyRulesSummaryCard';
import { LobbyPlayModeBar } from './components/LobbyPlayModeBar';
import { LobbyPlayModeBarSlot } from './components/LobbyPlayModeBarSlot';
import { LobbyStartPanel } from './components/LobbyStartPanel';
import { LobbyGuestWaitingCard } from './components/LobbyGuestWaitingCard';
import { deriveLobbyReadiness } from './deriveLobbyReadiness';

const MAX_LOBBY_TEAMS = 10;

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
    setTeams,
    setSettings,
  } = useGame();
  const general = settings.general;
  const t = useT();
  const haptic = useHapticFeedback();
  const isSolo = (settings.general.teamMode ?? 'TEAMS') === 'SOLO';

  // Offline: persist trimmed team list when host lowers team count (UI shells already hide extras).
  useEffect(() => {
    if (gameMode !== 'OFFLINE' || !isHost || isSolo) return;
    const desired = Math.max(2, Math.min(general.teamCount, MAX_LOBBY_TEAMS));
    if (teams.length <= desired) return;
    setTeams(teams.slice(0, desired).map((t) => ({ ...t, players: [...t.players] })));
  }, [gameMode, isHost, isSolo, general.teamCount, teams, setTeams]);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { registerLobbyExitHandler } = useLobbyExit();
  const openExitConfirmRef = useRef<() => void>(() => {});

  const openExitConfirm = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  openExitConfirmRef.current = openExitConfirm;

  useLayoutEffect(() => {
    registerLobbyExitHandler(() => openExitConfirmRef.current());
    return () => registerLobbyExitHandler(null);
  }, [registerLobbyExitHandler]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [kickMenuPlayerId, setKickMenuPlayerId] = useState<string | null>(null);
  const [recentlyJoinedIds, setRecentlyJoinedIds] = useState<Set<string>>(new Set());
  const [showAssignPlayer, setShowAssignPlayer] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Player | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  const userToggledTeamsRef = useRef(false);

  const joinUrl = useMemo(() => (roomCode ? buildRoomJoinUrl(roomCode) : ''), [roomCode]);
  const prevPlayerIdsRef = useRef<string[]>([]);
  const didInitPlayersRef = useRef(false);

  useEffect(() => {
    if (gameMode === 'ONLINE' && roomCode) {
      QRCode.toDataURL(joinUrl, { margin: 1 })
        .then(setQrCodeData)
        .catch(() => {
          setQrCodeData('');
          showNotification(t.lobbyQrGenerateFailed, 'error');
        });
    }
  }, [joinUrl, gameMode, roomCode, showNotification, t.lobbyQrGenerateFailed]);

  useEffect(() => {
    const prev = new Set(prevPlayerIdsRef.current);
    const current = players.map((p) => p.id);
    prevPlayerIdsRef.current = current;
    if (!didInitPlayersRef.current) {
      didInitPlayersRef.current = true;
      return;
    }
    const additions = current.filter((id) => !prev.has(id));
    if (additions.length === 0) return;
    haptic.notificationOccurred('success');
    vibrate(HAPTIC.lobbyPlayerJoin);
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
  }, [players, haptic]);

  const closeAssignSheet = () => {
    setShowAssignPlayer(false);
    setAssignTarget(null);
  };

  // Defensive: if we reach the cap while the modal is open, close it.
  useEffect(() => {
    if (!showAddPlayer) return;
    if (gameMode !== 'OFFLINE') return;
    if (players.length < MAX_PLAYERS) return;
    showNotification(t.playerLimitReached.replace('{0}', String(MAX_PLAYERS)), 'error');
    setShowAddPlayer(false);
  }, [showAddPlayer, players.length, gameMode, showNotification, t.playerLimitReached]);

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
      showNotification(t.linkCopied, 'success');
    } catch {
      showNotification(t.copyFailed, 'error');
    }
  };

  const inviteFriendsViaTelegram = () => {
    if (!roomCode) return;

    const appLink = (import.meta.env.VITE_TG_APP_LINK as string | undefined) ?? '';
    if (!appLink) {
      showNotification(t.tgAppLinkNotConfigured, 'error');
      return;
    }

    const shareUrl = buildTelegramLobbyInviteUrl(appLink, roomCode);

    const text = t.lobbyInviteTelegramText;
    const tgShareUrl =
      'https://t.me/share/url?url=' +
      encodeURIComponent(shareUrl) +
      '&text=' +
      encodeURIComponent(text);

    const tg = window.Telegram?.WebApp as unknown as
      | { openTelegramLink?: (url: string) => void }
      | undefined;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tgShareUrl);
      return;
    }

    window.open(tgShareUrl, '_blank', 'noopener,noreferrer');
  };

  const teamShells = useMemo(() => {
    if (isSolo) return [];
    return buildTeamShells({
      teams,
      teamCount: settings.general.teamCount,
      teamMode: settings.general.teamMode ?? 'TEAMS',
      language: settings.general.language,
      maxTeams: MAX_LOBBY_TEAMS,
    });
  }, [
    isSolo,
    settings.general.language,
    settings.general.teamCount,
    settings.general.teamMode,
    teams,
  ]);

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

  const lobbyReadiness = useMemo(
    () =>
      deriveLobbyReadiness({
        isHost,
        isSolo,
        playersCount: players.length,
        unassignedCount: unassigned.length,
        teamShells,
        labels: {
          lobbyStartMinPlayers: t.lobbyStartMinPlayers,
          lobbyStartUnassigned: t.lobbyStartUnassigned,
          lobbyStartEmptyTeam: t.lobbyStartEmptyTeam,
          lobbyReadinessMinPlayers: t.lobbyReadinessMinPlayers,
          lobbyReadinessAllAssigned: t.lobbyReadinessAllAssigned,
          lobbyReadinessEachTeam: t.lobbyReadinessEachTeam,
        },
      }),
    [
      isHost,
      isSolo,
      players.length,
      teamShells,
      unassigned.length,
      t.lobbyStartMinPlayers,
      t.lobbyStartUnassigned,
      t.lobbyStartEmptyTeam,
      t.lobbyReadinessMinPlayers,
      t.lobbyReadinessAllAssigned,
      t.lobbyReadinessEachTeam,
    ]
  );

  const shouldCollapseTeams = !isSolo && teamShells.length >= 3 && players.length >= 6;

  useEffect(() => {
    if (userToggledTeamsRef.current) return;
    setTeamsExpanded(!shouldCollapseTeams);
  }, [shouldCollapseTeams]);

  const showFullPlayersSection = gameMode === 'OFFLINE';
  const showAvatarStrip = gameMode === 'ONLINE';
  const showGuestWaitingCard = !isHost && gameMode === 'ONLINE';
  const teamGridCols = teamShells.length > 4 ? 'grid-cols-1' : 'grid-cols-2';
  /** Host keeps format controls; guests hide the block after picking a team. */
  const showPlayModeBar = isHost || isSolo || myTeamId == null;

  const handleStartTap = () => {
    if (!lobbyReadiness.ok) {
      haptic.impactOccurred('light');
      vibrate(HAPTIC.lobbyTap);
      if (lobbyReadiness.firstBlockingReason) {
        showNotification(lobbyReadiness.firstBlockingReason, 'error');
      }
      return;
    }
    haptic.impactOccurred('medium');
    vibrate(HAPTIC.lobbyStart);
    sendAction({ action: 'START_GAME' });
  };

  return (
    <>
      <ScreenShell
        className="bg-ui-bg"
        layout="fullPx4"
        contentClassName="items-center no-scrollbar"
        headerFixed
        footerFixed
        header={
          <AppHeader
            fixed
            data-testid="lobby-app-header"
            title={<ScreenTitle>{t.lobby}</ScreenTitle>}
            onBack={openExitConfirm}
            backAriaLabel={t.confirmExit ?? 'Exit'}
          />
        }
        footer={
          <FixedBottomBar island contentClassName={footerIslandClassName('narrow')}>
            {isHost ? (
              <LobbyStartPanel
                readiness={lobbyReadiness}
                t={t}
                theme={currentTheme}
                onStartTap={handleStartTap}
              />
            ) : (
              <div
                className={`flex items-center justify-center gap-2 px-4 py-3 text-center ${typographyClass.body} font-sans text-ui-fg-muted`}
              >
                <Loader2 size={14} className={`animate-spin shrink-0 ${currentTheme.iconColor}`} />
                <span>{t.lobbyGuestWaitingFooter}</span>
              </div>
            )}
          </FixedBottomBar>
        }
      >
        <div className="max-w-2xl w-full flex flex-col">
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

          <ModalSheet
            open={showQrModal}
            onClose={() => setShowQrModal(false)}
            zLayer="modalNested"
            size="compact"
            backdropPosition="fixed"
            contentClassName="flex flex-col items-center gap-4"
            ariaLabelledBy="qr-modal-title"
            header={
              <ModalSheetTitle id="qr-modal-title">
                {t.scanToJoin ?? 'Відскануйте для приєднання'}
              </ModalSheetTitle>
            }
          >
            <div className="bg-ui-surface p-4 rounded-2xl border border-ui-border w-[min(72vw,240px)] aspect-square shrink-0 flex items-center justify-center">
              {qrCodeData ? (
                <img
                  src={qrCodeData}
                  alt=""
                  width={208}
                  height={208}
                  decoding="async"
                  className="w-[208px] h-[208px] max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <Loader2
                  size={32}
                  className={`animate-spin ${currentTheme.iconColor} text-ui-fg-muted`}
                />
              )}
            </div>
          </ModalSheet>

          {/* Guest online: room gone vs relay/other errors vs plain disconnect */}
          {!isHost && gameMode === 'ONLINE' && !isConnected && !isReconnecting && (
            <div className="w-full max-w-sm mx-auto mb-6 space-y-3">
              {isRoomUnavailableError(connectionErrorCode) ? (
                <div className="bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] rounded-2xl p-6 text-center animate-shake">
                  <p className={`${systemBannerClass} font-sans mb-2 text-ui-danger`}>
                    {t.connectionFailed}
                  </p>
                  <p className={`${typographyClass.body} text-ui-fg-muted`}>
                    {t.roomNotFound.replace('{0}', roomCode)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setGameState(GameState.JOIN_INPUT)}
                    className={`mt-4 px-6 py-2 bg-[color-mix(in_srgb,var(--ui-danger)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_35%,transparent)] rounded-xl text-ui-danger ${typographyClass.label} tracking-wider transition-all duration-200 active:scale-[0.98]`}
                  >
                    {t.tryAgain}
                  </button>
                </div>
              ) : connectionError ? (
                <div className="bg-[color-mix(in_srgb,var(--ui-warning)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-warning)_30%,transparent)] rounded-2xl p-6 text-center">
                  <p className={`${systemBannerClass} font-sans mb-2 text-ui-warning`}>
                    {t.connectionFailed}
                  </p>
                  <p className={`${typographyClass.body} text-ui-fg-muted`}>{connectionError}</p>
                  <button
                    type="button"
                    onClick={() => setGameState(GameState.JOIN_INPUT)}
                    className={`mt-4 px-6 py-2 bg-[color-mix(in_srgb,var(--ui-warning)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-warning)_28%,transparent)] border border-[color-mix(in_srgb,var(--ui-warning)_35%,transparent)] rounded-xl text-ui-warning ${typographyClass.label} tracking-wider transition-all duration-200 active:scale-[0.98]`}
                  >
                    {t.tryAgain}
                  </button>
                </div>
              ) : (
                <div className="bg-ui-surface border border-ui-border rounded-2xl p-6 text-center">
                  <p className={`${typographyClass.body} text-ui-fg-muted`}>
                    {t.lostServerConnection}
                  </p>
                </div>
              )}
            </div>
          )}

          <main className="flex flex-col items-center space-y-6 w-full">
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
                onShareLink={() => void shareJoinLink()}
                onInviteTelegram={inviteFriendsViaTelegram}
                onShowQr={() => setShowQrModal(true)}
                onOpenSettings={() => setGameState(GameState.SETTINGS)}
              />
            )}

            {gameMode === 'OFFLINE' && (
              <LobbyRulesSummaryCard
                theme={currentTheme}
                t={t}
                settings={settings}
                modeLabel={modeLabel}
                categoriesPreview={categoriesPreview}
                isHost={isHost}
                onOpenSettings={isHost ? () => setGameState(GameState.SETTINGS) : undefined}
              />
            )}

            <LobbyPlayModeBarSlot open={showPlayModeBar}>
              <LobbyPlayModeBar
                theme={currentTheme}
                t={t}
                isHost={isHost}
                isSolo={isSolo}
                teamCount={settings.general.teamCount}
                onTeamModeChange={(mode) => {
                  haptic.selectionChanged();
                  setSettings((prev) => ({
                    ...prev,
                    general: { ...prev.general, teamMode: mode },
                  }));
                }}
                onTeamCountChange={(count) => {
                  haptic.selectionChanged();
                  setSettings((prev) => ({
                    ...prev,
                    general: { ...prev.general, teamCount: count },
                  }));
                }}
                onShuffleUnassigned={() => sendAction({ action: 'TEAM_SHUFFLE_UNASSIGNED' })}
                shuffleDisabled={isSolo || players.length < 2}
              />
            </LobbyPlayModeBarSlot>

            {showFullPlayersSection && (
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
                    showNotification(
                      t.playerLimitReached.replace('{0}', String(MAX_PLAYERS)),
                      'error'
                    );
                    return;
                  }
                  setShowAddPlayer(true);
                }}
              />
            )}

            {showAvatarStrip && (
              <LobbyAvatarStrip
                theme={currentTheme}
                t={t}
                players={players}
                isHost={isHost}
                myPlayerId={myPlayerId}
                recentlyJoinedIds={recentlyJoinedIds}
                kickMenuPlayerId={kickMenuPlayerId}
                setKickMenuPlayerId={setKickMenuPlayerId}
                onKick={(p) => setKickTarget(p)}
              />
            )}

            {showGuestWaitingCard && (
              <LobbyGuestWaitingCard
                theme={currentTheme}
                t={t}
                playersCount={players.length}
                isSolo={isSolo}
                myTeamId={myTeamId}
              />
            )}

            {!isSolo && (
              <div className="w-full max-w-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <ScreenTitle as="h3">{t.teams}</ScreenTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isHost && gameMode === 'OFFLINE' && (
                      <button
                        type="button"
                        onClick={() => setGameState(GameState.TEAMS)}
                        className={`px-2.5 py-1.5 rounded-xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover ${typographyClass.label} font-sans normal-case text-ui-fg-muted transition-all active:scale-[0.98]`}
                      >
                        {t.lobbyConfigureTeams} →
                      </button>
                    )}
                    {isHost && (
                      <button
                        type="button"
                        onClick={() =>
                          sendAction({ action: 'TEAM_LOCK', data: { locked: !teamsLocked } })
                        }
                        className="min-h-9 min-w-9 flex items-center justify-center rounded-xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.98]"
                        aria-label={teamsLocked ? t.unlockTeams : t.lockTeams}
                        title={teamsLocked ? t.unlockTeams : t.lockTeams}
                      >
                        {teamsLocked ? (
                          <Lock
                            size={15}
                            className={`${currentTheme.iconColor} text-ui-fg-muted`}
                          />
                        ) : (
                          <Unlock
                            size={15}
                            className={`${currentTheme.iconColor} text-ui-fg-muted`}
                          />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {shouldCollapseTeams && (
                  <button
                    type="button"
                    onClick={() => {
                      userToggledTeamsRef.current = true;
                      setTeamsExpanded((v) => !v);
                    }}
                    className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover ${typographyClass.label} font-sans normal-case text-ui-fg-muted transition-all active:scale-[0.98]`}
                    data-testid="lobby-teams-toggle"
                  >
                    {teamsExpanded ? (
                      <>
                        <ChevronUp size={14} aria-hidden />
                        {t.lobbyHideTeams}
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} aria-hidden />
                        {t.lobbyShowTeams}
                      </>
                    )}
                  </button>
                )}

                {teamsExpanded ? (
                  <>
                    <UnassignedPool
                      unassigned={unassigned}
                      canHostAssignOffline={canHostAssignOffline}
                      onPick={(p) => {
                        setAssignTarget(p);
                        setShowAssignPlayer(true);
                      }}
                      t={t}
                    />

                    <div className={`grid ${teamGridCols} gap-3`}>
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
                  </>
                ) : null}
              </div>
            )}
          </main>
        </div>

        <AssignPlayerSheet
          isOpen={showAssignPlayer}
          target={assignTarget}
          teamShells={teamShells}
          t={t}
          onClose={closeAssignSheet}
          sendAction={sendAction}
        />

        {showAddPlayer && (
          <AddOfflinePlayerSheet
            playersCount={players.length}
            theme={currentTheme}
            t={t}
            onClose={() => setShowAddPlayer(false)}
            addOfflinePlayer={addOfflinePlayer}
            showNotification={showNotification}
          />
        )}
      </ScreenShell>
      <ConfirmationModal
        isOpen={showExitConfirm}
        title={t.leaveLobbyConfirm}
        message={t.leaveLobbyMsg}
        isDanger
        theme={currentTheme}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          leaveRoom(gameMode === 'OFFLINE' ? { resetGameMode: false } : undefined);
          setShowExitConfirm(false);
        }}
        confirmText={t.confirmExit}
        cancelText={t.goBack}
      />
    </>
  );
};
