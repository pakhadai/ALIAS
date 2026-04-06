import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { X, LogIn, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { TRANSLATIONS } from '../../constants';
import { Language } from '../../types';

interface LoginModalProps {
  onClose: () => void;
  /** Called after successful login */
  onSuccess?: () => void;
}

function googleLocale(lang: Language): string {
  if (lang === Language.DE) return 'de';
  if (lang === Language.EN) return 'en';
  return 'uk';
}

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const { loginWithGoogle } = useAuthContext();
  const { settings } = useGame();
  const t = TRANSLATIONS[settings.general.language];
  const [loading, setLoading] = useState<'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setLoading('google');
    setError(null);
    try {
      await loginWithGoogle(credentialResponse.credential);
      onSuccess?.();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--ui-bg)_78%,transparent)] backdrop-blur-xl p-4 animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-(--ui-card) border border-(--ui-border) p-6 shadow-2xl animate-pop-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg transition-colors text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface)"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-(--ui-surface) border border-(--ui-border)">
            <LogIn size={22} className="text-(--ui-accent)" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-(--ui-fg)">{t.loginTitle}</h2>
            <p className="text-sm text-(--ui-fg-muted)">{t.loginSubtitleShopping}</p>
            <p className="text-xs mt-1.5 leading-snug text-(--ui-fg-muted)">
              {t.loginSubtitleStats}
            </p>
          </div>
        </div>

        {/* Anonymous note */}
        <p className="text-xs mb-5 text-center text-(--ui-fg-muted)">{t.loginAnonymousNote}</p>

        {/* Google */}
        <div className="mb-3">
          {loading === 'google' ? (
            <div className="flex items-center justify-center gap-2 h-11 rounded-xl bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg-muted)">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">{t.loginGoogleLoading}</span>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError(t.loginGoogleFailed)}
              theme="filled_black"
              shape="pill"
              size="large"
              text="signin_with"
              width="100%"
              // @ts-expect-error — library supports locale; typings are incomplete
              locale={googleLocale(settings.language)}
            />
          )}
        </div>

        {/* Error */}
        {error && <p className="mt-3 text-xs text-(--ui-danger) text-center">{error}</p>}

        {/* Divider */}
        <div className="mt-5 pt-4 border-t border-(--ui-border)">
          <button
            onClick={onClose}
            className="w-full text-sm transition-colors text-(--ui-fg-muted) hover:text-(--ui-fg)"
          >
            {t.loginContinueWithout}
          </button>
        </div>
      </div>
    </div>
  );
}
