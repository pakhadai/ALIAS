type GoogleIdCredentialResponse = { credential?: string };

type GoogleId = {
  initialize: (opts: {
    client_id: string;
    callback: (res: GoogleIdCredentialResponse) => void;
    auto_select?: boolean;
    locale?: string;
  }) => void;
  prompt: (cb?: (notification: any) => void) => void;
};

function getGoogleId(): GoogleId | null {
  return ((window as any)?.google?.accounts?.id as GoogleId | undefined) ?? null;
}

let initializedKey: string | null = null;

export type GooglePromptResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'blocked' | 'skipped' };

/**
 * Initialize GIS only once per (clientId+locale) pair.
 * Re-initializing repeatedly triggers noisy warnings and can lead to unexpected behavior.
 */
export function ensureGoogleInitialized(params: {
  clientId: string;
  locale: string;
  onCredential: (res: GoogleIdCredentialResponse) => void;
}): GooglePromptResult {
  const googleId = getGoogleId();
  if (!googleId) return { ok: false, reason: 'unavailable' };

  const key = `${params.clientId}::${params.locale}`;
  if (initializedKey !== key) {
    googleId.initialize({
      client_id: params.clientId,
      callback: params.onCredential,
      auto_select: false,
      locale: params.locale,
    });
    initializedKey = key;
  }
  return { ok: true };
}

export function promptGoogleSignIn(): GooglePromptResult {
  const googleId = getGoogleId();
  if (!googleId) return { ok: false, reason: 'unavailable' };

  let result: GooglePromptResult = { ok: true };
  googleId.prompt((notification: any) => {
    if (notification?.isNotDisplayed?.()) result = { ok: false, reason: 'blocked' };
    else if (notification?.isSkippedMoment?.()) result = { ok: false, reason: 'skipped' };
  });
  return result;
}
