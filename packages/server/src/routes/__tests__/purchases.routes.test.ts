import { describe, expect, test, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authService } from '../../services/AuthService';

const PACK_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockConstructEvent = vi.hoisted(() => vi.fn());
const mockCheckoutCreate = vi.hoisted(() => vi.fn());

vi.mock('stripe', () => ({
  default: class MockStripe {
    checkout = {
      sessions: {
        create: mockCheckoutCreate,
        retrieve: vi.fn(),
      },
    };
    paymentIntents = {
      create: vi.fn(),
      retrieve: vi.fn(),
    };
    webhooks = {
      constructEvent: mockConstructEvent,
    };
  },
}));

vi.mock('../../config', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../config')>();
  return {
    ...orig,
    config: {
      ...orig.config,
      nodeEnv: 'test',
      stripe: {
        secretKey: 'sk_test_mock',
        webhookSecret: 'whsec_test_mock',
        successUrl: 'http://localhost:5173/?purchase=success',
        cancelUrl: 'http://localhost:5173/?purchase=cancelled',
      },
    },
  };
});

import { createPurchaseRoutes } from '../purchases';

function makeApp(prisma: Record<string, unknown>) {
  const app = express();
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );
  app.use('/api/purchases', createPurchaseRoutes(prisma as never));
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

describe('Purchases routes', () => {
  beforeEach(() => {
    mockConstructEvent.mockReset();
    mockCheckoutCreate.mockReset();
    mockCheckoutCreate.mockResolvedValue({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.test/session',
    });
  });

  test('POST /api/purchases/checkout requires auth', async () => {
    const prisma = { purchase: { findFirst: vi.fn() }, wordPack: { findUnique: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/checkout')
      .send({ itemType: 'wordPack', itemId: PACK_ID });

    expect(res.status).toBe(401);
  });

  test('POST /api/purchases/checkout creates Stripe session for paid pack', async () => {
    const prisma = {
      wordPack: {
        findUnique: vi.fn().mockResolvedValue({
          id: PACK_ID,
          name: 'Premium',
          price: 499,
          isFree: false,
        }),
      },
      purchase: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'purchase-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/checkout')
      .set(authHeader())
      .send({ itemType: 'wordPack', itemId: PACK_ID });

    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toContain('stripe');
    expect(res.body.purchaseId).toBe('purchase-1');
    expect(mockCheckoutCreate).toHaveBeenCalled();
  });

  test('POST /api/purchases/webhook/stripe rejects invalid signature with 400', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Signature mismatch');
    });

    const prisma = { purchase: { updateMany: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/webhook/stripe')
      .set('stripe-signature', 'bad_sig')
      .send({ type: 'checkout.session.completed' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Signature');
    expect(prisma.purchase.updateMany).not.toHaveBeenCalled();
  });

  test('POST /api/purchases/webhook/stripe completes purchase on valid event', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { purchaseId: 'purchase-1' },
        },
      },
    });

    const prisma = {
      purchase: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/webhook/stripe')
      .set('stripe-signature', 'valid_sig')
      .send({ id: 'evt_1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(prisma.purchase.updateMany).toHaveBeenCalledWith({
      where: { id: 'purchase-1', status: 'pending' },
      data: { status: 'completed' },
    });
  });

  test('POST /api/purchases/claim requires auth', async () => {
    const prisma = { wordPack: { findUnique: vi.fn() }, purchase: { findFirst: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/claim')
      .send({ itemType: 'wordPack', itemId: PACK_ID });

    expect(res.status).toBe(401);
  });

  test('POST /api/purchases/claim rejects non-free items', async () => {
    const prisma = {
      wordPack: {
        findUnique: vi.fn().mockResolvedValue({ isFree: false }),
      },
      purchase: { findFirst: vi.fn() },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/claim')
      .set(authHeader())
      .send({ itemType: 'wordPack', itemId: PACK_ID });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('not free');
  });
});
