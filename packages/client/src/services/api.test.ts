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
  saveLobbySettings,
  buyWithStars,
  fetchLobbySettings,
  invalidateLobbySettingsCache,
  getTokenAuthType,
  fetchStore,
  updateProfile,
  createCheckout,
  onAuthChanged,
  isAnonymousSession,
} from './api';

describe('services/api', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    invalidateLobbySettingsCache();
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

  test('fetchProfile returns profile on 200', async () => {
    const profile = {
      id: 'u1',
      email: 'a@b.c',
      authProvider: 'google',
      name: null,
      avatarUrl: null,
      displayName: 'Player',
      avatarId: null,
      skipNamePrompt: false,
      isAdmin: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      purchases: [],
      playerStats: {
        gamesPlayed: 1,
        wordsGuessed: 2,
        wordsSkipped: 0,
        lastPlayed: '2026-01-01T00:00:00.000Z',
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => profile,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchProfile()).resolves.toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me'),
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  test('fetchProfile throws on 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Unauthorized' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchProfile()).rejects.toThrow('Unauthorized');
  });

  test('saveLobbySettings sends PUT and invalidates cache on 200', async () => {
    setAuthToken('jwt-save');
    const settings = { general: { scoreToWin: 50 } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => undefined,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await saveLobbySettings(settings);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/lobby-settings'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(settings),
      })
    );
  });

  test('saveLobbySettings throws on 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Sign in required' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(saveLobbySettings({ scoreToWin: 30 })).rejects.toThrow('Sign in required');
  });

  test('saveLobbySettings throws on 500', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({ error: 'Save failed' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(saveLobbySettings({ scoreToWin: 30 })).rejects.toThrow('Save failed');
  });

  test('buyWithStars returns invoice payload on 200', async () => {
    const payload = {
      invoiceUrl: 'https://t.me/$invoice',
      purchaseId: 'p1',
      starsAmount: 100,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(buyWithStars({ itemType: 'wordPack', itemId: 'pack-1' })).resolves.toEqual(
      payload
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/store/buy-stars'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ itemType: 'wordPack', itemId: 'pack-1' }),
      })
    );
  });

  test('buyWithStars throws on 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Auth required' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(buyWithStars({ itemType: 'theme', itemId: 'theme-1' })).rejects.toThrow(
      'Auth required'
    );
  });

  test('buyWithStars throws on 500', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({ error: 'Stars checkout failed' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(buyWithStars({ itemType: 'soundPack', itemId: 'sound-1' })).rejects.toThrow(
      'Stars checkout failed'
    );
  });

  test('fetchLobbySettings uses in-memory cache within TTL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ settings: { scoreToWin: 40 } }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const first = await fetchLobbySettings();
    const second = await fetchLobbySettings();

    expect(first).toEqual({ scoreToWin: 40 });
    expect(second).toEqual({ scoreToWin: 40 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('getTokenAuthType decodes JWT type claim', () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ type: 'telegram', sub: 'u1' }));
    setAuthToken(`${header}.${payload}.sig`);

    expect(getTokenAuthType()).toBe('telegram');
    expect(isAnonymousSession()).toBe(false);
  });

  test('isAnonymousSession is true for anonymous JWT', () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ type: 'anonymous', sub: 'u1' }));
    setAuthToken(`${header}.${payload}.sig`);

    expect(isAnonymousSession()).toBe(true);
  });

  test('fetchStore returns catalog on 200', async () => {
    const catalog = { wordPacks: [], themes: [], soundPacks: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => catalog,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchStore()).resolves.toEqual(catalog);
  });

  test('updateProfile sends PATCH payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        displayName: 'Ada',
        avatarId: null,
        avatarUrl: null,
        skipNamePrompt: false,
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await updateProfile({ displayName: 'Ada' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/profile'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ displayName: 'Ada' }),
      })
    );
  });

  test('createCheckout returns checkout URL on 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutUrl: 'https://checkout.stripe.test', purchaseId: 'p1' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(createCheckout('wordPack', 'pack-1')).resolves.toEqual({
      checkoutUrl: 'https://checkout.stripe.test',
      purchaseId: 'p1',
    });
  });

  test('onAuthChanged fires callback when token is set', () => {
    const cb = vi.fn();
    const unsubscribe = onAuthChanged(cb);

    setAuthToken('jwt-auth-event');
    expect(cb).toHaveBeenCalledTimes(1);

    unsubscribe();
    setAuthToken('jwt-auth-event-2');
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
