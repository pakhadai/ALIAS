import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  clearLobbyQrCache,
  generateLobbyQrDataUrl,
  getCachedLobbyQrDataUrl,
} from './generateLobbyQrDataUrl';

const { toString, toDataURL } = vi.hoisted(() => ({
  toString: vi.fn(),
  toDataURL: vi.fn(),
}));

vi.mock('qrcode', () => ({
  default: { toString, toDataURL },
}));

describe('generateLobbyQrDataUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLobbyQrCache();
    toString.mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    toDataURL.mockResolvedValue('data:image/png;base64,png');
  });

  it('should prefer SVG data URLs for WebView stability', async () => {
    const data = await generateLobbyQrDataUrl('https://app.test/?room=12345');

    expect(toString).toHaveBeenCalledWith('https://app.test/?room=12345', {
      margin: 1,
      width: 256,
      errorCorrectionLevel: 'M',
      type: 'svg',
    });
    expect(toDataURL).not.toHaveBeenCalled();
    expect(data.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(getCachedLobbyQrDataUrl('https://app.test/?room=12345')).toBe(data);
  });

  it('should fall back to PNG when SVG generation fails', async () => {
    toString.mockRejectedValueOnce(new Error('svg fail'));

    const data = await generateLobbyQrDataUrl('https://app.test/?room=99999');

    expect(toDataURL).toHaveBeenCalledWith('https://app.test/?room=99999', {
      margin: 1,
      width: 256,
      errorCorrectionLevel: 'M',
    });
    expect(data).toBe('data:image/png;base64,png');
  });

  it('should return cached value without calling qrcode again', async () => {
    const first = await generateLobbyQrDataUrl('https://app.test/?room=12345');
    const second = await generateLobbyQrDataUrl('https://app.test/?room=12345');

    expect(first).toBe(second);
    expect(toString).toHaveBeenCalledTimes(1);
  });
});
