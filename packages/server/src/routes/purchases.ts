import { Router, type IRouter, type Request, type Response } from 'express';
import Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/AuthService';
import { config } from '../config';

const authService = new AuthService();

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

export function createPurchaseRoutes(prisma: PrismaClient): IRouter {
  const router: IRouter = Router();

  const stripe = config.stripe.secretKey
    ? new Stripe(config.stripe.secretKey)
    : null;

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

    // Fetch item details
    let itemName = '';
    let priceInCents = 0;

    if (itemType === 'wordPack') {
      const pack = await prisma.wordPack.findUnique({ where: { id: itemId } });
      if (!pack || pack.isFree) { res.status(404).json({ error: 'Pack not found or is free' }); return; }
      itemName = pack.name;
      priceInCents = pack.price;
    } else if (itemType === 'theme') {
      const theme = await prisma.theme.findUnique({ where: { id: itemId } });
      if (!theme || theme.isFree) { res.status(404).json({ error: 'Theme not found or is free' }); return; }
      itemName = theme.name;
      priceInCents = theme.price;
    } else if (itemType === 'soundPack') {
      const sp = await prisma.soundPack.findUnique({ where: { id: itemId } });
      if (!sp || sp.isFree) { res.status(404).json({ error: 'Sound pack not found or is free' }); return; }
      itemName = sp.name;
      priceInCents = sp.price;
    }

    if (priceInCents <= 0) {
      res.status(400).json({ error: 'Invalid price' });
      return;
    }

    // Create pending purchase record
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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `ALIAS — ${itemName}` },
          unit_amount: priceInCents,
        },
        quantity: 1,
      }],
      metadata: {
        purchaseId: purchase.id,
        userId,
        itemType,
        itemId,
      },
      success_url: `${config.stripe.successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: config.stripe.cancelUrl,
    });

    res.json({ checkoutUrl: session.url, purchaseId: purchase.id });
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
        config.stripe.webhookSecret,
      );
    } catch (err) {
      console.warn('[Stripe] Webhook signature failed:', (err as Error).message);
      res.status(400).send('Signature mismatch');
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const purchaseId = session.metadata?.purchaseId;

      if (purchaseId) {
        await prisma.purchase.update({
          where: { id: purchaseId },
          data: { status: 'completed' },
        });
        console.log(`[Purchase] Completed: ${purchaseId}`);
      }
    }

    res.json({ received: true });
  });

  // ─── Free claim ────────────────────────────────────────────────────────

  /**
   * POST /api/purchases/claim
   * Body: { itemType: 'wordPack'|'theme', itemId: string }
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

    let isFree = false;
    if (itemType === 'wordPack') {
      const pack = await prisma.wordPack.findUnique({ where: { id: itemId }, select: { isFree: true } });
      if (!pack) { res.status(404).json({ error: 'Not found' }); return; }
      isFree = pack.isFree;
    } else if (itemType === 'theme') {
      const theme = await prisma.theme.findUnique({ where: { id: itemId }, select: { isFree: true } });
      if (!theme) { res.status(404).json({ error: 'Not found' }); return; }
      isFree = theme.isFree;
    }

    if (!isFree) { res.status(400).json({ error: 'Item is not free' }); return; }

    // Idempotent — skip if already claimed
    const existing = await prisma.purchase.findFirst({
      where: {
        userId,
        status: 'completed',
        ...(itemType === 'wordPack' ? { wordPackId: itemId }
          : itemType === 'theme' ? { themeId: itemId }
          : { soundPackId: itemId }),
      },
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
  });

  // ─── My purchases ───────────────────────────────────────────────────────

  /**
   * GET /api/purchases/my
   * Returns all completed purchases for the current user.
   */
  router.get('/my', async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

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
  });

  return router;
}
