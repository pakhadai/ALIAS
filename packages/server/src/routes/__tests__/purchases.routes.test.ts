import { describe, expect, test, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authService } from '../../services/AuthService';

const PACK_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockConstructEvent = vi.hoisted(() => vi.fn());
const mockCheckoutCreate = vi.hoisted(() => vi.fn());
const mockCheckoutRetrieve = vi.hoisted(() => vi.fn());
const mockPaymentIntentCreate = vi.hoisted(() => vi.fn());
const mockPaymentIntentRetrieve = vi.hoisted(() => vi.fn());

vi.mock('stripe', () => ({
  default: class MockStripe {
    checkout = {
      sessions: {
        create: mockCheckoutCreate,
        retrieve: mockCheckoutRetrieve,
      },
    };
    paymentIntents = {
      create: mockPaymentIntentCreate,
      retrieve: mockPaymentIntentRetrieve,
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
    mockCheckoutRetrieve.mockReset();
    mockPaymentIntentCreate.mockReset();
    mockPaymentIntentRetrieve.mockReset();
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

  test('POST /api/purchases/checkout rejects invalid itemType with 400', async () => {
    const prisma = { purchase: { findFirst: vi.fn() }, wordPack: { findUnique: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/checkout')
      .set(authHeader())
      .send({ itemType: 'invalid', itemId: PACK_ID });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('itemType');
  });

  test('POST /api/purchases/checkout returns 409 when already purchased', async () => {
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
        findFirst: vi.fn().mockResolvedValue({ id: 'existing-purchase', status: 'completed' }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/checkout')
      .set(authHeader())
      .send({ itemType: 'wordPack', itemId: PACK_ID });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Already purchased');
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  test('POST /api/purchases/checkout returns 401 for invalid JWT', async () => {
    const prisma = { purchase: { findFirst: vi.fn() }, wordPack: { findUnique: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/checkout')
      .set({ Authorization: 'Bearer not-a-valid-token' })
      .send({ itemType: 'wordPack', itemId: PACK_ID });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid token');
  });

  test('GET /api/purchases/my returns completed purchases for authenticated user', async () => {
    const purchases = [
      {
        id: 'p1',
        status: 'completed',
        wordPack: { id: PACK_ID, slug: 'premium', name: 'Premium' },
      },
    ];
    const prisma = {
      purchase: {
        findMany: vi.fn().mockResolvedValue(purchases),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/purchases/my').set(authHeader('user-42'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(purchases);
    expect(prisma.purchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-42', status: 'completed' },
      })
    );
  });

  test('POST /api/purchases/claim idempotently claims free word pack', async () => {
    const prisma = {
      wordPack: {
        findUnique: vi.fn().mockResolvedValue({ isFree: true }),
      },
      purchase: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'free-purchase' }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/claim')
      .set(authHeader())
      .send({ itemType: 'wordPack', itemId: PACK_ID });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(prisma.purchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 0,
          paymentProvider: 'free',
          status: 'completed',
          wordPackId: PACK_ID,
        }),
      })
    );
  });

  test('POST /api/purchases/webhook/stripe ignores unknown event types without DB writes', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.created',
      data: { object: { id: 'cus_1' } },
    });

    const prisma = {
      purchase: {
        updateMany: vi.fn(),
        update: vi.fn(),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/webhook/stripe')
      .set('stripe-signature', 'valid_sig')
      .send({ id: 'evt_unknown' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(prisma.purchase.updateMany).not.toHaveBeenCalled();
  });

  test('POST /api/purchases/webhook/stripe is idempotent when purchase already completed', async () => {
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
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/purchases/webhook/stripe')
      .set('stripe-signature', 'valid_sig')
      .send({ id: 'evt_dup' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(prisma.purchase.updateMany).toHaveBeenCalledWith({
      where: { id: 'purchase-1', status: 'pending' },
      data: { status: 'completed' },
    });
  });

  test('POST /api/purchases/webhook/stripe completes purchase on payment_intent.succeeded', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          metadata: { purchaseId: 'purchase-pi-1' },
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
      .send({ id: 'evt_pi' });

    expect(res.status).toBe(200);
    expect(prisma.purchase.updateMany).toHaveBeenCalledWith({
      where: { id: 'purchase-pi-1', status: 'pending' },
      data: { status: 'completed' },
    });
  });

  test('POST /api/purchases/webhook/stripe abandons pending on checkout.session.expired', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.expired',
      data: {
        object: {
          metadata: { purchaseId: 'purchase-expired' },
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
      .send({ id: 'evt_expired' });

    expect(res.status).toBe(200);
    expect(prisma.purchase.updateMany).toHaveBeenCalledWith({
      where: { id: 'purchase-expired', status: 'pending' },
      data: { status: 'abandoned' },
    });
  });

  test('POST /api/purchases/webhook/stripe abandons pending on payment_intent.canceled', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.canceled',
      data: {
        object: {
          metadata: { purchaseId: 'purchase-cancel' },
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
      .send({ id: 'evt_cancel' });

    expect(res.status).toBe(200);
    expect(prisma.purchase.updateMany).toHaveBeenCalledWith({
      where: { id: 'purchase-cancel', status: 'pending' },
      data: { status: 'abandoned' },
    });
  });
});
