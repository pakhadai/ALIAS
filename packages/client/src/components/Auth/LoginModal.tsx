import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDeferredOpen } from '../../hooks/useDeferredOpen';
import { LogIn } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useT } from '../../hooks/useT';
import { Language } from '../../types';
import {
  renderGoogleSignInButton,
  type GoogleIdCredentialResponse,
} from '../../utils/googleIdentity';
import { ModalSheet } from '../ModalSheet';

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
  const { currentTheme, uiLanguage } = useGame();
  const t = useT();
  const [visible, setVisible] = useDeferredOpen();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose, setVisible]);

  const locale = useMemo(() => googleLocale(uiLanguage), [uiLanguage]);

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
    <ModalSheet
      open={visible}
      onClose={handleClose}
      zLayer="modal"
      showHandle
      showClose
      closeIconSize={20}
      closeButtonClassName="absolute top-5 right-5 z-10 p-1 rounded-lg transition-colors text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface"
      closeAriaLabel={t.close}
      paddedContent={false}
      panelClassName="px-6 pb-safe-bottom pt-0"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-ui-surface border border-ui-border">
          <LogIn size={22} className="text-ui-accent" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-ui-fg">{t.loginTitle}</h2>
          <p className="text-sm text-ui-fg-muted">{t.loginSubtitleShopping}</p>
          <p className="text-xs mt-1.5 leading-snug text-ui-fg-muted">{t.loginSubtitleStats}</p>
        </div>
      </div>

      <p className="text-xs mb-5 text-center text-ui-fg-muted">{t.loginAnonymousNote}</p>

      <div className="mb-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 h-11 rounded-xl bg-ui-surface border border-ui-border text-ui-fg-muted">
            <span className="w-4 h-4 border-2 border-ui-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">{t.loginGoogleLoading}</span>
          </div>
        ) : (
          <div ref={googleButtonRef} className="w-full min-h-[44px]" />
        )}
      </div>

      {error && <p className="mt-3 text-xs text-ui-danger text-center leading-relaxed">{error}</p>}

      <div className="mt-5 pt-4 border-t border-ui-border">
        <button
          type="button"
          onClick={handleClose}
          className="w-full text-sm transition-colors text-ui-fg-muted hover:text-ui-fg"
        >
          {t.loginContinueWithout}
        </button>
      </div>
    </ModalSheet>
  );
}
