import { describe, expect, test, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authService } from '../../services/AuthService';

vi.mock('../push', () => ({
  broadcastPush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../config', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../config')>();
  return {
    ...orig,
    config: {
      ...orig.config,
      nodeEnv: 'test',
      adminAllowedIps: ['10.8.0.0/24'],
      adminApiKey: 'test-admin-key',
      adminAllowedEmails: [],
    },
  };
});

import { createAdminRoutes } from '../admin';

function makeApp(prisma: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', createAdminRoutes(prisma as never, null));
  return app;
}

function userJwt(userId = 'admin-u1', isAdmin = true) {
  const token = authService.createToken({
    sub: userId,
    type: 'google',
    email: 'admin@test.com',
    isAdmin,
  });
  return { Authorization: `Bearer ${token}` };
}

function adminHeaders() {
  return {
    'X-Forwarded-For': '10.8.0.5',
    'x-admin-key': 'test-admin-key',
  };
}

describe('Admin routes', () => {
  test('returns 403 when client IP is not on whitelist', async () => {
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: { findMany: vi.fn() },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/admin/packs');
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('VPN');
  });

  test('returns 401 without credentials even when IP would pass', async () => {
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: { findMany: vi.fn() },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/admin/packs').set('X-Forwarded-For', '10.8.0.5');

    expect(res.status).toBe(401);
  });

  test('returns 403 for invalid x-admin-key', async () => {
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: { findMany: vi.fn() },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .get('/api/admin/packs')
      .set('X-Forwarded-For', '10.8.0.5')
      .set('x-admin-key', 'wrong-key');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('admin key');
  });

  test('allows access with valid x-admin-key', async () => {
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: {
        findMany: vi.fn().mockResolvedValue([{ id: 'pack-1', name: 'General', slug: 'general' }]),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .get('/api/admin/packs')
      .set('X-Forwarded-For', '10.8.0.5')
      .set('x-admin-key', 'test-admin-key');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('allows JWT admin user on whitelisted IP', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ email: 'admin@test.com', isAdmin: true }),
      },
      wordPack: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .get('/api/admin/packs')
      .set('X-Forwarded-For', '10.8.0.5')
      .set(userJwt());

    expect(res.status).toBe(200);
    expect(prisma.user.findUnique).toHaveBeenCalled();
  });

  test('GET /api/admin/live works without Redis', async () => {
    const prisma = { user: { findUnique: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/admin/live').set(adminHeaders());

    expect(res.status).toBe(200);
    expect(res.body.redisConnected).toBe(false);
    expect(res.body.activeRooms).toBe(0);
  });

  test('returns 401 for invalid JWT even on whitelisted IP', async () => {
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: { findMany: vi.fn() },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .get('/api/admin/packs')
      .set('X-Forwarded-For', '10.8.0.5')
      .set({ Authorization: 'Bearer not-a-valid-token' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  test('returns 401 for anonymous JWT user', async () => {
    const anonToken = authService.createToken({
      sub: 'anon-u1',
      type: 'anonymous',
    });
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: { findMany: vi.fn() },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .get('/api/admin/packs')
      .set('X-Forwarded-For', '10.8.0.5')
      .set({ Authorization: `Bearer ${anonToken}` });

    expect(res.status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('POST /api/admin/packs creates word pack', async () => {
    const created = {
      id: 'pack-new',
      slug: 'test-pack',
      name: 'Test Pack',
      language: 'UA',
      category: 'general',
      price: 299,
      isFree: false,
    };
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: {
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).post('/api/admin/packs').set(adminHeaders()).send({
      slug: 'test-pack',
      name: 'Test Pack',
      language: 'UA',
      category: 'general',
      price: 299,
      isFree: false,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
    expect(prisma.wordPack.create).toHaveBeenCalled();
  });

  test('POST /api/admin/packs rejects missing required fields', async () => {
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: { create: vi.fn() },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/admin/packs')
      .set(adminHeaders())
      .send({ slug: 'only-slug' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
    expect(prisma.wordPack.create).not.toHaveBeenCalled();
  });

  test('GET /api/admin/packs/:id returns pack with words', async () => {
    const pack = {
      id: 'pack-1',
      slug: 'general',
      name: 'General',
      concepts: [
        {
          id: 'concept-1',
          conceptKey: 'apple',
          translations: [{ word: 'Яблуко' }],
        },
      ],
    };
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: {
        findUnique: vi.fn().mockResolvedValue(pack),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/admin/packs/pack-1').set(adminHeaders());

    expect(res.status).toBe(200);
    expect(res.body.words).toHaveLength(1);
    expect(res.body.words[0].text).toBe('Яблуко');
  });

  test('GET /api/admin/packs/:id returns 404 when pack missing', async () => {
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/admin/packs/missing').set(adminHeaders());

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found');
  });

  test('PUT /api/admin/packs/:id updates pack metadata', async () => {
    const updated = {
      id: 'pack-1',
      name: 'Renamed Pack',
      price: 399,
      isFree: false,
    };
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: {
        update: vi.fn().mockResolvedValue(updated),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .put('/api/admin/packs/pack-1')
      .set(adminHeaders())
      .send({ name: 'Renamed Pack', price: 399 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed Pack');
    expect(prisma.wordPack.update).toHaveBeenCalledWith({
      where: { id: 'pack-1' },
      data: expect.objectContaining({ name: 'Renamed Pack', price: 399 }),
    });
  });

  test('DELETE /api/admin/packs/:id deletes pack', async () => {
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: {
        delete: vi.fn().mockResolvedValue({ id: 'pack-1' }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).delete('/api/admin/packs/pack-1').set(adminHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(prisma.wordPack.delete).toHaveBeenCalledWith({ where: { id: 'pack-1' } });
  });

  test('POST /api/admin/packs/:id/words bulk-adds words to pack', async () => {
    const txMock = {
      wordConcept: {
        create: vi.fn().mockResolvedValue({ id: 'c1' }),
        count: vi.fn().mockResolvedValue(2),
      },
      wordTranslation: {
        create: vi.fn().mockResolvedValue({}),
      },
      wordPack: {
        update: vi.fn().mockResolvedValue({ wordCount: 2 }),
      },
    };
    const prisma = {
      user: { findUnique: vi.fn() },
      wordPack: {
        findUnique: vi.fn().mockResolvedValue({ id: 'pack-1', language: 'UA' }),
      },
      wordConcept: {
        count: vi.fn().mockResolvedValue(2),
      },
      $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<void>) => fn(txMock)),
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/admin/packs/pack-1/words')
      .set(adminHeaders())
      .send({ words: ['Слово1', 'Слово2'] });

    expect(res.status).toBe(201);
    expect(res.body.added).toBe(2);
    expect(res.body.totalWords).toBe(2);
    expect(txMock.wordConcept.create).toHaveBeenCalledTimes(2);
  });
});
