import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Settings,
  ShoppingBag,
  ChevronRight,
  BookOpen,
  Lock,
  ShieldCheck,
  Loader2,
  X,
} from 'lucide-react';
import { AvatarDisplay } from '../../components/AvatarDisplay';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { bottomSheetBackdropClass, bottomSheetPanelClass } from '../../components/Shared';

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const isDark = currentTheme.isDark;
  const { get: getStats } = usePlayerStats();

  const email = authState.status === 'authenticated' ? authState.email : '';
  const provider = authState.status === 'authenticated' ? authState.provider : '';

  useEffect(() => {
    if (showLogoutConfirm) {
      const r = requestAnimationFrame(() => setLogoutConfirmVisible(true));
      return () => cancelAnimationFrame(r);
    }
    setLogoutConfirmVisible(false);
  }, [showLogoutConfirm]);

  const closeLogoutConfirm = () => {
    setLogoutConfirmVisible(false);
    setTimeout(() => setShowLogoutConfirm(false), 280);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setGameState(GameState.MENU);
  };

  const displayName = profile?.displayName || (email ? email.split('@')[0] : 'Profile');
  const hasCustomPacks =
    profile?.purchases?.some((p) => p.wordPack?.slug === 'feature-custom-packs') ?? false;

  const stats = getStats();
  const accuracy =
    stats.wordsGuessed + stats.wordsSkipped > 0
      ? Math.round((stats.wordsGuessed / (stats.wordsGuessed + stats.wordsSkipped)) * 100)
      : 0;

  const navBtn = `w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
    isDark
      ? 'bg-(--ui-surface) border border-(--ui-border) hover:bg-(--ui-surface-hover)'
      : 'bg-(--ui-card) border border-(--ui-border) hover:bg-(--ui-surface-hover) shadow-sm'
  }`;
  const navLabel = `font-sans font-bold text-[11px] uppercase tracking-[0.25em] ${currentTheme.textMain}`;
  const sectionTitle = `text-[9px] font-sans font-bold tracking-[0.28em] uppercase text-(--ui-fg-muted)`;

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

          <button
            type="button"
            onClick={() => setGameState(GameState.PLAYER_STATS)}
            className="mt-6 w-full max-w-md"
          >
            <div className="grid grid-cols-3 gap-3">
              <div
                className={`rounded-2xl px-4 py-4 text-left border border-(--ui-border) ${
                  isDark ? 'bg-(--ui-surface)' : 'bg-(--ui-card) shadow-sm'
                }`}
              >
                <p className="text-[8px] font-sans font-bold uppercase tracking-[0.28em] text-(--ui-fg-muted)">
                  Зіграно
                </p>
                <p className={`mt-1 font-serif text-[20px] ${currentTheme.textMain}`}>
                  {stats.gamesPlayed}
                </p>
              </div>
              <div
                className={`rounded-2xl px-4 py-4 text-left border border-(--ui-border) ${
                  isDark ? 'bg-(--ui-surface)' : 'bg-(--ui-card) shadow-sm'
                }`}
              >
                <p className="text-[8px] font-sans font-bold uppercase tracking-[0.28em] text-(--ui-fg-muted)">
                  Вгадано
                </p>
                <p className={`mt-1 font-serif text-[20px] ${currentTheme.textMain}`}>
                  {stats.wordsGuessed}
                </p>
              </div>
              <div
                className={`rounded-2xl px-4 py-4 text-left border border-(--ui-border) ${
                  isDark ? 'bg-(--ui-surface)' : 'bg-(--ui-card) shadow-sm'
                }`}
              >
                <p className="text-[8px] font-sans font-bold uppercase tracking-[0.28em] text-(--ui-fg-muted)">
                  Вінрейт
                </p>
                <p className={`mt-1 font-serif text-[20px] ${currentTheme.textMain}`}>
                  {accuracy}%
                </p>
              </div>
            </div>
            <p
              className={`mt-3 text-[9px] uppercase tracking-[0.4em] font-bold opacity-40 ${currentTheme.textMain}`}
            >
              Натисніть для деталей
            </p>
          </button>
        </div>

        <div className="flex-1 px-6 md:px-8 space-y-6">
          <div>
            <p className={sectionTitle}>ІГРОВЕ</p>
            <div className="mt-3 space-y-3">
              <button onClick={() => setGameState(GameState.PLAYER_STATS)} className={navBtn}>
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} className={currentTheme.iconColor} />
                  <span className={navLabel}>Моя статистика</span>
                </div>
                <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
              </button>

              <button
                onClick={() =>
                  hasCustomPacks
                    ? setGameState(GameState.MY_WORD_PACKS)
                    : setGameState(GameState.STORE)
                }
                className={navBtn}
              >
                <div className="flex items-center gap-3">
                  <BookOpen
                    size={16}
                    className={
                      hasCustomPacks
                        ? currentTheme.iconColor
                        : 'text-[color-mix(in_srgb,var(--ui-accent)_85%,#ffffff_15%)]'
                    }
                  />
                  <div className="text-left">
                    <span className={navLabel}>
                      {hasCustomPacks ? 'Мої паки слів' : 'Відкрити власні паки'}
                    </span>
                    {!hasCustomPacks && (
                      <p className="text-[9px] mt-0.5 uppercase tracking-widest text-(--ui-fg-muted)">
                        Доступно у магазині
                      </p>
                    )}
                  </div>
                </div>
                {hasCustomPacks ? (
                  <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
                ) : (
                  <Lock
                    size={14}
                    className="text-[color-mix(in_srgb,var(--ui-accent)_85%,#ffffff_15%)]"
                  />
                )}
              </button>
            </div>
          </div>

          <div>
            <p className={sectionTitle}>НАЛАШТУВАННЯ</p>
            <div className="mt-3 space-y-3">
              <button onClick={() => setGameState(GameState.PROFILE_SETTINGS)} className={navBtn}>
                <div className="flex items-center gap-3">
                  <Settings size={16} className={currentTheme.iconColor} />
                  <span className={navLabel}>Налаштування профілю</span>
                </div>
                <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
              </button>

              <button onClick={() => setGameState(GameState.LOBBY_SETTINGS)} className={navBtn}>
                <div className="flex items-center gap-3">
                  <Settings size={16} className={currentTheme.iconColor} />
                  <span className={navLabel}>Налаштування лоббі</span>
                </div>
                <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
              </button>
            </div>
          </div>

          <div>
            <p className={sectionTitle}>ЕКСТРА</p>
            <div className="mt-3 space-y-3">
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
            </div>
          </div>

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
            onClick={() => setShowLogoutConfirm(true)}
            disabled={loggingOut}
            className="w-full text-center text-(--ui-danger) font-sans font-bold text-[10px] tracking-[0.3em] uppercase py-3 hover:opacity-70 active:scale-[0.98] transition-all disabled:opacity-30"
          >
            {loggingOut ? <Loader2 size={14} className="animate-spin inline" /> : 'ВИЙТИ З АКАУНТУ'}
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div
          className={bottomSheetBackdropClass(logoutConfirmVisible, 'z-50')}
          onClick={closeLogoutConfirm}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div
            className={bottomSheetPanelClass(logoutConfirmVisible, 'px-5 pt-5 pb-8 max-w-sm')}
            style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pb-3">
              <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
            </div>
            <div className="flex justify-between items-start mb-4">
              <p
                id="logout-confirm-title"
                className="text-(--ui-fg) text-sm font-sans font-semibold tracking-wide pr-4"
              >
                Ви впевнені, що хочете вийти?
              </p>
              <button
                type="button"
                onClick={closeLogoutConfirm}
                className="text-(--ui-fg-muted) hover:text-(--ui-fg) p-1 shrink-0"
                aria-label="Закрити"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={closeLogoutConfirm}
                className="w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest bg-(--ui-surface) text-(--ui-fg) border border-(--ui-border) hover:bg-(--ui-surface-hover) transition-all active:scale-[0.98]"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest bg-[color-mix(in_srgb,var(--ui-danger)_18%,transparent)] text-(--ui-danger) border border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_24%,transparent)] transition-all active:scale-[0.98] disabled:opacity-40"
              >
                {loggingOut ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Вихід...
                  </span>
                ) : (
                  'Вийти'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
