import crypto from 'crypto';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthRoutes } from '../auth';
import { authService } from '../../services/AuthService';

const BOT_TOKEN = '123456:ABC-DEF';

type PrismaMock = {
  user: {
    upsert?: unknown;
    findFirst?: unknown;
    findUnique?: unknown;
    update?: unknown;
  };
  purchase?: { updateMany?: unknown };
  customDeck?: { updateMany?: unknown };
  $transaction?: unknown;
};

function makeApp(prisma: PrismaMock) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRoutes(prisma as never));
  return app;
}

function authHeader(
  userId = 'u1',
  type: 'google' | 'telegram' | 'anonymous' = 'google',
  extra: { email?: string; isAdmin?: boolean } = {}
) {
  const token = authService.createToken({
    sub: userId,
    type,
    email: extra.email ?? 'a@b.c',
    isAdmin: extra.isAdmin ?? false,
  });
  return { Authorization: `Bearer ${token}` };
}

function buildTelegramInitData(
  botToken: string,
  user: { id: number; first_name: string; photo_url?: string }
): string {
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

describe('Auth routes', () => {
  test('POST /api/auth/anonymous validates deviceId', async () => {
    const prisma = { user: { upsert: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app).post('/api/auth/anonymous').send({ deviceId: 'short' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.stringContaining('deviceId') });
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  test('POST /api/auth/anonymous returns token and userId', async () => {
    const prisma = {
      user: {
        upsert: vi.fn().mockResolvedValue({ id: 'u1' }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).post('/api/auth/anonymous').send({ deviceId: 'dev_1234567890' });
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u1');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(10);
  });

  test('POST /api/auth/anonymous handles P2002 by reading existing user', async () => {
    const prisma = {
      user: {
        upsert: vi.fn().mockRejectedValue({ code: 'P2002' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'u_existing' }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).post('/api/auth/anonymous').send({ deviceId: 'dev_1234567890' });
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u_existing');
    expect(typeof res.body.token).toBe('string');
  });

  test('GET /api/auth/lobby-settings requires JWT', async () => {
    const prisma = { user: { findUnique: vi.fn() } };
    const app = makeApp(prisma);
    const res = await request(app).get('/api/auth/lobby-settings');
    expect(res.status).toBe(401);
  });

  test('PUT /api/auth/lobby-settings rejects invalid settings', async () => {
    const prisma = { user: { update: vi.fn() } };
    const app = makeApp(prisma);
    const token = authService.createToken({
      sub: 'u1',
      type: 'google',
      email: 'a@b.c',
      isAdmin: false,
    });

    const res = await request(app)
      .put('/api/auth/lobby-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ general: { scoreToWin: 1 } }); // below minimum (>=5)

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('PUT /api/auth/lobby-settings accepts valid partial settings and persists', async () => {
    const prisma = { user: { update: vi.fn().mockResolvedValue({}) } };
    const app = makeApp(prisma);
    const token = authService.createToken({
      sub: 'u1',
      type: 'google',
      email: 'a@b.c',
      isAdmin: false,
    });

    const body = { general: { scoreToWin: 10, teamCount: 2 } };
    const res = await request(app)
      .put('/api/auth/lobby-settings')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { defaultSettings: expect.any(Object) },
      })
    );
  });

  test('PATCH /api/auth/profile persists skipNamePrompt for OAuth users', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ authProvider: 'google' }),
        update: vi.fn().mockResolvedValue({
          displayName: 'Alice',
          avatarId: '1',
          skipNamePrompt: true,
        }),
      },
    };
    const app = makeApp(prisma);
    const token = authService.createToken({
      sub: 'u1',
      type: 'google',
      email: 'a@b.c',
      isAdmin: false,
    });

    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ skipNamePrompt: true });

    expect(res.status).toBe(200);
    expect(res.body.skipNamePrompt).toBe(true);
  });

  test('PATCH /api/auth/profile requires JWT', async () => {
    const prisma = { user: { update: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app).patch('/api/auth/profile').send({ displayName: 'Bob' });
    expect(res.status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('PATCH /api/auth/profile strips HTML tags from displayName', async () => {
    const prisma = {
      user: {
        update: vi.fn().mockResolvedValue({
          displayName: 'Alice',
          avatarId: null,
          avatarUrl: null,
          skipNamePrompt: false,
        }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .patch('/api/auth/profile')
      .set(authHeader())
      .send({ displayName: '<b>Alice</b>' });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { displayName: 'Alice' },
      })
    );
    expect(res.body.displayName).toBe('Alice');
  });

  test('GET /api/auth/me requires JWT', async () => {
    const prisma = { user: { findUnique: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('GET /api/auth/me returns profile for authenticated user', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u1',
          email: 'a@b.c',
          authProvider: 'google',
          name: 'Alice',
          avatarUrl: null,
          displayName: 'Alice',
          avatarId: '2',
          skipNamePrompt: false,
          isAdmin: false,
          createdAt,
          statsGamesPlayed: 3,
          statsWordsGuessed: 10,
          statsWordsSkipped: 2,
          statsLastPlayedAt: null,
          purchases: [],
        }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/auth/me').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'u1',
      email: 'a@b.c',
      displayName: 'Alice',
      playerStats: { gamesPlayed: 3, wordsGuessed: 10, wordsSkipped: 2, lastPlayed: '' },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } })
    );
  });

  test('PUT /api/auth/lobby-settings returns 401 without JWT (guest)', async () => {
    const prisma = { user: { update: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .put('/api/auth/lobby-settings')
      .send({ general: { scoreToWin: 10 } });

    expect(res.status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('GET /api/auth/lobby-settings returns saved defaults', async () => {
    const settings = { general: { scoreToWin: 15, teamCount: 2 } };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ defaultSettings: settings }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/auth/lobby-settings').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.settings).toEqual(settings);
  });

  describe('POST /api/auth/profile/sync-telegram-avatar', () => {
    beforeEach(() => {
      process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
    });

    afterEach(() => {
      delete process.env.TELEGRAM_BOT_TOKEN;
    });

    test('requires JWT', async () => {
      const prisma = { user: { findUnique: vi.fn(), update: vi.fn() } };
      const app = makeApp(prisma);
      const initData = buildTelegramInitData(BOT_TOKEN, { id: 42, first_name: 'T' });

      const res = await request(app)
        .post('/api/auth/profile/sync-telegram-avatar')
        .send({ initData });

      expect(res.status).toBe(401);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    test('syncs avatarUrl from valid initData for Telegram account', async () => {
      const photoUrl = 'https://t.me/i/userpic/320/abc.jpg';
      const initData = buildTelegramInitData(BOT_TOKEN, {
        id: 42,
        first_name: 'Tele',
        photo_url: photoUrl,
      });
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            telegramId: '42',
            authProvider: 'telegram',
          }),
          update: vi.fn().mockResolvedValue({
            avatarUrl: photoUrl,
            avatarId: null,
          }),
        },
      };
      const app = makeApp(prisma);

      const res = await request(app)
        .post('/api/auth/profile/sync-telegram-avatar')
        .set(authHeader('u_tg', 'telegram'))
        .send({ initData });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ avatarUrl: photoUrl, avatarId: null });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u_tg' },
          data: { avatarId: null, avatarUrl: photoUrl },
        })
      );
    });

    test('rejects invalid HMAC initData', async () => {
      const initData = buildTelegramInitData(BOT_TOKEN, { id: 42, first_name: 'T' });
      const tampered = initData.replace(/hash=[^&]+/, 'hash=deadbeef');
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            telegramId: '42',
            authProvider: 'telegram',
          }),
          update: vi.fn(),
        },
      };
      const app = makeApp(prisma);

      const res = await request(app)
        .post('/api/auth/profile/sync-telegram-avatar')
        .set(authHeader('u_tg', 'telegram'))
        .send({ initData: tampered });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid hash/i);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    test('rejects non-Telegram accounts', async () => {
      const initData = buildTelegramInitData(BOT_TOKEN, { id: 42, first_name: 'T' });
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ telegramId: null, authProvider: 'google' }),
          update: vi.fn(),
        },
      };
      const app = makeApp(prisma);

      const res = await request(app)
        .post('/api/auth/profile/sync-telegram-avatar')
        .set(authHeader())
        .send({ initData });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Telegram avatar sync/i);
    });
  });

  describe('POST /api/auth/telegram', () => {
    beforeEach(() => {
      process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
    });

    afterEach(() => {
      delete process.env.TELEGRAM_BOT_TOKEN;
    });

    test('returns 401 for invalid initData HMAC', async () => {
      const prisma = { user: { upsert: vi.fn() } };
      const app = makeApp(prisma);
      const initData = buildTelegramInitData(BOT_TOKEN, { id: 99, first_name: 'X' });
      const tampered = initData.replace(/hash=[^&]+/, 'hash=bad');

      const res = await request(app).post('/api/auth/telegram').send({ initData: tampered });

      expect(res.status).toBe(401);
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });

    test('creates user and returns JWT for valid initData', async () => {
      const prisma = {
        user: {
          upsert: vi.fn().mockResolvedValue({ id: 'u_tg', isAdmin: false }),
        },
      };
      const app = makeApp(prisma);
      const initData = buildTelegramInitData(BOT_TOKEN, {
        id: 77,
        first_name: 'Movli',
        photo_url: 'https://t.me/photo.jpg',
      });

      const res = await request(app).post('/api/auth/telegram').send({ initData });

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('u_tg');
      expect(typeof res.body.token).toBe('string');
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { telegramId: '77' },
        })
      );
    });
  });

  test('POST /api/auth/player-stats/delta increments counters for authenticated user', async () => {
    const now = new Date('2026-06-13T12:00:00.000Z');
    const prisma = {
      user: {
        update: vi.fn().mockResolvedValue({
          statsGamesPlayed: 4,
          statsWordsGuessed: 12,
          statsWordsSkipped: 3,
          statsLastPlayedAt: now,
        }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/auth/player-stats/delta')
      .set(authHeader())
      .send({ gamesPlayed: 1, wordsGuessed: 2, wordsSkipped: 1 });

    expect(res.status).toBe(200);
    expect(res.body.playerStats).toMatchObject({
      gamesPlayed: 4,
      wordsGuessed: 12,
      wordsSkipped: 3,
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          statsGamesPlayed: { increment: 1 },
          statsWordsGuessed: { increment: 2 },
          statsWordsSkipped: { increment: 1 },
        }),
      })
    );
  });
});
