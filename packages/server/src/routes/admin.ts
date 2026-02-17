import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { AuthService } from '../services/AuthService';

const authService = new AuthService();

export function createAdminRoutes(prisma: PrismaClient): IRouter {
  const router: IRouter = Router();

  // Admin auth: accept API key OR user JWT with isAdmin: true
  function adminAuth(req: Request, res: Response, next: NextFunction): void {
    // API key fallback (for CLI / direct API access)
    if (req.headers['x-admin-key'] === config.adminApiKey) {
      next();
      return;
    }
    // JWT-based admin access
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const payload = authService.verifyToken(auth.slice(7));
      if (payload?.isAdmin) {
        next();
        return;
      }
    }
    res.status(401).json({ error: 'Unauthorized' });
  }

  router.use(adminAuth);
  // ─── WordPacks ──────────────────────────────────────────────────────

  /** GET /api/admin/packs — list all packs */
  router.get('/packs', async (_req, res) => {
    const packs = await prisma.wordPack.findMany({
      orderBy: [{ language: 'asc' }, { category: 'asc' }],
      select: {
        id: true, slug: true, name: true, language: true, category: true,
        difficulty: true, version: true, price: true, isFree: true,
        wordCount: true, description: true, createdAt: true, updatedAt: true,
      },
    });
    res.json(packs);
  });

  /** GET /api/admin/packs/:id — get pack with words */
  router.get('/packs/:id', async (req, res) => {
    const pack = await prisma.wordPack.findUnique({
      where: { id: req.params.id },
      include: { words: { select: { id: true, text: true } } },
    });
    if (!pack) {
      res.status(404).json({ error: 'Pack not found' });
      return;
    }
    res.json(pack);
  });

  /** POST /api/admin/packs — create a new pack */
  router.post('/packs', async (req, res) => {
    const { slug, name, language, category, difficulty, price, isFree, description } = req.body;
    if (!slug || !name || !language || !category) {
      res.status(400).json({ error: 'slug, name, language, category are required' });
      return;
    }
    const pack = await prisma.wordPack.create({
      data: { slug, name, language, category, difficulty, price, isFree, description },
    });
    res.status(201).json(pack);
  });

  /** PUT /api/admin/packs/:id — update pack metadata */
  router.put('/packs/:id', async (req, res) => {
    const { name, difficulty, price, isFree, description } = req.body;
    const pack = await prisma.wordPack.update({
      where: { id: req.params.id },
      data: { name, difficulty, price, isFree, description },
    });
    res.json(pack);
  });

  /** DELETE /api/admin/packs/:id — delete pack and its words */
  router.delete('/packs/:id', async (req, res) => {
    await prisma.wordPack.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  /** DELETE /api/admin/packs/:packId/words/:wordId — delete a single word */
  router.delete('/packs/:packId/words/:wordId', async (req, res) => {
    const { packId, wordId } = req.params;
    const pack = await prisma.wordPack.findUnique({ where: { id: packId } });
    if (!pack) { res.status(404).json({ error: 'Pack not found' }); return; }
    await prisma.word.delete({ where: { id: wordId } });
    const count = await prisma.word.count({ where: { packId } });
    await prisma.wordPack.update({ where: { id: packId }, data: { wordCount: count } });
    res.json({ ok: true, totalWords: count });
  });

  /** POST /api/admin/packs/:id/words — bulk add words to a pack */
  router.post('/packs/:id/words', async (req, res) => {
    const { words } = req.body as { words?: string[] };
    if (!Array.isArray(words) || words.length === 0) {
      res.status(400).json({ error: 'words must be a non-empty array of strings' });
      return;
    }

    const packId = req.params.id;
    const pack = await prisma.wordPack.findUnique({ where: { id: packId } });
    if (!pack) {
      res.status(404).json({ error: 'Pack not found' });
      return;
    }

    const uniqueWords = [...new Set(words.map(w => w.trim()).filter(Boolean))];

    const result = await prisma.word.createMany({
      data: uniqueWords.map(text => ({ text, packId })),
      skipDuplicates: true,
    });

    // Update word count
    const count = await prisma.word.count({ where: { packId } });
    await prisma.wordPack.update({
      where: { id: packId },
      data: { wordCount: count },
    });

    res.status(201).json({ added: result.count, totalWords: count });
  });

  // ─── Themes ─────────────────────────────────────────────────────────

  /** GET /api/admin/themes — list all themes */
  router.get('/themes', async (_req, res) => {
    const themes = await prisma.theme.findMany({ orderBy: { name: 'asc' } });
    res.json(themes);
  });

  /** PUT /api/admin/themes/:id — update theme price/isFree/name */
  router.put('/themes/:id', async (req, res) => {
    const { name, price, isFree } = req.body as { name?: string; price?: number; isFree?: boolean };
    const theme = await prisma.theme.update({
      where: { id: req.params.id },
      data: { ...(name !== undefined && { name }), ...(price !== undefined && { price }), ...(isFree !== undefined && { isFree }) },
    });
    res.json(theme);
  });

  /** DELETE /api/admin/themes/:id */
  router.delete('/themes/:id', async (req, res) => {
    await prisma.theme.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  /** POST /api/admin/themes — create a theme */
  router.post('/themes', async (req, res) => {
    const { slug, name, config: themeConfig, price, isFree } = req.body;
    if (!slug || !name || !themeConfig) {
      res.status(400).json({ error: 'slug, name, config are required' });
      return;
    }
    const theme = await prisma.theme.create({
      data: { slug, name, config: themeConfig, price, isFree },
    });
    res.status(201).json(theme);
  });

  // ─── SoundPacks ─────────────────────────────────────────────────────

  /** GET /api/admin/sound-packs — list all sound packs */
  router.get('/sound-packs', async (_req, res) => {
    const packs = await prisma.soundPack.findMany({ orderBy: { name: 'asc' } });
    res.json(packs);
  });

  /** POST /api/admin/sound-packs — create a sound pack */
  router.post('/sound-packs', async (req, res) => {
    const { slug, name, config: soundConfig, price, isFree } = req.body;
    if (!slug || !name || !soundConfig) {
      res.status(400).json({ error: 'slug, name, config are required' });
      return;
    }
    const pack = await prisma.soundPack.create({
      data: { slug, name, config: soundConfig, price, isFree },
    });
    res.status(201).json(pack);
  });

  // ─── Custom Decks (moderation) ──────────────────────────────────────

  /** GET /api/admin/custom-decks — list all custom decks */
  router.get('/custom-decks', async (_req, res) => {
    const decks = await prisma.customDeck.findMany({
      select: {
        id: true, name: true, accessCode: true, status: true,
        createdAt: true, userId: true,
        words: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(decks.map((d) => ({
      ...d,
      wordCount: Array.isArray(d.words) ? (d.words as string[]).length : 0,
      words: undefined,
    })));
  });

  /** PUT /api/admin/custom-decks/:id — update status (approve/reject) */
  router.put('/custom-decks/:id', async (req, res) => {
    const { status } = req.body as { status?: string };
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'status must be pending|approved|rejected' });
      return;
    }
    const deck = await prisma.customDeck.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(deck);
  });

  /** DELETE /api/admin/custom-decks/:id */
  router.delete('/custom-decks/:id', async (req, res) => {
    await prisma.customDeck.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  });

  // ─── Analytics ───────────────────────────────────────────────────────

  /** GET /api/admin/analytics — summary stats */
  router.get('/analytics', async (_req, res) => {
    const [
      totalSessions,
      completedSessions,
      totalPurchases,
      revenueResult,
      topPacks,
    ] = await Promise.all([
      prisma.gameSession.count(),
      prisma.gameSession.count({ where: { status: 'completed' } }),
      prisma.purchase.count({ where: { status: 'completed' } }),
      prisma.purchase.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
      }),
      prisma.purchase.groupBy({
        by: ['wordPackId'],
        where: { status: 'completed', wordPackId: { not: null } },
        _count: { wordPackId: true },
        orderBy: { _count: { wordPackId: 'desc' } },
        take: 5,
      }),
    ]);

    const packIds = topPacks.map((p) => p.wordPackId!);
    const packNames = await prisma.wordPack.findMany({
      where: { id: { in: packIds } },
      select: { id: true, name: true },
    });
    const packMap = Object.fromEntries(packNames.map((p) => [p.id, p.name]));

    res.json({
      games: {
        total: totalSessions,
        completed: completedSessions,
        completionRate: totalSessions > 0
          ? Math.round((completedSessions / totalSessions) * 100)
          : 0,
      },
      revenue: {
        totalPurchases,
        totalCents: revenueResult._sum.amount ?? 0,
      },
      topPacks: topPacks.map((p) => ({
        packId: p.wordPackId,
        name: packMap[p.wordPackId!] || 'Unknown',
        purchases: p._count.wordPackId,
      })),
    });
  });

  /** GET /api/admin/analytics/daily?days=30 — time-series activity */
  router.get('/analytics/daily', async (req, res) => {
    const days = Math.min(parseInt(String(req.query.days ?? '30')), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [sessions, purchases] = await Promise.all([
      prisma.gameSession.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.purchase.findMany({
        where: { status: 'completed', createdAt: { gte: since } },
        select: { createdAt: true, amount: true },
      }),
    ]);

    // Group by date string YYYY-MM-DD
    const gamesByDate: Record<string, number> = {};
    const revenueByDate: Record<string, number> = {};

    for (const s of sessions) {
      const d = s.createdAt.toISOString().slice(0, 10);
      gamesByDate[d] = (gamesByDate[d] ?? 0) + 1;
    }
    for (const p of purchases) {
      const d = p.createdAt.toISOString().slice(0, 10);
      revenueByDate[d] = (revenueByDate[d] ?? 0) + p.amount;
    }

    // Build array for each day
    const result: { date: string; games: number; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, games: gamesByDate[key] ?? 0, revenue: revenueByDate[key] ?? 0 });
    }

    res.json(result);
  });

  return router;
}
