import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, LogIn, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { TRANSLATIONS } from '../../constants';
import { Language } from '../../types';
import { ensureGoogleInitialized, promptGoogleSignIn } from '../../utils/googleIdentity';
import { bottomSheetBackdropClass, bottomSheetPanelClass } from '../Shared';

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

type GoogleIdCredentialResponse = { credential?: string };

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const { loginWithGoogle } = useAuthContext();
  const { settings, currentTheme } = useGame();
  const t = TRANSLATIONS[settings.general.language];
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState<'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const locale = useMemo(
    () => googleLocale(settings.general.language),
    [settings.general.language]
  );

  const handleGoogleSuccess = async (credentialResponse: GoogleIdCredentialResponse) => {
    if (!credentialResponse.credential) return;
    setLoading('google');
    setError(null);
    try {
      await loginWithGoogle(credentialResponse.credential);
      onSuccess?.();
      handleClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleClick = useCallback(() => {
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setError(t.loginGoogleFailed);
      return;
    }

    setLoading('google');
    setError(null);
    const init = ensureGoogleInitialized({
      clientId,
      locale,
      colorScheme: currentTheme.isDark ? 'dark' : 'light',
      onCredential: (res: GoogleIdCredentialResponse) => void handleGoogleSuccess(res),
    });
    if (!init.ok) {
      setLoading(null);
      setError(t.loginGoogleFailed);
      return;
    }
    const promptRes = promptGoogleSignIn();
    if (!promptRes.ok) {
      setLoading(null);
      setError(t.loginGoogleFailed);
    }
  }, [currentTheme.isDark, handleGoogleSuccess, locale, t.loginGoogleFailed]);

  return (
    <div
      className={bottomSheetBackdropClass(visible, 'z-50')}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className={bottomSheetPanelClass(visible, 'p-6')}
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close */}
        <div className="flex justify-center pt-0 pb-2">
          <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
        </div>
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1 rounded-lg transition-colors text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface)"
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
            <button
              type="button"
              onClick={handleGoogleClick}
              className="w-full h-11 rounded-xl bg-(--ui-surface) hover:bg-(--ui-surface-hover) border border-(--ui-border)
                text-(--ui-fg) font-sans font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
            >
              <span
                aria-hidden
                className="h-6 w-6 rounded-md bg-(--ui-card) border border-(--ui-border) flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303C33.656 32.657 29.146 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.566 6.053 29.529 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306 14.691 12.87 19.51C14.654 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.566 6.053 29.529 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.422 0 10.36-2.005 14.073-5.273l-6.497-5.5C29.533 34.723 26.86 36 24 36c-5.125 0-9.622-3.317-11.285-7.946l-6.514 5.02C9.522 39.556 16.227 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303c-.792 2.258-2.348 4.158-4.427 5.227l.003-.002 6.497 5.5C36.922 39.1 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                  />
                </svg>
              </span>
              <span>{t.loginGoogle}</span>
            </button>
          )}
        </div>

        {/* Error */}
        {error && <p className="mt-3 text-xs text-(--ui-danger) text-center">{error}</p>}

        {/* Divider */}
        <div className="mt-5 pt-4 border-t border-(--ui-border)">
          <button
            onClick={handleClose}
            className="w-full text-sm transition-colors text-(--ui-fg-muted) hover:text-(--ui-fg)"
          >
            {t.loginContinueWithout}
          </button>
        </div>
      </div>
    </div>
  );
}
