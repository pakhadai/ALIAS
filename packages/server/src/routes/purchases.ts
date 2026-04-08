import { Router, type IRouter, type Request, type Response } from 'express';
import Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';
import { authService } from '../services/AuthService';
import { config } from '../config';

/** Require authenticated JWT */
function requireAuth(req: Request, res: Response): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const payload = authService.verifyToken(auth.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
  return payload.sub;
}

type StoreItemType = 'wordPack' | 'theme' | 'soundPack';

function purchaseRefWhere(itemType: StoreItemType, itemId: string) {
  if (itemType === 'wordPack') return { wordPackId: itemId };
  if (itemType === 'theme') return { themeId: itemId };
  return { soundPackId: itemId };
}

export function createPurchaseRoutes(prisma: PrismaClient): IRouter {
  const router: IRouter = Router();

  const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

  /** Fresh pending rows can reuse the same Stripe Checkout / PI instead of creating duplicates. */
  const PENDING_REUSE_TTL_MS = 30 * 60 * 1000;

  async function abandonPendingById(purchaseId: string | undefined | null): Promise<void> {
    if (!purchaseId) return;
    const { count } = await prisma.purchase.updateMany({
      where: { id: purchaseId, status: 'pending' },
      data: { status: 'abandoned' },
    });
    if (count > 0) console.log(`[Purchase] Abandoned: ${purchaseId}`);
  }

  async function tryReuseCheckout(
    userId: string,
    st: StoreItemType,
    itemId: string
  ): Promise<
    | { kind: 'reuse'; checkoutUrl: string; purchaseId: string }
    | { kind: 'already_purchased' }
    | null
  > {
    if (!stripe) return null;
    const recent = await prisma.purchase.findFirst({
      where: {
        userId,
        status: 'pending',
        ...purchaseRefWhere(st, itemId),
        createdAt: { gte: new Date(Date.now() - PENDING_REUSE_TTL_MS) },
        stripeCheckoutSessionId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!recent?.stripeCheckoutSessionId) return null;

    try {
      const sess = await stripe.checkout.sessions.retrieve(recent.stripeCheckoutSessionId);
      if (sess.status === 'open' && sess.url) {
        return { kind: 'reuse', checkoutUrl: sess.url, purchaseId: recent.id };
      }
      if (sess.status === 'complete') {
        await prisma.purchase.updateMany({
          where: { id: recent.id, status: 'pending' },
          data: { status: 'completed' },
        });
        return { kind: 'already_purchased' };
      }
    } catch (err) {
      console.warn('[Stripe] checkout.sessions.retrieve (reuse):', (err as Error).message);
    }

    await abandonPendingById(recent.id);
    return null;
  }

  async function tryReusePaymentIntent(
    userId: string,
    st: StoreItemType,
    itemId: string
  ): Promise<
    | { kind: 'reuse'; clientSecret: string; purchaseId: string }
    | { kind: 'already_purchased' }
    | null
  > {
    if (!stripe) return null;
    const recent = await prisma.purchase.findFirst({
      where: {
        userId,
        status: 'pending',
        ...purchaseRefWhere(st, itemId),
        createdAt: { gte: new Date(Date.now() - PENDING_REUSE_TTL_MS) },
        stripePaymentIntentId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!recent?.stripePaymentIntentId) return null;

    try {
      const pi = await stripe.paymentIntents.retrieve(recent.stripePaymentIntentId);
      if (pi.status === 'succeeded') {
        await prisma.purchase.updateMany({
          where: { id: recent.id, status: 'pending' },
          data: { status: 'completed' },
        });
        return { kind: 'already_purchased' };
      }
      if (
        (pi.status === 'requires_payment_method' ||
          pi.status === 'requires_confirmation' ||
          pi.status === 'requires_action') &&
        pi.client_secret
      ) {
        return { kind: 'reuse', clientSecret: pi.client_secret, purchaseId: recent.id };
      }
      if (pi.status === 'canceled') {
        await abandonPendingById(recent.id);
        return null;
      }
    } catch (err) {
      console.warn('[Stripe] paymentIntents.retrieve (reuse):', (err as Error).message);
    }

    await abandonPendingById(recent.id);
    return null;
  }

  // ─── Checkout ─────────────────────────────────────────────────────────

  /**
   * POST /api/purchases/checkout
   * Body: { itemType: 'wordPack'|'theme'|'soundPack', itemId: string }
   * Creates a Stripe Checkout Session and returns the checkout URL.
   */
  router.post('/checkout', async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    if (!stripe) {
      res.status(503).json({ error: 'Payment system not configured' });
      return;
    }

    const { itemType, itemId } = req.body as { itemType?: string; itemId?: string };
    if (!itemType || !itemId || !['wordPack', 'theme', 'soundPack'].includes(itemType)) {
      res.status(400).json({ error: 'itemType and itemId are required' });
      return;
    }

    try {
      // Fetch item details
      let itemName = '';
      let priceInCents = 0;

      if (itemType === 'wordPack') {
        const pack = await prisma.wordPack.findUnique({ where: { id: itemId } });
        if (!pack || pack.isFree) {
          res.status(404).json({ error: 'Pack not found or is free' });
          return;
        }
        itemName = pack.name;
        priceInCents = pack.price;
      } else if (itemType === 'theme') {
        const theme = await prisma.theme.findUnique({ where: { id: itemId } });
        if (!theme || theme.isFree) {
          res.status(404).json({ error: 'Theme not found or is free' });
          return;
        }
        itemName = theme.name;
        priceInCents = theme.price;
      } else if (itemType === 'soundPack') {
        const sp = await prisma.soundPack.findUnique({ where: { id: itemId } });
        if (!sp || sp.isFree) {
          res.status(404).json({ error: 'Sound pack not found or is free' });
          return;
        }
        itemName = sp.name;
        priceInCents = sp.price;
      }

      if (priceInCents <= 0) {
        res.status(400).json({ error: 'Invalid price' });
        return;
      }

      const st = itemType as StoreItemType;
      const already = await prisma.purchase.findFirst({
        where: { userId, status: 'completed', ...purchaseRefWhere(st, itemId) },
      });
      if (already) {
        res.status(409).json({ error: 'Already purchased' });
        return;
      }

      const reuseCheckout = await tryReuseCheckout(userId, st, itemId);
      if (reuseCheckout?.kind === 'already_purchased') {
        res.status(409).json({ error: 'Already purchased' });
        return;
      }
      if (reuseCheckout?.kind === 'reuse') {
        res.json({
          checkoutUrl: reuseCheckout.checkoutUrl,
          purchaseId: reuseCheckout.purchaseId,
          reused: true,
        });
        return;
      }

      const purchase = await prisma.purchase.create({
        data: {
          userId,
          amount: priceInCents,
          paymentProvider: 'stripe',
          status: 'pending',
          wordPackId: itemType === 'wordPack' ? itemId : null,
          themeId: itemType === 'theme' ? itemId : null,
          soundPackId: itemType === 'soundPack' ? itemId : null,
        },
      });

      try {
        const session = await stripe.checkout.sessions.create(
          {
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: { name: `ALIAS — ${itemName}` },
                  unit_amount: priceInCents,
                },
                quantity: 1,
              },
            ],
            metadata: {
              purchaseId: purchase.id,
              userId,
              itemType,
              itemId,
            },
            success_url: `${config.stripe.successUrl}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: config.stripe.cancelUrl,
          },
          { idempotencyKey: `checkout_${purchase.id}` }
        );

        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { stripeCheckoutSessionId: session.id },
        });

        res.json({ checkoutUrl: session.url, purchaseId: purchase.id });
      } catch (err) {
        console.warn('[Stripe] checkout.sessions.create failed:', (err as Error).message);
        await prisma.purchase.delete({ where: { id: purchase.id } }).catch(() => {});
        res.status(502).json({ error: 'Payment provider unavailable' });
      }
    } catch (err) {
      console.error('[Purchases] POST /checkout error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── Payment Intent (in-app quick pay) ────────────────────────────────

  /**
   * POST /api/purchases/payment-intent
   * Body: { itemType: 'wordPack'|'theme'|'soundPack', itemId: string }
   * Creates a Stripe PaymentIntent for in-app payment (Apple Pay / Google Pay / card).
   * Returns: { clientSecret, purchaseId, amount }
   */
  router.post('/payment-intent', async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    if (!stripe) {
      res.status(503).json({ error: 'Payment system not configured' });
      return;
    }

    const { itemType, itemId } = req.body as { itemType?: string; itemId?: string };
    if (!itemType || !itemId || !['wordPack', 'theme', 'soundPack'].includes(itemType)) {
      res.status(400).json({ error: 'itemType and itemId are required' });
      return;
    }

    try {
      let itemName = '';
      let priceInCents = 0;

      if (itemType === 'wordPack') {
        const pack = await prisma.wordPack.findUnique({ where: { id: itemId } });
        if (!pack || pack.isFree) {
          res.status(404).json({ error: 'Pack not found or is free' });
          return;
        }
        itemName = pack.name;
        priceInCents = pack.price;
      } else if (itemType === 'theme') {
        const theme = await prisma.theme.findUnique({ where: { id: itemId } });
        if (!theme || theme.isFree) {
          res.status(404).json({ error: 'Theme not found or is free' });
          return;
        }
        itemName = theme.name;
        priceInCents = theme.price;
      } else if (itemType === 'soundPack') {
        const sp = await prisma.soundPack.findUnique({ where: { id: itemId } });
        if (!sp || sp.isFree) {
          res.status(404).json({ error: 'Sound pack not found or is free' });
          return;
        }
        itemName = sp.name;
        priceInCents = sp.price;
      }

      if (priceInCents <= 0) {
        res.status(400).json({ error: 'Invalid price' });
        return;
      }

      const st = itemType as StoreItemType;
      const existing = await prisma.purchase.findFirst({
        where: { userId, status: 'completed', ...purchaseRefWhere(st, itemId) },
      });
      if (existing) {
        res.status(409).json({ error: 'Already purchased' });
        return;
      }

      const reusePi = await tryReusePaymentIntent(userId, st, itemId);
      if (reusePi?.kind === 'already_purchased') {
        res.status(409).json({ error: 'Already purchased' });
        return;
      }
      if (reusePi?.kind === 'reuse') {
        res.json({
          clientSecret: reusePi.clientSecret,
          purchaseId: reusePi.purchaseId,
          amount: priceInCents,
          itemName,
          reused: true,
        });
        return;
      }

      const purchase = await prisma.purchase.create({
        data: {
          userId,
          amount: priceInCents,
          paymentProvider: 'stripe',
          status: 'pending',
          wordPackId: itemType === 'wordPack' ? itemId : null,
          themeId: itemType === 'theme' ? itemId : null,
          soundPackId: itemType === 'soundPack' ? itemId : null,
        },
      });

      try {
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: priceInCents,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            description: `ALIAS — ${itemName}`,
            metadata: { purchaseId: purchase.id, userId, itemType, itemId },
          },
          { idempotencyKey: `pi_${purchase.id}` }
        );

        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { stripePaymentIntentId: paymentIntent.id },
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          purchaseId: purchase.id,
          amount: priceInCents,
          itemName,
        });
      } catch (err) {
        console.warn('[Stripe] paymentIntents.create failed:', (err as Error).message);
        await prisma.purchase.delete({ where: { id: purchase.id } }).catch(() => {});
        res.status(502).json({ error: 'Payment provider unavailable' });
      }
    } catch (err) {
      console.error('[Purchases] POST /payment-intent error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── Webhook ───────────────────────────────────────────────────────────

  /**
   * POST /api/webhooks/stripe
   * Stripe sends payment events here. Verifies signature and updates Purchase status.
   * NOTE: This route needs raw body — configured in index.ts before express.json()
   */
  router.post('/webhook/stripe', async (req, res) => {
    if (!stripe) {
      res.status(503).send('Not configured');
      return;
    }

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        (req as Request & { rawBody: Buffer }).rawBody || req.body,
        sig,
        config.stripe.webhookSecret
      );
    } catch (err) {
      console.warn('[Stripe] Webhook signature failed:', (err as Error).message);
      res.status(400).send('Signature mismatch');
      return;
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const purchaseId = session.metadata?.purchaseId;
        if (purchaseId) {
          const { count } = await prisma.purchase.updateMany({
            where: { id: purchaseId, status: 'pending' },
            data: { status: 'completed' },
          });
          if (count > 0) console.log(`[Purchase] Checkout completed: ${purchaseId}`);
        }
      }

      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as Stripe.PaymentIntent;
        const purchaseId = pi.metadata?.purchaseId;
        if (purchaseId) {
          const { count } = await prisma.purchase.updateMany({
            where: { id: purchaseId, status: 'pending' },
            data: { status: 'completed' },
          });
          if (count > 0) console.log(`[Purchase] PaymentIntent succeeded: ${purchaseId}`);
        }
      }

      if (event.type === 'checkout.session.expired') {
        const session = event.data.object as Stripe.Checkout.Session;
        await abandonPendingById(session.metadata?.purchaseId);
      }

      if (event.type === 'checkout.session.async_payment_failed') {
        const session = event.data.object as Stripe.Checkout.Session;
        await abandonPendingById(session.metadata?.purchaseId);
      }

      if (event.type === 'payment_intent.canceled') {
        const pi = event.data.object as Stripe.PaymentIntent;
        await abandonPendingById(pi.metadata?.purchaseId);
      }
    } catch (err) {
      console.error('[Purchases] webhook Prisma error:', err);
      res.status(500).send('Internal server error');
      return;
    }

    res.json({ received: true });
  });

  // ─── Free claim ────────────────────────────────────────────────────────

  /**
   * POST /api/purchases/claim
   * Body: { itemType: 'wordPack'|'theme'|'soundPack', itemId: string }
   * Instantly claims a free item for the current user (idempotent).
   */
  router.post('/claim', async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { itemType, itemId } = req.body as { itemType?: string; itemId?: string };
    if (!itemType || !itemId || !['wordPack', 'theme', 'soundPack'].includes(itemType)) {
      res.status(400).json({ error: 'itemType and itemId are required' });
      return;
    }

    try {
      let isFree = false;
      if (itemType === 'wordPack') {
        const pack = await prisma.wordPack.findUnique({
          where: { id: itemId },
          select: { isFree: true },
        });
        if (!pack) {
          res.status(404).json({ error: 'Not found' });
          return;
        }
        isFree = pack.isFree;
      } else if (itemType === 'theme') {
        const theme = await prisma.theme.findUnique({
          where: { id: itemId },
          select: { isFree: true },
        });
        if (!theme) {
          res.status(404).json({ error: 'Not found' });
          return;
        }
        isFree = theme.isFree;
      } else if (itemType === 'soundPack') {
        const sp = await prisma.soundPack.findUnique({
          where: { id: itemId },
          select: { isFree: true },
        });
        if (!sp) {
          res.status(404).json({ error: 'Not found' });
          return;
        }
        isFree = sp.isFree;
      }

      if (!isFree) {
        res.status(400).json({ error: 'Item is not free' });
        return;
      }

      const st = itemType as StoreItemType;
      const existing = await prisma.purchase.findFirst({
        where: { userId, status: 'completed', ...purchaseRefWhere(st, itemId) },
      });

      if (!existing) {
        await prisma.purchase.create({
          data: {
            userId,
            amount: 0,
            paymentProvider: 'free',
            status: 'completed',
            wordPackId: itemType === 'wordPack' ? itemId : null,
            themeId: itemType === 'theme' ? itemId : null,
            soundPackId: itemType === 'soundPack' ? itemId : null,
          },
        });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('[Purchases] POST /claim error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── My purchases ───────────────────────────────────────────────────────

  /**
   * GET /api/purchases/my
   * Returns all completed purchases for the current user.
   */
  router.get('/my', async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    try {
      const purchases = await prisma.purchase.findMany({
        where: { userId, status: 'completed' },
        include: {
          wordPack: { select: { id: true, slug: true, name: true } },
          theme: { select: { id: true, slug: true, name: true } },
          soundPack: { select: { id: true, slug: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(purchases);
    } catch (err) {
      console.error('[Purchases] GET /my error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
