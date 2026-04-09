import { describe, expect, test, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthRoutes } from '../auth';
import { authService } from '../../services/AuthService';

type PrismaMock = {
  user: {
    upsert?: unknown;
    findFirst?: unknown;
    findUnique?: unknown;
    update?: unknown;
  };
  $transaction?: unknown;
};

function makeApp(prisma: PrismaMock) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRoutes(prisma as never));
  return app;
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
});
