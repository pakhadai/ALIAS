import React, { useState, useEffect } from 'react';
import { X, User, LogOut, Loader2, ShoppingBag, Check } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthContext } from '../../context/AuthContext';
import { fetchProfile, type UserProfile } from '../../services/api';

interface ProfileModalProps {
  onClose: () => void;
}

function ProviderBadge({ provider }: { provider: string }) {
  if (provider === 'google') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google
      </span>
    );
  }
  if (provider === 'apple') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">
        <svg width="11" height="13" viewBox="0 0 814 1000" fill="currentColor">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.6 1 283.9 1 195.4c0-136.4 89.4-208.6 176.6-208.6 49.5 0 90.5 32.6 121.2 32.6 29.2 0 76-34.8 136.6-34.8 54.7 0 107.6 22.4 143.5 65.8z"/>
        </svg>
        Apple
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold text-slate-500 bg-white/5 px-2.5 py-1 rounded-full">
      Анонімний
    </span>
  );
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { authState, isAuthenticated, loginWithGoogle, logout } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    fetchProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    onClose();
  };

  const handleGoogleSuccess = async (cred: { credential?: string }) => {
    if (!cred.credential) return;
    await loginWithGoogle(cred.credential);
    // Reload profile
    setLoading(true);
    fetchProfile().then(setProfile).finally(() => setLoading(false));
  };

  const purchaseCount = profile?.purchases?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-12 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20">
              <User size={20} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Профіль</h1>
              <p className="text-xs text-slate-400">Акаунт та покупки</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            {/* Account info */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Тип акаунту</p>
                <ProviderBadge provider={profile?.authProvider || 'anonymous'} />
              </div>
              {profile?.email && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm text-white">{profile.email}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Покупки</p>
                <div className="flex items-center gap-1.5 text-sm text-white">
                  <ShoppingBag size={13} className="text-indigo-400" />
                  {purchaseCount}
                </div>
              </div>
            </div>

            {/* Link Google (only for anonymous users) */}
            {profile?.authProvider === 'anonymous' && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-semibold text-white">Прив'язати акаунт</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Увійдіть через Google або Apple, щоб зберегти покупки та отримати доступ з будь-якого пристрою.
                </p>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {}}
                    theme="filled_black"
                    size="large"
                    text="signin_with"
                  />
                </div>
              </div>
            )}

            {/* Purchases list */}
            {purchaseCount > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Куплені товари</p>
                {profile?.purchases.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">
                      {p.wordPackId
                        ? 'Словниковий пак'
                        : p.themeId
                        ? 'Тема'
                        : 'Звуковий пресет'}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto">
                      {new Date(p.createdAt).toLocaleDateString('uk-UA')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full h-11 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-xs font-bold tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Вийти
            </button>
          </>
        )}
      </div>
    </div>
  );
}
