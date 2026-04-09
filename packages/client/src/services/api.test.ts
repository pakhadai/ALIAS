import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import {
  getDeviceId,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  AUTH_TOKEN_KEY,
  DEVICE_ID_KEY,
  fetchAnonymousToken,
  fetchProfile,
} from './api';

describe('services/api', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('getDeviceId persists a stable id', () => {
    const a = getDeviceId();
    const b = getDeviceId();
    expect(a).toBe(b);
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(a);
  });

  test('auth token helpers store and clear token', () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken('t1');
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('t1');
    expect(getAuthToken()).toBe('t1');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  test('fetchAnonymousToken stores returned token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'jwt-1', userId: 'u1' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await fetchAnonymousToken();
    expect(res.token).toBe('jwt-1');
    expect(getAuthToken()).toBe('jwt-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/anonymous'),
      expect.any(Object)
    );
  });

  test('api fetch wrapper sends Authorization when token exists', async () => {
    setAuthToken('jwt-2');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'u1' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchProfile();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-2');
  });

  test('api fetch wrapper throws on non-OK response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({ error: 'boom' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchProfile()).rejects.toThrow('boom');
  });
});
