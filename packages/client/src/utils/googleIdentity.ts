export type GoogleIdCredentialResponse = { credential?: string };

type GoogleId = {
  initialize(opts: {
    client_id: string;
    callback: (res: GoogleIdCredentialResponse) => void;
    auto_select?: boolean;
    locale?: string;
    color_scheme?: 'light' | 'dark' | string;
  }): void;
  renderButton(
    parent: HTMLElement,
    opts: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      width?: number;
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      locale?: string;
    }
  ): void;
};

function getGoogleId(): GoogleId | null {
  const win = window as unknown as { google?: { accounts?: { id?: GoogleId } } };
  return win?.google?.accounts?.id ?? null;
}

export type GoogleSignInResult = { ok: true } | { ok: false; reason: 'unavailable' };

/**
 * Initialize GSI and render Google's official sign-in button inside `container`.
 *
 * Using renderButton() instead of prompt() because:
 * - prompt() shows Google's One Tap bottom sheet on mobile — it appears as a
 *   bright white overlay ON TOP of our dark modal, creating a "white square" effect.
 * - renderButton() renders Google's button (theme: filled_black) inside our modal
 *   container. Clicking it opens Google's sign-in flow natively in the browser —
 *   no visual clash with our dark UI.
 * - Always re-initializes so the callback is always fresh. Caching caused stale-
 *   closure bugs where credentials fired into already-unmounted components.
 */
export function renderGoogleSignInButton(
  container: HTMLElement,
  params: {
    clientId: string;
    locale: string;
    colorScheme: 'light' | 'dark';
    onCredential: (res: GoogleIdCredentialResponse) => void;
  }
): GoogleSignInResult {
  const googleId = getGoogleId();
  if (!googleId) return { ok: false, reason: 'unavailable' };

  // renderButton() appends DOM. Clear first to avoid duplicate iframes when
  // locale/theme changes or when a modal is reopened.
  container.innerHTML = '';

  // Always re-initialize so the callback is fresh (avoids stale closure bugs
  // that occur when the modal is opened multiple times).
  googleId.initialize({
    client_id: params.clientId,
    callback: params.onCredential,
    auto_select: false,
    locale: params.locale,
    color_scheme: params.colorScheme,
  });

  const width = Math.round(container.getBoundingClientRect().width) || container.offsetWidth || 320;

  googleId.renderButton(container, {
    // filled_black looks great on dark backgrounds, outline for light themes
    theme: params.colorScheme === 'dark' ? 'filled_black' : 'outline',
    size: 'large',
    // Match container width so Google's button fills our modal row naturally
    width,
    shape: 'rectangular',
    text: 'signin_with',
    locale: params.locale,
  });

  return { ok: true };
}
