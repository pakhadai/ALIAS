import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '../../components/Button';
import {
  Logo,
  bottomSheetBackdropClass,
  bottomSheetPanelClass,
  ModalPortal,
} from '../../components/Shared';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../hooks/useT';
import {
  keyboardAvoidingBottomPadding,
  scrollElementIntoViewCentered,
  useVisualViewportBottomInset,
} from '../../hooks/useVisualViewportBottomInset';
import { AVATARS } from '../../utils/avatars';
import { PRESET_AVATARS } from '../../components/AvatarDisplay';

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

export const EnterNameScreen = () => {
  const { setGameState, currentTheme, handleJoin, isHost, gameMode, leaveRoom } = useGame();
  const { authState, profile } = useAuthContext();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [isEntering, setIsEntering] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const t = useT();
  const keyboardBottomInset = useVisualViewportBottomInset();

  const stableId = useRef(`player-${generateUUID()}`);

  useEffect(() => {
    const r = requestAnimationFrame(() => setSheetOpen(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const handleCancel = () => {
    if (isEntering) return;
    if (gameMode === 'OFFLINE') leaveRoom();
    else setGameState(GameState.MENU);
  };

  useEffect(() => {
    const displayName = profile?.displayName;
    const canAutoJoin =
      authState.status === 'authenticated' &&
      Boolean(displayName) &&
      (gameMode === 'OFFLINE' || (gameMode === 'ONLINE' && isHost));

    if (canAutoJoin && profile && displayName) {
      let cancelled = false;
      const nameForServer = displayName;
      const avatarEmoji =
        profile.avatarId != null
          ? (PRESET_AVATARS[parseInt(profile.avatarId, 10)]?.emoji ?? AVATARS[0])
          : AVATARS[0];
      setIsEntering(true);
      void (async () => {
        try {
          const ok = await handleJoin(
            stableId.current,
            nameForServer,
            avatarEmoji,
            profile.avatarId
          );
          if (!cancelled && ok) setGameState(GameState.LOBBY);
        } finally {
          if (!cancelled) setIsEntering(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (profile?.displayName) setName(profile.displayName);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avatarId omitted on purpose
  }, [authState.status, profile?.displayName, gameMode, isHost]);

  const handleSubmit = async () => {
    const sanitized = name.replace(/<[^>]*>/g, '').slice(0, 20);
    if (!sanitized.trim()) return;
    setIsEntering(true);
    try {
      const ok = await handleJoin(stableId.current, sanitized.trim(), avatar);
      if (ok) setGameState(GameState.LOBBY);
    } finally {
      setIsEntering(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col min-h-screen ${currentTheme.bg} overflow-hidden`}
      aria-busy={isEntering}
    >
      <div className="absolute top-0 left-0 right-0 z-60 flex justify-center pointer-events-none pt-safe-top-md px-6">
        <div className="pointer-events-auto scale-90 origin-top opacity-90">
          <Logo theme={currentTheme} />
        </div>
      </div>

      <ModalPortal>
        <div
          className={bottomSheetBackdropClass(sheetOpen, 'z-50')}
          style={keyboardAvoidingBottomPadding(keyboardBottomInset)}
          onClick={handleCancel}
          role="presentation"
        >
          <div
            className={`relative ${bottomSheetPanelClass(sheetOpen, 'p-8 pt-10 pb-safe-bottom')}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enter-name-title"
          >
            <button
              type="button"
              onClick={handleCancel}
              disabled={isEntering}
              className="absolute top-6 right-6 opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20 disabled:pointer-events-none"
              aria-label={t.cancel}
            >
              <X size={24} className={currentTheme.iconColor} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="h-1 w-10 rounded-full bg-ui-border" aria-hidden />
            </div>
            <h2
              id="enter-name-title"
              className={`text-2xl font-serif mb-8 text-center tracking-wide ${currentTheme.textMain}`}
            >
              {t.whoAreYou}
            </h2>
            <div className="space-y-6">
              <input
                autoFocus
                value={name}
                onFocus={(e) => scrollElementIntoViewCentered(e.currentTarget)}
                onChange={(e) => setName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
                data-testid="enter-name"
                placeholder={t.namePlaceholder}
                className="w-full bg-ui-surface border border-ui-border text-ui-fg placeholder:text-ui-fg-muted rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-ui-accent focus:border-ui-accent transition-all font-sans font-bold text-center text-sm"
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
                themeClass={currentTheme.button}
                fullWidth
                size="lg"
                onClick={() => void handleSubmit()}
                disabled={!name.trim() || isEntering}
                data-testid="enter-name-submit"
              >
                {t.next}
              </Button>
              <button
                type="button"
                disabled={isEntering}
                onClick={handleCancel}
                className={`w-full text-center text-[9px] uppercase tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity disabled:opacity-15 disabled:pointer-events-none ${currentTheme.textMain}`}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {isEntering && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-80 flex flex-col items-center justify-center gap-5 bg-[color-mix(in_srgb,var(--ui-bg)_90%,transparent)] backdrop-blur-md px-8"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="w-11 h-11 shrink-0 animate-spin text-ui-accent" aria-hidden />
            <p className="text-sm font-sans text-ui-fg-muted text-center max-w-[280px] leading-relaxed">
              {t.enteringRoom}
            </p>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
