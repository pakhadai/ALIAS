import React, { useState } from 'react';
import {
  ArrowLeft,
  Settings,
  ShoppingBag,
  ChevronRight,
  BookOpen,
  Lock,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { AvatarDisplay } from '../../components/AvatarDisplay';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';

export function ProviderBadge({ provider }: { provider: string }) {
  const label =
    provider === 'google' ? 'GOOGLE' : provider === 'apple' ? 'APPLE' : provider.toUpperCase();
  return (
    <span className="bg-(--ui-accent) text-(--ui-accent-contrast) text-[7px] font-bold tracking-[0.18em] uppercase px-3 py-[3px] rounded-full shadow-md">
      {label}
    </span>
  );
}

export const ProfileScreen = () => {
  const { setGameState, currentTheme } = useGame();
  const { authState, profile, logout } = useAuthContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const isDark = currentTheme.isDark;

  const email = authState.status === 'authenticated' ? authState.email : '';
  const provider = authState.status === 'authenticated' ? authState.provider : '';

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setGameState(GameState.MENU);
  };

  const displayName = profile?.displayName || (email ? email.split('@')[0] : 'Profile');
  const hasCustomPacks =
    profile?.purchases?.some((p) => p.wordPack?.slug === 'feature-custom-packs') ?? false;

  const navBtn = `w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
    isDark
      ? 'bg-(--ui-surface) border border-(--ui-border) hover:bg-(--ui-surface-hover)'
      : 'bg-(--ui-card) border border-(--ui-border) hover:bg-(--ui-surface-hover) shadow-sm'
  }`;
  const navLabel = `font-sans font-bold text-[11px] uppercase tracking-[0.25em] ${currentTheme.textMain}`;

  return (
    <div
      className={`flex flex-col min-h-screen items-center ${currentTheme.bg} transition-colors duration-500`}
    >
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <header
          className="flex items-center px-6 pb-4 md:px-8"
          style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => setGameState(GameState.MENU)}
            className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
          >
            <ArrowLeft size={22} />
          </button>
        </header>

        <div className="flex flex-col items-center pt-4 pb-8 px-6 md:px-8">
          <AvatarDisplay avatarId={profile?.avatarId} size={88} />
          <h1 className={`mt-4 font-serif text-[26px] tracking-wide ${currentTheme.textMain}`}>
            {displayName}
          </h1>
          {email && (
            <p className={`text-[13px] mt-1 mb-3 ${currentTheme.textSecondary}`}>{email}</p>
          )}
          {provider && <ProviderBadge provider={provider} />}
        </div>

        <div className="flex-1 px-6 md:px-8 space-y-3">
          <button
            onClick={() => setGameState(GameState.STORE)}
            className={`${navBtn} ${currentTheme.button}`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag size={16} />
              <span className="font-sans font-bold text-[11px] uppercase tracking-[0.25em]">
                Магазин
              </span>
            </div>
            <ChevronRight size={16} className="opacity-60" />
          </button>

          <button onClick={() => setGameState(GameState.PROFILE_SETTINGS)} className={navBtn}>
            <div className="flex items-center gap-3">
              <Settings size={16} className={currentTheme.iconColor} />
              <span className={navLabel}>Налаштування профілю</span>
            </div>
            <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
          </button>

          <button onClick={() => setGameState(GameState.LOBBY_SETTINGS)} className={navBtn}>
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className={currentTheme.iconColor} />
              <span className={navLabel}>Налаштування лоббі</span>
            </div>
            <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
          </button>

          <button onClick={() => setGameState(GameState.PLAYER_STATS)} className={navBtn}>
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className={currentTheme.iconColor} />
              <span className={navLabel}>Моя статистика</span>
            </div>
            <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
          </button>

          <button onClick={() => setGameState(GameState.MY_WORD_PACKS)} className={navBtn}>
            <div className="flex items-center gap-3">
              <BookOpen
                size={16}
                className={
                  hasCustomPacks ? currentTheme.iconColor : `${currentTheme.iconColor} opacity-40`
                }
              />
              <div className="text-left">
                <span className={`${navLabel} ${hasCustomPacks ? '' : 'opacity-40'}`}>
                  Мої паки слів
                </span>
                {!hasCustomPacks && (
                  <p className="text-[9px] mt-0.5 uppercase tracking-widest text-(--ui-fg-muted)">
                    Потрібна покупка
                  </p>
                )}
              </div>
            </div>
            {hasCustomPacks ? (
              <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
            ) : (
              <Lock size={14} className={`${currentTheme.iconColor} opacity-25`} />
            )}
          </button>

          {profile?.isAdmin && (
            <button onClick={() => (window.location.href = '/admin.html')} className={navBtn}>
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} className="text-(--ui-danger)" />
                <span className={navLabel + ' text-(--ui-danger)'}>Адмін-панель</span>
              </div>
              <ChevronRight size={16} className="text-(--ui-danger) opacity-30" />
            </button>
          )}
        </div>

        <div
          className="px-6 md:px-8 py-6"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-center text-(--ui-danger) font-sans font-bold text-[10px] tracking-[0.3em] uppercase py-3 hover:opacity-70 active:scale-[0.98] transition-all disabled:opacity-30"
          >
            {loggingOut ? <Loader2 size={14} className="animate-spin inline" /> : 'ВИЙТИ З АКАУНТУ'}
          </button>
        </div>
      </div>
    </div>
  );
};
