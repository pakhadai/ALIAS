import QRCode from 'qrcode';

const QR_OPTIONS = {
  margin: 1,
  width: 256,
  errorCorrectionLevel: 'M' as const,
};

/** In-memory cache so remounts / effect re-runs do not regenerate in WebViews. */
const qrCache = new Map<string, string>();

export function getCachedLobbyQrDataUrl(joinUrl: string): string | undefined {
  return qrCache.get(joinUrl);
}

export function clearLobbyQrCache(): void {
  qrCache.clear();
}

/**
 * Lobby join QR as a data URL.
 * SVG-first avoids canvas APIs that flake in Telegram/iOS WebViews.
 */
export async function generateLobbyQrDataUrl(joinUrl: string): Promise<string> {
  const cached = qrCache.get(joinUrl);
  if (cached) return cached;

  let data: string;
  try {
    const svg = await QRCode.toString(joinUrl, { ...QR_OPTIONS, type: 'svg' });
    if (!svg.includes('<svg')) {
      throw new Error('empty svg');
    }
    data = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch {
    data = await QRCode.toDataURL(joinUrl, QR_OPTIONS);
  }

  if (!data) {
    throw new Error('empty qr data url');
  }

  qrCache.set(joinUrl, data);
  return data;
}
