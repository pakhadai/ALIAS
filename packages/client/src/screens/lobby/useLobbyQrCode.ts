import { useCallback, useEffect, useRef, useState } from 'react';
import { generateLobbyQrDataUrl, getCachedLobbyQrDataUrl } from './generateLobbyQrDataUrl';

export type LobbyQrStatus = 'idle' | 'loading' | 'ready' | 'error';

type UseLobbyQrCodeOptions = {
  /** Called when generation fails (initial load or explicit retry). */
  onError?: () => void;
};

const GENERATION_TIMEOUT_MS = 8_000;
const AUTO_RETRY_DELAY_MS = 120;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function generateWithTimeout(joinUrl: string): Promise<string> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      generateLobbyQrDataUrl(joinUrl),
      new Promise<string>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error('qr generation timeout'));
        }, GENERATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

/**
 * Generates a lobby join QR data URL for online rooms.
 * - Clears state when `enabled` is false (offline / no room code).
 * - Ignores stale async results via generation id.
 * - SVG-first generation + cache for TMA/WebView stability.
 * - One automatic retry before surfacing error.
 * - Exposes `retry()` after failures.
 */
export function useLobbyQrCode(
  joinUrl: string,
  enabled: boolean,
  options?: UseLobbyQrCodeOptions
): {
  qrCodeData: string;
  status: LobbyQrStatus;
  retry: () => void;
} {
  const [qrCodeData, setQrCodeData] = useState('');
  const [status, setStatus] = useState<LobbyQrStatus>('idle');
  const [attempt, setAttempt] = useState(0);
  const onErrorRef = useRef(options?.onError);
  const generationRef = useRef(0);
  onErrorRef.current = options?.onError;

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !joinUrl) {
      setQrCodeData('');
      setStatus('idle');
      return undefined;
    }

    const cached = getCachedLobbyQrDataUrl(joinUrl);
    if (cached) {
      setQrCodeData(cached);
      setStatus('ready');
      return undefined;
    }

    const generation = ++generationRef.current;
    let cancelled = false;

    setStatus('loading');
    setQrCodeData('');

    const run = async (allowAutoRetry: boolean): Promise<void> => {
      await waitForNextFrame();

      try {
        const data = await generateWithTimeout(joinUrl);
        if (cancelled || generation !== generationRef.current) return;
        setQrCodeData(data);
        setStatus('ready');
      } catch {
        if (cancelled || generation !== generationRef.current) return;

        if (allowAutoRetry) {
          await wait(AUTO_RETRY_DELAY_MS);
          if (cancelled || generation !== generationRef.current) return;
          await run(false);
          return;
        }

        setQrCodeData('');
        setStatus('error');
        onErrorRef.current?.();
      }
    };

    void run(true);

    return () => {
      cancelled = true;
    };
  }, [joinUrl, enabled, attempt]);

  return { qrCodeData, status, retry };
}
