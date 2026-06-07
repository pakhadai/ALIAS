import { describe, expect, test, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPushRoutes } from '../push';
import { authService } from '../../services/AuthService';

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock('../../config', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../config')>();
  return {
    ...orig,
    config: {
      ...orig.config,
      vapid: {
        publicKey: 'BPUBLIC_TEST_KEY',
        privateKey: 'BPRIVATE_TEST_KEY',
        email: 'mailto:test@alias.app',
      },
    },
  };
});

function makeApp(prisma: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use('/api/push', createPushRoutes(prisma as never));
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

describe('Push routes', () => {
  test('GET /api/push/vapid-key returns public key', async () => {
    const prisma = { pushSubscription: { upsert: vi.fn(), deleteMany: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/push/vapid-key');
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBe('BPUBLIC_TEST_KEY');
  });

  test('POST /api/push/subscribe validates payload', async () => {
    const prisma = { pushSubscription: { upsert: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/push/subscribe')
      .send({ endpoint: 'https://push.test' });
    expect(res.status).toBe(400);
    expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  test('POST /api/push/subscribe upserts subscription with auth userId', async () => {
    const prisma = {
      pushSubscription: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    const app = makeApp(prisma);

    const body = {
      endpoint: 'https://push.example/sub/1',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    };
    const res = await request(app).post('/api/push/subscribe').set(authHeader()).send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpoint: body.endpoint },
        create: expect.objectContaining({ userId: 'u1' }),
      })
    );
  });

  test('DELETE /api/push/unsubscribe requires endpoint', async () => {
    const prisma = { pushSubscription: { deleteMany: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app).delete('/api/push/unsubscribe').send({});
    expect(res.status).toBe(400);
  });

  test('DELETE /api/push/unsubscribe removes subscription', async () => {
    const prisma = {
      pushSubscription: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const app = makeApp(prisma);

    const endpoint = 'https://push.example/sub/1';
    const res = await request(app).delete('/api/push/unsubscribe').send({ endpoint });

    expect(res.status).toBe(200);
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { endpoint } });
  });
});
