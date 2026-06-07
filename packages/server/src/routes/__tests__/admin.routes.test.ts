import { describe, expect, test, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authService } from '../../services/AuthService';

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

    const res = await request(app)
      .get('/api/admin/live')
      .set('X-Forwarded-For', '10.8.0.5')
      .set('x-admin-key', 'test-admin-key');

    expect(res.status).toBe(200);
    expect(res.body.redisConnected).toBe(false);
    expect(res.body.activeRooms).toBe(0);
  });
});
