import { describe, expect, test, vi } from 'vitest';

describe('AuthService', () => {
  test('createToken + verifyToken roundtrip', async () => {
    const { AuthService } = await import('../AuthService');
    const svc = new AuthService();
    const token = svc.createToken({ sub: 'u1', type: 'google', email: 'a@b.c', isAdmin: true });
    const payload = svc.verifyToken(token);
    expect(payload).toMatchObject({ sub: 'u1', type: 'google', email: 'a@b.c', isAdmin: true });
  });

  test('verifyToken returns null for invalid token', async () => {
    const { AuthService } = await import('../AuthService');
    const svc = new AuthService();
    expect(svc.verifyToken('not-a-jwt')).toBeNull();
  });

  test('createAnonymousToken issues a token with type anonymous', async () => {
    const { AuthService } = await import('../AuthService');
    const svc = new AuthService();
    const token = svc.createAnonymousToken('u2');
    const payload = svc.verifyToken(token);
    expect(payload).toMatchObject({ sub: 'u2', type: 'anonymous' });
  });

  test('verifyGoogleToken returns null when GOOGLE_CLIENT_ID is not set', async () => {
    vi.resetModules();
    const prev = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    const { AuthService } = await import('../AuthService');
    const svc = new AuthService();
    const res = await svc.verifyGoogleToken('tok');
    expect(res).toBeNull();

    if (prev !== undefined) process.env.GOOGLE_CLIENT_ID = prev;
  });

  test('verifyGoogleToken returns payload when token is verified', async () => {
    vi.resetModules();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';

    vi.doMock('google-auth-library', () => {
      return {
        OAuth2Client: class {
          async verifyIdToken() {
            return {
              getPayload() {
                return { sub: 'gid', email: 'x@y.z', name: 'X' };
              },
            };
          }
        },
      };
    });

    const { AuthService } = await import('../AuthService');
    const svc = new AuthService();
    const res = await svc.verifyGoogleToken('tok');
    expect(res).toEqual({ googleId: 'gid', email: 'x@y.z', name: 'X' });
  });
});
