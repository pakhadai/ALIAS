import { Router, type IRouter, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';

type StoreWordPackRow = {
  id: string;
  slug: string;
  name: string;
  language: string;
  category: string;
  difficulty: string;
  price: number;
  isFree: boolean;
  isDefault: boolean;
  wordCount: number;
  description: string | null;
};

type StoreThemeRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  isFree: boolean;
  config: unknown;
};

type StoreSoundPackRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  isFree: boolean;
  config: unknown;
};
import { authService } from '../services/AuthService';

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

async function createTelegramInvoiceLink(params: {
  botToken: string;
  title: string;
  description: string;
  payload: string;
  currency: 'XTR';
  amount: number;
}): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${params.botToken}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      description: params.description,
      payload: params.payload,
      currency: params.currency,
      prices: [{ label: params.title, amount: params.amount }],
    }),
  });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; result: string }
    | { ok: false; description?: string };
  if (!res.ok || !json || !('ok' in json) || json.ok !== true) {
    const desc = json && 'description' in json ? json.description : res.statusText;
    throw new Error(desc || 'Telegram createInvoiceLink failed');
  }
  return json.result;
}

export function createStoreRoutes(prisma: PrismaClient): IRouter {
  const router: IRouter = Router();

  /**
   * GET /api/store
   * Optional Authorization header — if provided, marks which items are already owned.
   * Returns: { wordPacks, themes, soundPacks }
   */
  router.get('/', async (req, res) => {
    try {
      // Optionally resolve user for ownership check
      let userId: string | null = null;
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        const payload = authService.verifyToken(auth.slice(7));
        if (payload) userId = payload.sub;
      }

      // Get purchased IDs for this user
      const purchasedWordPackIds = new Set<string>();
      const purchasedThemeIds = new Set<string>();
      const purchasedSoundPackIds = new Set<string>();

      if (userId) {
        const purchases = await prisma.purchase.findMany({
          where: { userId, status: 'completed' },
          select: { wordPackId: true, themeId: true, soundPackId: true },
        });
        for (const p of purchases) {
          if (p.wordPackId) purchasedWordPackIds.add(p.wordPackId);
          if (p.themeId) purchasedThemeIds.add(p.themeId);
          if (p.soundPackId) purchasedSoundPackIds.add(p.soundPackId);
        }
      }

      const [wordPacks, themes, soundPacks] = await Promise.all([
        prisma.wordPack.findMany({
          orderBy: [{ language: 'asc' }, { category: 'asc' }],
          select: {
            id: true,
            slug: true,
            name: true,
            language: true,
            category: true,
            difficulty: true,
            price: true,
            isFree: true,
            isDefault: true,
            wordCount: true,
            description: true,
          },
        }),
        prisma.theme.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, slug: true, name: true, price: true, isFree: true, config: true },
        }),
        prisma.soundPack.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, slug: true, name: true, price: true, isFree: true, config: true },
        }),
      ]);

      res.json({
        wordPacks: wordPacks.map((p: StoreWordPackRow) => ({
          ...p,
          owned: p.isDefault || purchasedWordPackIds.has(p.id),
        })),
        themes: themes.map((t: StoreThemeRow) => ({ ...t, owned: purchasedThemeIds.has(t.id) })),
        soundPacks: soundPacks.map((s: StoreSoundPackRow) => ({
          ...s,
          owned: purchasedSoundPackIds.has(s.id),
        })),
      });
    } catch (err) {
      console.error('[Store] GET / error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/store/buy-stars
   * Body: { itemType: 'wordPack'|'theme'|'soundPack', itemId: string }
   *
   * Returns: { invoiceUrl, purchaseId, starsAmount }
   */
  router.post('/buy-stars', async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!botToken) {
      res.status(503).json({ error: 'Telegram bot is not configured' });
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
      const already = await prisma.purchase.findFirst({
        where: { userId, status: 'completed', ...purchaseRefWhere(st, itemId) },
      });
      if (already) {
        res.status(409).json({ error: 'Already purchased' });
        return;
      }

      // Minimal mapping: cents → stars (rounded). Adjust later if you introduce a dedicated pricing table.
      const starsAmount = Math.max(1, Math.round(priceInCents / 100));

      const purchase = await prisma.purchase.create({
        data: {
          userId,
          amount: starsAmount,
          paymentProvider: 'telegram_stars',
          status: 'pending',
          wordPackId: itemType === 'wordPack' ? itemId : null,
          themeId: itemType === 'theme' ? itemId : null,
          soundPackId: itemType === 'soundPack' ? itemId : null,
        },
      });

      const invoiceUrl = await createTelegramInvoiceLink({
        botToken,
        title: `ALIAS — ${itemName}`,
        description: 'Оплата через Telegram Stars',
        payload: purchase.id,
        currency: 'XTR',
        amount: starsAmount,
      });

      res.json({ invoiceUrl, purchaseId: purchase.id, starsAmount });
    } catch (err) {
      console.error('[Store] POST /buy-stars error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
