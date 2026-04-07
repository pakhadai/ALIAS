type GoogleIdCredentialResponse = { credential?: string };

type GoogleId = {
  initialize: (opts: {
    client_id: string;
    callback: (res: GoogleIdCredentialResponse) => void;
    auto_select?: boolean;
    locale?: string;
    color_scheme?: 'light' | 'dark' | string;
    use_fedcm_for_prompt?: boolean; // Оновлений параметр для FedCM
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

export function ensureGoogleInitialized(params: {
  clientId: string;
  locale: string;
  onCredential: (res: GoogleIdCredentialResponse) => void;
  colorScheme?: 'light' | 'dark';
}): GooglePromptResult {
  const googleId = getGoogleId();
  if (!googleId) return { ok: false, reason: 'unavailable' };

  const scheme = params.colorScheme ?? 'dark';
  const key = `${params.clientId}::${params.locale}::${scheme}`;
  if (initializedKey !== key) {
    googleId.initialize({
      client_id: params.clientId,
      callback: params.onCredential,
      auto_select: false,
      locale: params.locale,
      color_scheme: scheme,
      use_fedcm_for_prompt: true, // УВІМКНЕНО НАЙНОВІШИЙ СТАНДАРТ GOOGLE
    });
    initializedKey = key;
  }
  return { ok: true };
}

export function promptGoogleSignIn(): GooglePromptResult {
  const googleId = getGoogleId();
  if (!googleId) return { ok: false, reason: 'unavailable' };

  // Викликаємо вікно авторизації без старих колбеків (які викликали попередження GSI_LOGGER)
  googleId.prompt();

  return { ok: true };
}
