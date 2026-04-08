export type GoogleIdCredentialResponse = { credential?: string };

type PromptNotification = {
  isDisplayed(): boolean;
  isNotDisplayed(): boolean;
  getNotDisplayedReason(): string;
  isSkippedMoment(): boolean;
  getSkippedReason(): string;
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
  getMomentType(): string;
};

type GoogleId = {
  initialize(opts: {
    client_id: string;
    callback: (res: GoogleIdCredentialResponse) => void;
    auto_select?: boolean;
    locale?: string;
    color_scheme?: 'light' | 'dark' | string;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
  }): void;
  prompt(cb?: (notification: PromptNotification) => void): void;
};

function getGoogleId(): GoogleId | null {
  const win = window as unknown as { google?: { accounts?: { id?: GoogleId } } };
  return win?.google?.accounts?.id ?? null;
}

export type GoogleSignInResult = { ok: true } | { ok: false; reason: 'unavailable' | 'suppressed' };

/**
 * Initialize Google Identity Services and trigger the sign-in prompt.
 *
 * Design decisions:
 * - Always re-initializes on every call. Caching (the old `initializedKey`) caused
 *   stale-closure bugs: if the modal was re-opened with the same locale/theme,
 *   initialize() was skipped and the callback still pointed to the FIRST
 *   (already unmounted) modal instance. The credential then fired into the void.
 * - `use_fedcm_for_prompt` is intentionally omitted. It is designed for auto
 *   One-Tap prompts, NOT for explicit button-triggered sign-ins. Enabling it
 *   caused intermittent silent suppression with no feedback to the user.
 * - A `notification` callback is passed to `prompt()` so we can detect when
 *   Google suppresses the popup (browser cooldown, third-party cookie restrictions,
 *   etc.) and call `onSuppressed` instead of spinning indefinitely.
 */
export function initAndPromptGoogleSignIn(params: {
  clientId: string;
  locale: string;
  colorScheme: 'light' | 'dark';
  onCredential: (res: GoogleIdCredentialResponse) => void;
  onSuppressed: () => void;
}): GoogleSignInResult {
  const googleId = getGoogleId();
  if (!googleId) return { ok: false, reason: 'unavailable' };

  googleId.initialize({
    client_id: params.clientId,
    callback: params.onCredential,
    auto_select: false,
    locale: params.locale,
    color_scheme: params.colorScheme,
  });

  googleId.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      params.onSuppressed();
    }
  });

  return { ok: true };
}
