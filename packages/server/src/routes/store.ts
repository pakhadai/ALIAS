import { Router, type IRouter } from 'express';
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

  return router;
}
