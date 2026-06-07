import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createStoreRoutes } from '../store';
import { authService } from '../../services/AuthService';

const PACK_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeApp(prisma: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use('/api/store', createStoreRoutes(prisma as never));
  return app;
}

function authHeader(userId = 'u1') {
  const token = authService.createToken({
    sub: userId,
    type: 'google',
    email: 'a@b.c',
    isAdmin: false,
  });
  return { Authorization: `Bearer ${token}` };
}

describe('Store routes', () => {
  test('GET /api/store returns catalog without auth', async () => {
    const prisma = {
      purchase: { findMany: vi.fn() },
      wordPack: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: PACK_ID,
            slug: 'general-ua',
            name: 'General UA',
            language: 'UA',
            category: 'General',
            difficulty: 'easy',
            price: 0,
            isFree: true,
            isDefault: true,
            wordCount: 100,
            description: null,
          },
        ]),
      },
      theme: { findMany: vi.fn().mockResolvedValue([]) },
      soundPack: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/store');
    expect(res.status).toBe(200);
    expect(res.body.wordPacks).toHaveLength(1);
    expect(res.body.wordPacks[0].owned).toBe(true);
    expect(prisma.purchase.findMany).not.toHaveBeenCalled();
  });

  test('GET /api/store marks owned items when JWT is provided', async () => {
    const prisma = {
      purchase: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ wordPackId: PACK_ID, themeId: null, soundPackId: null }]),
      },
      wordPack: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: PACK_ID,
            slug: 'paid-pack',
            name: 'Paid',
            language: 'UA',
            category: 'General',
            difficulty: 'easy',
            price: 499,
            isFree: false,
            isDefault: false,
            wordCount: 50,
            description: null,
          },
        ]),
      },
      theme: { findMany: vi.fn().mockResolvedValue([]) },
      soundPack: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/store').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.wordPacks[0].owned).toBe(true);
    expect(prisma.purchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', status: 'completed' } })
    );
  });

  test('POST /api/store/buy-stars requires auth', async () => {
    const prisma = { purchase: { findFirst: vi.fn() }, wordPack: { findUnique: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/store/buy-stars')
      .send({ itemType: 'wordPack', itemId: PACK_ID });

    expect(res.status).toBe(401);
  });

  test('POST /api/store/buy-stars returns 503 when Telegram bot is not configured', async () => {
    const prev = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;

    const prisma = { purchase: { findFirst: vi.fn() }, wordPack: { findUnique: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/store/buy-stars')
      .set(authHeader())
      .send({ itemType: 'wordPack', itemId: PACK_ID });

    expect(res.status).toBe(503);
    if (prev !== undefined) process.env.TELEGRAM_BOT_TOKEN = prev;
  });

  describe('POST /api/store/buy-stars with bot token', () => {
    const prevToken = process.env.TELEGRAM_BOT_TOKEN;
    const fetchMock = vi.fn();

    beforeEach(() => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot-test-token';
      vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
      if (prevToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = prevToken;
      else delete process.env.TELEGRAM_BOT_TOKEN;
      vi.unstubAllGlobals();
      fetchMock.mockReset();
    });

    test('should return invoiceUrl for paid word pack', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: 'https://t.me/$invoice123' }),
      });

      const prisma = {
        wordPack: {
          findUnique: vi.fn().mockResolvedValue({
            id: PACK_ID,
            name: 'Premium Pack',
            price: 299,
            isFree: false,
          }),
        },
        purchase: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'purchase-1' }),
        },
      };
      const app = makeApp(prisma);

      const res = await request(app)
        .post('/api/store/buy-stars')
        .set(authHeader())
        .send({ itemType: 'wordPack', itemId: PACK_ID });

      expect(res.status).toBe(200);
      expect(res.body.invoiceUrl).toBe('https://t.me/$invoice123');
      expect(res.body.purchaseId).toBe('purchase-1');
      expect(res.body.starsAmount).toBeGreaterThanOrEqual(1);
    });

    test('should reject invalid itemType', async () => {
      const prisma = { purchase: { findFirst: vi.fn() }, wordPack: { findUnique: vi.fn() } };
      const app = makeApp(prisma);

      const res = await request(app)
        .post('/api/store/buy-stars')
        .set(authHeader())
        .send({ itemType: 'invalid', itemId: PACK_ID });

      expect(res.status).toBe(400);
    });
  });
});
