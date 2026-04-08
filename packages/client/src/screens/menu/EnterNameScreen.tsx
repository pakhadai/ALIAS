import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Shared';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { TRANSLATIONS } from '../../constants';
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
  const { setGameState, settings, currentTheme, handleJoin, isHost, gameMode, leaveRoom } =
    useGame();
  const { authState, profile } = useAuthContext();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [isEntering, setIsEntering] = useState(false);
  const t = TRANSLATIONS[settings.general.language];

  const stableId = useRef(`player-${generateUUID()}`);

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
      className={`relative flex flex-col min-h-screen ${currentTheme.bg} p-6 md:p-10 justify-center items-center`}
      aria-busy={isEntering}
    >
      <Logo theme={currentTheme} />
      <div
        className={`w-full max-w-2xl mt-12 space-y-10 p-8 md:p-12 rounded-[2.5rem] ${currentTheme.card}`}
      >
        <h2 className={`text-2xl font-serif text-center tracking-wide ${currentTheme.textMain}`}>
          {t.whoAreYou}
        </h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
          placeholder={t.namePlaceholder}
          className="w-full bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) rounded-2xl px-6 py-4 focus:outline-none focus:border-(--ui-accent) transition-all font-sans font-bold text-center text-sm"
        />
        <div className="grid grid-cols-4 gap-4">
          {AVATARS.slice(0, 12).map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`text-3xl p-3 rounded-2xl transition-all ${
                avatar === a
                  ? 'bg-[color-mix(in_srgb,var(--ui-accent)_18%,transparent)] scale-110 shadow-lg'
                  : 'hover:bg-(--ui-surface) opacity-50 hover:opacity-100'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="pt-4 space-y-6">
          <Button
            themeClass={currentTheme.button}
            fullWidth
            size="xl"
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || isEntering}
          >
            {t.next}
          </Button>
          <button
            type="button"
            disabled={isEntering}
            onClick={() => {
              if (gameMode === 'OFFLINE') leaveRoom();
              else setGameState(GameState.MENU);
            }}
            className={`w-full text-center text-[9px] uppercase tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity disabled:opacity-15 disabled:pointer-events-none ${currentTheme.textMain}`}
          >
            {t.cancel}
          </button>
        </div>
      </div>
      {isEntering && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 bg-[color-mix(in_srgb,var(--ui-bg)_90%,transparent)] backdrop-blur-md px-8"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-11 h-11 shrink-0 animate-spin text-(--ui-accent)" aria-hidden />
          <p className="text-sm font-sans text-(--ui-fg-muted) text-center max-w-[280px] leading-relaxed">
            {t.enteringRoom}
          </p>
        </div>
      )}
    </div>
  );
};
