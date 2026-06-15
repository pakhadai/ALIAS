import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLobbyQrCode } from './useLobbyQrCode';

const { toDataURL } = vi.hoisted(() => ({
  toDataURL: vi.fn(),
}));

vi.mock('qrcode', () => ({
  default: { toDataURL },
}));

describe('useLobbyQrCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toDataURL.mockResolvedValue('data:image/png;base64,ok');
  });

  it('should stay idle when disabled', () => {
    const { result } = renderHook(() => useLobbyQrCode('https://app.test/?room=12345', false));

    expect(result.current.status).toBe('idle');
    expect(result.current.qrCodeData).toBe('');
    expect(toDataURL).not.toHaveBeenCalled();
  });

  it('should generate QR data URL when enabled', async () => {
    const { result } = renderHook(() => useLobbyQrCode('https://app.test/?room=12345', true));

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(toDataURL).toHaveBeenCalledWith('https://app.test/?room=12345', { margin: 1 });
    expect(result.current.qrCodeData).toBe('data:image/png;base64,ok');
  });

  it('should call onError and expose error status when generation fails', async () => {
    toDataURL.mockRejectedValueOnce(new Error('canvas'));
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useLobbyQrCode('https://app.test/?room=12345', true, { onError })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(result.current.qrCodeData).toBe('');
  });

  it('should retry generation after failure', async () => {
    toDataURL
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('data:image/png;base64,retry');

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

    expect(toDataURL).toHaveBeenCalledTimes(2);
    expect(result.current.qrCodeData).toBe('data:image/png;base64,retry');
  });

  it('should ignore stale results when joinUrl changes quickly', async () => {
    let resolveFirst: ((value: string) => void) | undefined;
    toDataURL
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce('data:image/png;base64,new');

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useLobbyQrCode(url, true),
      { initialProps: { url: 'https://app.test/?room=11111' } }
    );

    rerender({ url: 'https://app.test/?room=22222' });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    resolveFirst?.('data:image/png;base64,stale');

    await waitFor(() => {
      expect(result.current.qrCodeData).toBe('data:image/png;base64,new');
    });
  });
});
