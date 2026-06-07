import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, test, vi } from 'vitest';
import { AuthService } from '../AuthService';
import { config } from '../../config';

function buildTelegramInitData(botToken: string, user: { id: number; first_name: string }): string {
  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set('user', JSON.stringify(user));
  params.set('auth_date', String(authDate));
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('AuthService', () => {
  test('createToken + verifyToken roundtrip', () => {
    const svc = new AuthService();
    const token = svc.createToken({ sub: 'u1', type: 'google', email: 'a@b.c', isAdmin: true });
    const payload = svc.verifyToken(token);
    expect(payload).toMatchObject({ sub: 'u1', type: 'google', email: 'a@b.c', isAdmin: true });
  });

  test('verifyToken returns null for invalid token', () => {
    const svc = new AuthService();
    expect(svc.verifyToken('not-a-jwt')).toBeNull();
  });

  test('createAnonymousToken issues a token with type anonymous', () => {
    const svc = new AuthService();
    const token = svc.createAnonymousToken('u2');
    const payload = svc.verifyToken(token);
    expect(payload).toMatchObject({ sub: 'u2', type: 'anonymous' });
  });

  test('verifyGoogleToken returns null when GOOGLE_CLIENT_ID is not set', async () => {
    vi.resetModules();
    const prev = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    const { AuthService: AuthServiceFresh } = await import('../AuthService');
    const svc = new AuthServiceFresh();
    const res = await svc.verifyGoogleToken('tok');
    expect(res).toBeNull();

    if (prev !== undefined) process.env.GOOGLE_CLIENT_ID = prev;
  });

  test('verifyToken returns null for expired JWT', () => {
    const svc = new AuthService();
    const expired = jwt.sign({ sub: 'u1', type: 'google', email: 'a@b.c' }, config.jwt.secret, {
      expiresIn: -10,
    });
    expect(svc.verifyToken(expired)).toBeNull();
  });

  test('validateTelegramInitData accepts valid HMAC signature', () => {
    const svc = new AuthService();
    const botToken = '123456:ABC-DEF';
    const initData = buildTelegramInitData(botToken, { id: 42, first_name: 'Test' });
    const parsed = svc.validateTelegramInitData(initData, botToken);
    expect(parsed.user?.id).toBe(42);
    expect(parsed.hash).toBeTruthy();
  });

  test('validateTelegramInitData rejects tampered hash', () => {
    const svc = new AuthService();
    const botToken = '123456:ABC-DEF';
    const initData = buildTelegramInitData(botToken, { id: 42, first_name: 'Test' });
    const tampered = initData.replace(/hash=[^&]+/, 'hash=deadbeef');
    expect(() => svc.validateTelegramInitData(tampered, botToken)).toThrow(/Invalid hash/);
  });

  test('validateTelegramInitData rejects missing hash', () => {
    const svc = new AuthService();
    expect(() => svc.validateTelegramInitData('auth_date=1', 'token')).toThrow(/Hash is missing/);
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

    const { AuthService: AuthServiceFresh } = await import('../AuthService');
    const svc = new AuthServiceFresh();
    const res = await svc.verifyGoogleToken('tok');
    expect(res).toEqual({ googleId: 'gid', email: 'x@y.z', name: 'X' });
  });
});
