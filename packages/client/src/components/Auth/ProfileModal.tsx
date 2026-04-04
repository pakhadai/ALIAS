import React, { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthContext } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { fetchStore, type StoreData } from '../../services/api';
import { AvatarDisplay } from '../AvatarDisplay';

interface ProfileModalProps {
  onClose: () => void;
}

/** Person silhouette icon */
function AvatarIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="16" r="8" fill="rgba(255,255,255,0.2)" />
      <path
        d="M4 40c0-9.94 8.06-18 18-18s18 8.06 18 18"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { authState, profile, isAuthenticated, loginWithGoogle, logout } = useAuthContext();
  const { currentTheme } = useGame();
  const isDark = currentTheme.isDark;
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
        ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-sm mx-auto rounded-t-[2rem] overflow-hidden
          ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'} transition-transform duration-300 ease-out
          ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end px-5 pt-5 pb-0">
          <button
            onClick={handleClose}
            className={`${isDark ? 'text-white/30 hover:text-white/60' : 'text-slate-400 hover:text-slate-700'} transition-colors p-1`}
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
              <div
                className={`w-[76px] h-[76px] rounded-full ${isDark ? 'bg-[#2C2C2E]' : 'bg-slate-100'} flex items-center justify-center`}
              >
                <AvatarIcon />
              </div>
            )}
            <span
              className="absolute -bottom-3 left-1/2 -translate-x-1/2
              bg-[#D4AF6A] text-[#1C1C1E] text-[7px] font-bold tracking-[0.18em]
              uppercase px-3 py-[3px] rounded-full whitespace-nowrap shadow-md"
            >
              {badgeLabel}
            </span>
          </div>

          <h2
            className={`mt-6 font-serif text-[22px] tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            {displayName}
          </h2>
          <p
            className={`text-[13px] font-sans mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}
          >
            {displaySub}
          </p>
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
        <div className={`h-px ${isDark ? 'bg-white/[0.07]' : 'bg-slate-200'}`} />

        {/* Purchases / benefits */}
        <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
          <div className="px-6 pt-5 pb-2">
            <p
              className={`text-[9px] font-sans font-bold tracking-[0.28em] uppercase mb-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}
            >
              {purchases.length > 0 ? 'My Purchases' : 'What you get'}
            </p>
          </div>

          {purchases.length > 0 ? (
            <div className="px-6 pb-2">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between py-3 border-b ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}
                >
                  <div>
                    <p
                      className={`text-[14px] font-sans ${isDark ? 'text-white/80' : 'text-slate-800'}`}
                    >
                      {p.wordPackId ? 'Word Pack' : p.themeId ? 'Theme' : 'Sound Pack'}
                    </p>
                    <p
                      className={`text-[11px] font-sans mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-400'}`}
                    >
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Check size={14} className="text-[#D4AF6A]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 pb-2">
              {benefits.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 py-3 border-b last:border-0 ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}
                >
                  <span className="text-[20px] leading-none w-7 text-center shrink-0">
                    {item.emoji}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-[13px] font-sans font-medium ${isDark ? 'text-white/80' : 'text-slate-800'}`}
                    >
                      {item.label}
                    </p>
                    <p
                      className={`text-[11px] font-sans mt-0.5 leading-snug ${isDark ? 'text-white/30' : 'text-slate-400'}`}
                    >
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`h-px ${isDark ? 'bg-white/[0.07]' : 'bg-slate-200'}`} />

        {/* Admin Panel link — only for admins */}
        {authState.status === 'authenticated' && authState.isAdmin && (
          <div className="px-6 pb-2">
            <button
              onClick={() => window.open('/admin', '_blank')}
              className="w-full text-center text-indigo-400 font-sans font-bold
                text-[10px] tracking-[0.3em] uppercase py-3
                hover:opacity-70 active:scale-[0.98] transition-all"
            >
              ⚙ ADMIN PANEL
            </button>
          </div>
        )}

        {/* Logout */}
        <div
          className="px-6 py-5"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-center text-[#FF3B30] font-sans font-bold
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
