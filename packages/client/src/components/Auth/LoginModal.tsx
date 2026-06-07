import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useT } from '../../hooks/useT';
import { Language } from '../../types';
import {
  renderGoogleSignInButton,
  type GoogleIdCredentialResponse,
} from '../../utils/googleIdentity';
import { ModalSheet, ModalSheetFooter } from '../ModalSheet';
import { ModalSheetTitle } from '../Shared';
import { typographyClass } from '../../constants/typography';

interface LoginModalProps {
  open: boolean;
  /** Guest chose to continue without signing in */
  onDismiss: () => void;
}

function googleLocale(lang: Language): string {
  if (lang === Language.DE) return 'de';
  if (lang === Language.EN) return 'en';
  return 'uk';
}

export function LoginModal({ open, onDismiss }: LoginModalProps) {
  const { loginWithGoogle } = useAuthContext();
  const { currentTheme, uiLanguage } = useGame();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const locale = useMemo(() => googleLocale(uiLanguage), [uiLanguage]);

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: GoogleIdCredentialResponse) => {
      if (!credentialResponse.credential) return;
      setLoading(true);
      setError(null);
      try {
        await loginWithGoogle(credentialResponse.credential);
      } catch (e) {
        setError((e as Error).message);
        setLoading(false);
      }
    },
    [loginWithGoogle]
  );

  useEffect(() => {
    if (!open || !googleButtonRef.current) return;
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
  }, [open, locale, currentTheme.isDark, handleGoogleSuccess, t.loginGoogleFailed]);

  return (
    <ModalSheet
      open={open}
      onClose={onDismiss}
      onBackdropClick={() => undefined}
      zLayer="modal"
      size="default"
      showClose
      closeAriaLabel={t.close}
      closeIconSize={18}
      paddedContent={false}
      ariaLabelledBy="login-modal-title"
      header={
        <ModalSheetTitle id="login-modal-title" themeClass={currentTheme.textMain}>
          {t.loginTitle}
        </ModalSheetTitle>
      }
    >
      <div className="flex flex-col items-center px-5 pt-2 pb-4 text-center">
        <p
          className={`mb-3 tracking-[0.22em] ${typographyClass.heading} ${currentTheme.textMain}`}
          aria-hidden
        >
          ALIAS
        </p>
        <p className={`mt-1.5 max-w-[16rem] ${typographyClass.body} text-ui-fg-muted`}>
          {t.loginSubtitleShopping}
        </p>
      </div>

      <ModalSheetFooter className="border-t border-ui-border px-5 pt-4">
        {loading ? (
          <div className="flex h-11 items-center justify-center gap-2 rounded-xl border border-ui-border bg-ui-surface text-ui-fg-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
            <span className={typographyClass.body}>{t.loginGoogleLoading}</span>
          </div>
        ) : (
          <div ref={googleButtonRef} className="min-h-[44px] w-full" />
        )}

        {error && (
          <p className={`mt-3 text-center ${typographyClass.body} text-ui-danger`}>{error}</p>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full py-2 text-xs text-ui-fg-muted transition-colors hover:text-ui-fg"
        >
          {t.loginContinueWithout}
        </button>
      </ModalSheetFooter>
    </ModalSheet>
  );
}
