import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export type LobbyQrStatus = 'idle' | 'loading' | 'ready' | 'error';

type UseLobbyQrCodeOptions = {
  /** Called when generation fails (initial load or explicit retry). */
  onError?: () => void;
};

/**
 * Generates a lobby join QR data URL for online rooms.
 * - Clears state when `enabled` is false (offline / no room code).
 * - Ignores stale async results via cancellation flag.
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

    let cancelled = false;
    setStatus('loading');
    setQrCodeData('');

    void QRCode.toDataURL(joinUrl, { margin: 1 })
      .then((data) => {
        if (cancelled) return;
        setQrCodeData(data);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setQrCodeData('');
        setStatus('error');
        onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
    };
  }, [joinUrl, enabled, attempt]);

  return { qrCodeData, status, retry };
}
