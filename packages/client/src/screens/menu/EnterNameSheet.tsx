import React, { useState, useEffect, useRef } from 'react';
import { useDeferredSheetInputFocus } from '../../hooks/useBottomSheetPresence';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { ModalPortal, ModalSheetTitle, bottomSheetBackdropClass } from '../../components/Shared';
import { ModalSheet } from '../../components/ModalSheet';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../hooks/useT';
import { AVATARS } from '../../utils/avatars';
import { zIndex } from '../../constants/zIndex';
import { typographyClass } from '../../constants/typography';
import {
  canSkipNamePrompt,
  resolvePlayerAvatarFromProfile,
  resolvePlayerNameFromProfile,
} from '../../utils/profilePlayerName';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/** Name + avatar sheet over menu canvas — mount when `GameState.ENTER_NAME`. */
export function EnterNameSheet(): React.ReactNode {
  const { setGameState, currentTheme, handleJoin, gameMode, leaveRoom } = useGame();
  const { authState, profile } = useAuthContext();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0] ?? '🙂');
  const [isEntering, setIsEntering] = useState(false);
  const [open, setOpen] = useState(true);
  const t = useT();
  const stableId = useRef(`player-${generateUUID()}`);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useDeferredSheetInputFocus(nameInputRef, open);
  /** Prevents repeated auto-join while deps refetch (e.g. profile) without leaving the sheet. */
  const autoJoinAttemptedRef = useRef(false);

  const finishDismiss = () => {
    if (gameMode === 'OFFLINE') leaveRoom({ resetGameMode: false });
    else setGameState(GameState.MENU);
  };

  const requestClose = () => {
    if (isEntering) return;
    setOpen(false);
  };

  useEffect(() => {
    const resolvedName = profile ? resolvePlayerNameFromProfile(profile) : '';
    const shouldAutoJoin = canSkipNamePrompt(authState, profile);

    if (shouldAutoJoin && profile && resolvedName) {
      if (autoJoinAttemptedRef.current) return undefined;
      autoJoinAttemptedRef.current = true;
      let cancelled = false;
      const { emoji: avatarEmoji, avatarId, avatarUrl } = resolvePlayerAvatarFromProfile(profile);
      setIsEntering(true);
      void (async () => {
        try {
          const ok = await handleJoin(
            stableId.current,
            resolvedName,
            avatarEmoji,
            avatarId,
            gameMode,
            avatarUrl
          );
          if (!cancelled && ok) {
            if (gameMode !== 'OFFLINE') setGameState(GameState.LOBBY);
          }
        } finally {
          if (!cancelled) setIsEntering(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (resolvedName) setName(resolvedName);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avatarId omitted on purpose
  }, [
    authState.status,
    profile?.displayName,
    profile?.name,
    profile?.email,
    profile?.skipNamePrompt,
    profile?.authProvider,
    gameMode,
  ]);

  const handleSubmit = async () => {
    if (isEntering) return;
    const sanitized = name.replace(/<[^>]*>/g, '').slice(0, 20);
    if (!sanitized.trim()) return;
    setIsEntering(true);
    try {
      const ok = await handleJoin(stableId.current, sanitized.trim(), avatar, undefined, gameMode);
      if (ok && gameMode !== 'OFFLINE') setGameState(GameState.LOBBY);
    } finally {
      setIsEntering(false);
    }
  };

  return (
    <div aria-busy={isEntering} data-testid="enter-name-screen" data-game-mode={gameMode}>
      <ModalSheet
        open={open}
        onClose={requestClose}
        onExited={finishDismiss}
        size="default"
        showClose
        closeAriaLabel={t.cancel}
        closeDisabled={isEntering}
        closeIconSize={24}
        ariaLabelledBy="enter-name-title"
        contentClassName="pt-2"
        header={
          <ModalSheetTitle id="enter-name-title" themeClass="text-ui-fg">
            {t.whoAreYou}
          </ModalSheetTitle>
        }
      >
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
            data-testid="enter-name"
            placeholder={t.namePlaceholder}
            className={`w-full bg-ui-surface border border-ui-border text-ui-fg placeholder:text-ui-fg-muted rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-ui-accent focus:border-ui-accent transition-all font-sans font-bold text-center ${typographyClass.bodyInput}`}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={`shrink-0 text-2xl p-2 rounded-xl transition-all ${
                  avatar === a
                    ? 'bg-[color-mix(in_srgb,var(--ui-accent)_18%,transparent)] scale-110 shadow-lg'
                    : 'hover:bg-ui-surface-hover opacity-60 hover:opacity-100'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <Button
            type="submit"
            themeClass={currentTheme.button}
            fullWidth
            size="lg"
            disabled={!name.trim() || isEntering}
            data-testid="enter-name-submit"
          >
            {t.next}
          </Button>
        </form>
      </ModalSheet>

      {isEntering ? (
        <ModalPortal>
          <div
            className={bottomSheetBackdropClass(
              zIndex.modalLow,
              'fixed',
              'flex flex-col items-center justify-center gap-5 px-8'
            )}
            role="status"
            aria-live="polite"
          >
            <Loader2 className="w-11 h-11 shrink-0 animate-spin text-ui-accent" aria-hidden />
            <p
              className={`${typographyClass.body} text-ui-fg-muted text-center max-w-[280px] leading-relaxed`}
            >
              {t.enteringRoom}
            </p>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
