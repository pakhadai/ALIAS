import React, { useState, useEffect } from 'react';
import { X, Lock, Upload, Check, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthContext } from '../../context/AuthContext';
import { fetchProfile, fetchStore, type UserProfile, type StoreData } from '../../services/api';

interface ProfileModalProps {
  onClose: () => void;
}

/** Detect Apple platform (iPhone / iPad / Mac) */
function isApplePlatform(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (/Mac/i.test(ua) && navigator.maxTouchPoints > 0) return true;
  return false;
}

/** Google "G" coloured logo */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/** Apple logo */
function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-36.8-162.8-105.3C111.1 787.2 69.9 673 69.9 563.8c0-175.8 114.4-268.9 226.5-268.9 84.4 0 154.2 55.5 205.1 55.5 47.8 0 126.3-58.7 216-58.7zM609.7 0c4.5 55.5-18 111.4-51.3 149.6-32 37.5-89.4 67.7-145.7 67.7-3.2 0-6.4 0-9.6-.3.3-57.1 24.6-112.3 57.3-150.5C491.9 28.5 557.5.5 609.7 0z"/>
    </svg>
  );
}

/** Person silhouette icon */
function AvatarIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="16" r="8" fill="rgba(255,255,255,0.2)" />
      <path d="M4 40c0-9.94 8.06-18 18-18s18 8.06 18 18" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { authState, isAuthenticated, loginWithGoogle, logout } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [visible, setVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const apple = isApplePlatform();

  /* ── Mount animation ── */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── Load data ── */
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile().then(setProfile).catch(() => {});
    }
    fetchStore().then(setStoreData).catch(() => {});
  }, [isAuthenticated]);

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
    fetchProfile().then(setProfile).catch(() => {});
  };

  const isAnonymous = authState.status === 'anonymous' || authState.status === 'loading';
  const purchases = profile?.purchases ?? [];
  const displayName = isAnonymous
    ? 'Anonymous'
    : (authState.status === 'authenticated' ? authState.email?.split('@')[0] : '');
  const displaySub = isAnonymous
    ? 'Guest User'
    : (authState.status === 'authenticated' ? authState.email : '');
  const badgeLabel = isAnonymous ? 'FREE ACCOUNT' : authState.status === 'authenticated' ? authState.provider?.toUpperCase() : '';

  /* ── Catalog items (shown when no purchases yet) ── */
  const catalogItems: { label: string; sub: string; icon: 'lock' | 'upload' }[] = [
    ...(storeData?.wordPacks ?? []).map(p => ({
      label: p.name,
      sub: `${p.wordCount} Words`,
      icon: 'lock' as const,
    })),
    ...(storeData?.themes.filter(t => !t.isFree) ?? []).map(t => ({
      label: t.name,
      sub: 'Visual Skin',
      icon: 'lock' as const,
    })),
    { label: 'Custom Word Lists', sub: 'Upload your own', icon: 'upload' as const },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300
        ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-sm mx-auto rounded-t-[2rem] overflow-hidden
          bg-[#1C1C1E] transition-transform duration-300 ease-out
          ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end px-5 pt-5 pb-0">
          <button
            onClick={handleClose}
            className="text-white/30 hover:text-white/60 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar + identity */}
        <div className="flex flex-col items-center pt-2 pb-7 px-6">
          <div className="relative">
            <div className="w-[76px] h-[76px] rounded-full bg-[#2C2C2E] flex items-center justify-center">
              <AvatarIcon />
            </div>
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2
              bg-[#D4AF6A] text-[#1C1C1E] text-[7px] font-bold tracking-[0.18em]
              uppercase px-3 py-[3px] rounded-full whitespace-nowrap shadow-md">
              {badgeLabel}
            </span>
          </div>

          <h2 className="mt-6 font-serif text-[22px] text-white tracking-wide">
            {displayName}
          </h2>
          <p className="text-white/40 text-[13px] font-sans mt-0.5">
            {displaySub}
          </p>
        </div>

        {/* Auth button (only for anonymous) */}
        {isAnonymous && (
          <div className="px-6 pb-6">
            {apple ? (
              <button
                onClick={() => {/* Apple Sign-In — requires native SDK */}}
                className="w-full h-[52px] bg-white rounded-full flex items-center justify-center
                  gap-3 font-sans font-semibold text-[14px] text-black
                  hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
              >
                <AppleIcon />
                Sign in with Apple
              </button>
            ) : (
              <div className="flex justify-center [&>div]:w-full [&_iframe]:w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {}}
                  shape="pill"
                  size="large"
                  text="signin_with"
                  width="100%"
                />
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-white/[0.07] mx-0" />

        {/* Purchases / catalog */}
        <div className="overflow-y-auto" style={{ maxHeight: '38vh' }}>
          <div className="px-6 pt-5 pb-2">
            <p className="text-white/30 text-[9px] font-sans font-bold tracking-[0.28em] uppercase mb-4">
              {purchases.length > 0 ? 'My Purchases' : 'Available'}
            </p>
          </div>

          {purchases.length > 0 ? (
            /* Real purchases */
            <div className="px-6 pb-2 space-y-0">
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                  <div>
                    <p className="text-white/80 text-[14px] font-sans">
                      {p.wordPackId ? 'Word Pack' : p.themeId ? 'Theme' : 'Sound Pack'}
                    </p>
                    <p className="text-white/30 text-[11px] font-sans mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Check size={14} className="text-[#D4AF6A]" />
                </div>
              ))}
            </div>
          ) : storeData ? (
            /* Store catalog with lock icons */
            <div className="px-6 pb-2 space-y-0">
              {catalogItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                  <div>
                    <p className="text-white/70 text-[14px] font-sans">{item.label}</p>
                    <p className="text-white/30 text-[11px] font-sans mt-0.5">{item.sub}</p>
                  </div>
                  {item.icon === 'lock'
                    ? <Lock size={13} className="text-white/20" />
                    : <Upload size={13} className="text-white/20" />
                  }
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-white/20" />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.07]" />

        {/* Logout */}
        <div className="px-6 py-5" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
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
