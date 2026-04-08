import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { TRANSLATIONS } from '../../constants';
import { Language } from '../../types';
import {
  renderGoogleSignInButton,
  type GoogleIdCredentialResponse,
} from '../../utils/googleIdentity';
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

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const { loginWithGoogle } = useAuthContext();
  const { settings, currentTheme } = useGame();
  const t = TRANSLATIONS[settings.general.language];
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Container that Google's renderButton() will paint its button into. */
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  const locale = useMemo(
    () => googleLocale(settings.general.language),
    [settings.general.language]
  );

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: GoogleIdCredentialResponse) => {
      if (!credentialResponse.credential) return;
      setLoading(true);
      setError(null);
      try {
        await loginWithGoogle(credentialResponse.credential);
        onSuccess?.();
        handleClose();
      } catch (e) {
        setError((e as Error).message);
        setLoading(false);
      }
    },
    [loginWithGoogle, onSuccess, handleClose]
  );

  // Render (or re-render) Google's official button whenever locale/theme/callback changes.
  // renderButton() replaces prompt() — avoids One Tap bottom sheet that clashes
  // with our own dark bottom sheet UI.
  useEffect(() => {
    if (!googleButtonRef.current) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;

    const result = renderGoogleSignInButton(googleButtonRef.current, {
      clientId,
      locale,
      colorScheme: currentTheme.isDark ? 'dark' : 'light',
      onCredential: handleGoogleSuccess,
    });

    if (!result.ok) {
      setError(t.loginGoogleFailed);
    }
  }, [locale, currentTheme.isDark, handleGoogleSuccess, t.loginGoogleFailed]);

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
        {/* Drag handle */}
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

        {/* Google Sign-In button — rendered by Google's SDK, fills this container.
            Using renderButton() instead of a custom button avoids the One Tap bottom
            sheet that overlays our own dark bottom sheet with a white square. */}
        <div className="mb-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 h-11 rounded-xl bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg-muted)">
              <span className="w-4 h-4 border-2 border-(--ui-accent) border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">{t.loginGoogleLoading}</span>
            </div>
          ) : (
            /* Google renders its button into this div.
               min-h prevents layout shift while GSI script loads. */
            <div ref={googleButtonRef} className="w-full min-h-[44px]" />
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-xs text-(--ui-danger) text-center leading-relaxed">{error}</p>
        )}

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
