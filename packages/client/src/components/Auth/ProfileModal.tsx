import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Shield } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthContext } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { fetchStore, type StoreData } from '../../services/api';
import { AvatarDisplay } from '../AvatarDisplay';
import { GameState } from '../../types';
import { TRANSLATIONS } from '../../constants';
import { usePlayerStats } from '../../hooks/usePlayerStats';

interface ProfileModalProps {
  onClose: () => void;
}

/** Person silhouette icon */
function AvatarIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="16" r="8" fill="color-mix(in_srgb,var(--ui-fg)_18%,transparent)" />
      <path
        d="M4 40c0-9.94 8.06-18 18-18s18 8.06 18 18"
        stroke="color-mix(in_srgb,var(--ui-fg)_18%,transparent)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { authState, profile, loginWithGoogle, logout } = useAuthContext();
  const { currentTheme, settings, setGameState } = useGame();
  const t = TRANSLATIONS[settings.general.language];
  const { get: getStats } = usePlayerStats();
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [visible, setVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /* ── Mount animation ── */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── Load store (profile comes from context) ── */
  useEffect(() => {
    fetchStore()
      .then(setStoreData)
      .catch(() => {});
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    handleClose();
  };

  const handleGoogleSuccess = async (cred: { credential?: string }) => {
    if (!cred.credential) return;
    await loginWithGoogle(cred.credential);
  };

  const isAnonymous = authState.status === 'anonymous' || authState.status === 'loading';
  const purchases = profile?.purchases ?? [];
  const profileDisplayName = profile?.displayName;
  const displayName =
    profileDisplayName ??
    (isAnonymous
      ? 'Anonymous'
      : authState.status === 'authenticated'
        ? authState.email?.split('@')[0]
        : '');
  const displaySub = isAnonymous
    ? 'Guest User'
    : authState.status === 'authenticated'
      ? authState.email
      : '';
  const badgeLabel = isAnonymous
    ? 'FREE ACCOUNT'
    : authState.status === 'authenticated'
      ? authState.provider?.toUpperCase()
      : '';
  const avatarId = profile?.avatarId ?? null;

  const stats = getStats();
  const statsAccuracy =
    stats.wordsGuessed + stats.wordsSkipped > 0
      ? Math.round((stats.wordsGuessed / (stats.wordsGuessed + stats.wordsSkipped)) * 100)
      : 0;
  const statsSummaryLine = t.profileStatsSummary
    .replace('{0}', String(stats.gamesPlayed))
    .replace('{1}', String(stats.wordsGuessed))
    .replace('{2}', String(stats.wordsSkipped))
    .replace('{3}', String(statsAccuracy));

  const openDetailedStats = () => {
    onClose();
    requestAnimationFrame(() => setGameState(GameState.PLAYER_STATS));
  };

  const showAdminEntry =
    authState.status === 'authenticated' && (authState.isAdmin || (profile?.isAdmin ?? false));

  const openAdminPanel = () => {
    window.open('/admin', '_blank', 'noopener,noreferrer');
  };

  /* ── Benefits (shown to anonymous / no purchases) ── */
  const packCount = storeData?.wordPacks.length ?? 0;
  const themeCount = (storeData?.themes.filter((t) => !t.isFree) ?? []).length;

  const benefits: { emoji: string; label: string; sub: string }[] = [
    {
      emoji: '📝',
      label: 'Custom Word Lists',
      sub: 'Upload your own words — CSV or plain text',
    },
    {
      emoji: '📦',
      label: `${packCount > 0 ? packCount + ' Word Packs' : 'Word Packs'}`,
      sub: 'New topics & languages — constantly growing',
    },
    {
      emoji: '🎨',
      label: `${themeCount > 0 ? themeCount + ' Visual Themes' : 'Visual Themes'}`,
      sub: 'Unique app skins for your style',
    },
    {
      emoji: '📊',
      label: 'Game Statistics',
      sub: 'Track wins, rounds played & top words',
    },
    {
      emoji: '☁️',
      label: 'Sync Across Devices',
      sub: 'Your purchases & decks everywhere',
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300
        ${visible ? 'bg-[color-mix(in_srgb,var(--ui-bg)_78%,transparent)] backdrop-blur-xl animate-fade-in' : 'bg-transparent'}`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-sm mx-auto rounded-t-4xl overflow-hidden
          bg-(--ui-card) border border-(--ui-border) transition-transform duration-300 ease-out
          ${visible ? 'translate-y-0 animate-pop-in' : 'translate-y-full'}`}
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end px-5 pt-5 pb-0">
          <button
            onClick={handleClose}
            className="text-(--ui-fg-muted) hover:text-(--ui-fg) transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar + identity */}
        <div className="flex flex-col items-center pt-2 pb-7 px-6">
          <div className="relative">
            {avatarId != null ? (
              <AvatarDisplay avatarId={avatarId} size={76} />
            ) : (
              <div className="w-[76px] h-[76px] rounded-full bg-(--ui-surface) border border-(--ui-border) flex items-center justify-center">
                <AvatarIcon />
              </div>
            )}
            <span
              className="absolute -bottom-3 left-1/2 -translate-x-1/2
              bg-(--ui-accent) text-(--ui-accent-contrast) text-[7px] font-bold tracking-[0.18em]
              uppercase px-3 py-[3px] rounded-full whitespace-nowrap shadow-md"
            >
              {badgeLabel}
            </span>
          </div>

          <h2 className="mt-6 font-serif text-[22px] tracking-wide text-(--ui-fg)">
            {displayName}
          </h2>
          <p className="text-[13px] font-sans mt-0.5 text-(--ui-fg-muted)">{displaySub}</p>

          <p className="text-center text-[11px] font-sans leading-relaxed mt-3 px-1 text-(--ui-fg-muted)">
            {statsSummaryLine}
          </p>

          <button
            type="button"
            onClick={openDetailedStats}
            className="mt-3 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-(--ui-accent) hover:opacity-85 transition-colors"
          >
            {t.profileStatsDetailLink}
          </button>

          {showAdminEntry && (
            <button
              type="button"
              onClick={openAdminPanel}
              className={`mt-4 w-full max-w-[280px] rounded-2xl py-3.5 px-4 font-sans text-[11px] font-bold uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md
                ${'bg-(--ui-accent) text-(--ui-accent-contrast) hover:opacity-95 border border-(--ui-border)'}`}
            >
              <Shield size={16} strokeWidth={2.25} aria-hidden />
              {t.profileAdminPanel}
            </button>
          )}
        </div>

        {/* Google Sign-In (only for anonymous) */}
        {isAnonymous && (
          <div className="px-6 pb-6 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {}}
              shape="pill"
              size="large"
              text="signin_with"
              width={320}
            />
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-(--ui-border)" />

        {/* Purchases / benefits */}
        <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
          <div className="px-6 pt-5 pb-2">
            <p className="text-[9px] font-sans font-bold tracking-[0.28em] uppercase mb-1 text-(--ui-fg-muted)">
              {purchases.length > 0 ? 'My Purchases' : 'What you get'}
            </p>
          </div>

          {purchases.length > 0 ? (
            <div className="px-6 pb-2">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 border-b border-(--ui-border)"
                >
                  <div>
                    <p className="text-[14px] font-sans text-(--ui-fg)">
                      {p.wordPackId ? 'Word Pack' : p.themeId ? 'Theme' : 'Sound Pack'}
                    </p>
                    <p className="text-[11px] font-sans mt-0.5 text-(--ui-fg-muted)">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Check size={14} className="text-(--ui-accent)" />
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 pb-2">
              {benefits.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3 border-b border-(--ui-border) last:border-0"
                >
                  <span className="text-[20px] leading-none w-7 text-center shrink-0">
                    {item.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-sans font-medium text-(--ui-fg)">{item.label}</p>
                    <p className="text-[11px] font-sans mt-0.5 leading-snug text-(--ui-fg-muted)">
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-(--ui-border)" />

        {/* Logout */}
        <div
          className="px-6 py-5"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-center text-(--ui-danger) font-sans font-bold
              text-[10px] tracking-[0.3em] uppercase py-3
              hover:opacity-70 active:scale-[0.98] transition-all disabled:opacity-30"
          >
            {loggingOut ? <Loader2 size={14} className="animate-spin inline" /> : 'LOGOUT'}
          </button>
        </div>
      </div>
    </div>
  );
}
