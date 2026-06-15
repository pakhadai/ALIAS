import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLobbyQrCode } from './useLobbyQrCode';
import { clearLobbyQrCache } from './generateLobbyQrDataUrl';

const { generateLobbyQrDataUrl, getCachedLobbyQrDataUrl } = vi.hoisted(() => ({
  generateLobbyQrDataUrl: vi.fn(),
  getCachedLobbyQrDataUrl: vi.fn(),
}));

vi.mock('./generateLobbyQrDataUrl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./generateLobbyQrDataUrl')>();
  return {
    ...actual,
    generateLobbyQrDataUrl,
    getCachedLobbyQrDataUrl,
  };
});

describe('useLobbyQrCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLobbyQrCache();
    getCachedLobbyQrDataUrl.mockReturnValue(undefined);
    generateLobbyQrDataUrl.mockResolvedValue('data:image/svg+xml;charset=utf-8,ok');
  });

  it('should stay idle when disabled', () => {
    const { result } = renderHook(() => useLobbyQrCode('https://app.test/?room=12345', false));

    expect(result.current.status).toBe('idle');
    expect(result.current.qrCodeData).toBe('');
    expect(generateLobbyQrDataUrl).not.toHaveBeenCalled();
  });

  it('should generate QR data URL when enabled', async () => {
    const { result } = renderHook(() => useLobbyQrCode('https://app.test/?room=12345', true));

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(generateLobbyQrDataUrl).toHaveBeenCalledWith('https://app.test/?room=12345');
    expect(result.current.qrCodeData).toBe('data:image/svg+xml;charset=utf-8,ok');
  });

  it('should call onError and expose error status when generation fails twice', async () => {
    generateLobbyQrDataUrl.mockRejectedValue(new Error('canvas'));
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useLobbyQrCode('https://app.test/?room=12345', true, { onError })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(generateLobbyQrDataUrl).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledOnce();
    expect(result.current.qrCodeData).toBe('');
  });

  it('should auto-retry once before succeeding', async () => {
    generateLobbyQrDataUrl
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('data:image/svg+xml;charset=utf-8,retry');

    const { result } = renderHook(() => useLobbyQrCode('https://app.test/?room=12345', true));

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(generateLobbyQrDataUrl).toHaveBeenCalledTimes(2);
    expect(result.current.qrCodeData).toBe('data:image/svg+xml;charset=utf-8,retry');
  });

  it('should retry generation after failure via retry()', async () => {
    generateLobbyQrDataUrl
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('data:image/svg+xml;charset=utf-8,retry');

    const { result } = renderHook(() => useLobbyQrCode('https://app.test/?room=12345', true));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(generateLobbyQrDataUrl).toHaveBeenCalledTimes(3);
    expect(result.current.qrCodeData).toBe('data:image/svg+xml;charset=utf-8,retry');
  });

  it('should use cached QR immediately without regenerating', () => {
    getCachedLobbyQrDataUrl.mockReturnValue('data:image/svg+xml;charset=utf-8,cached');

    const { result } = renderHook(() => useLobbyQrCode('https://app.test/?room=12345', true));

    expect(result.current.status).toBe('ready');
    expect(result.current.qrCodeData).toBe('data:image/svg+xml;charset=utf-8,cached');
    expect(generateLobbyQrDataUrl).not.toHaveBeenCalled();
  });

  it('should ignore stale results when joinUrl changes quickly', async () => {
    let resolveFirst: ((value: string) => void) | undefined;
    generateLobbyQrDataUrl
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce('data:image/svg+xml;charset=utf-8,new');

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useLobbyQrCode(url, true),
      { initialProps: { url: 'https://app.test/?room=11111' } }
    );

    rerender({ url: 'https://app.test/?room=22222' });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    resolveFirst?.('data:image/svg+xml;charset=utf-8,stale');

    await waitFor(() => {
      expect(result.current.qrCodeData).toBe('data:image/svg+xml;charset=utf-8,new');
    });
  });
});
