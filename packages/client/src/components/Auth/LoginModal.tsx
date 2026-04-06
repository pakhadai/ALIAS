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

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: object) => void;
        signIn: () => Promise<{
          authorization: { id_token: string; code: string };
          user?: { email: string; name?: { firstName: string; lastName: string } };
        }>;
      };
    };
  }
}

function googleLocale(lang: Language): string {
  if (lang === Language.DE) return 'de';
  if (lang === Language.EN) return 'en';
  return 'uk';
}

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const { loginWithGoogle, loginWithApple } = useAuthContext();
  const { currentTheme, settings } = useGame();
  const t = TRANSLATIONS[settings.general.language];
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
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

  const handleAppleSignIn = async () => {
    if (!window.AppleID) {
      setError(t.loginAppleUnavailable);
      return;
    }

    setLoading('apple');
    setError(null);
    try {
      const response = await window.AppleID.auth.signIn();
      const idToken = response.authorization.id_token;
      const email = response.user?.email;
      await loginWithApple(idToken, email);
      onSuccess?.();
      onClose();
    } catch (e) {
      if ((e as Error).message !== 'popup_closed_by_user') {
        setError((e as Error).message || t.loginAppleUnavailable);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--ui-bg)_55%,transparent)] backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-(--ui-card) border border-(--ui-border) p-6 shadow-2xl">
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
            <div
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg-muted)"
            >
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

        {/* Apple */}
        <button
          onClick={handleAppleSignIn}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 h-11 rounded-full bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) font-medium text-sm hover:bg-(--ui-surface-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'apple' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          )}
          {loading === 'apple' ? t.loginAppleLoading : t.loginApple}
        </button>

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
