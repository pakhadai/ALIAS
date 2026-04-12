import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import type { PrismaClient, Language } from '@prisma/client';
import type { RedisRoomStore } from '../services/RedisRoomStore';

const upload = multer({ storage: multer.memoryStorage() });

/** Row shape from `customDeck.findMany` with admin list select */
type AdminCustomDeckListRow = {
  id: string;
  name: string;
  accessCode: string | null;
  status: string;
  createdAt: Date;
  userId: string;
  words: unknown;
};

type TopPurchasedPackRow = {
  wordPackId: string | null;
  _count: { wordPackId: number };
};
import { config } from '../config';
import { ipWhitelist } from '../middleware/ipWhitelist';
import { authService } from '../services/AuthService';
import { broadcastPush } from './push';
import { asyncRoute } from '../utils/asyncRoute';

export function createAdminRoutes(
  prisma: PrismaClient,
  redisStore: RedisRoomStore | null = null
): IRouter {
  const router: IRouter = Router();

  // Optional VPN/WireGuard IP whitelist for admin routes. Configure `ADMIN_ALLOWED_IPS` as
  // a comma-separated list of IPs/CIDR ranges (e.g. `10.8.0.0/24`). When unset/empty, this
  // check is disabled for local development.
  router.use(ipWhitelist(config.adminAllowedIps));

  /**
   * Admin authentication middleware.
   *
   * Priority order:
   * 1. **`x-admin-key`** — if `ADMIN_API_KEY` is set in env and the header matches, allow (for scripts / CI).
   *    If the header is present but wrong → 403 (do not fall through to JWT).
   * 2. **Bearer JWT** — then:
   *    - `ADMIN_ALLOWED_EMAILS` — if configured, email match is sufficient (no DB `isAdmin` needed).
   *    - else `User.isAdmin` in DB.
   *    - else deny in production; dev fallback allows any authenticated non-anonymous user.
   */
  async function adminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const configuredAdminKey = config.adminApiKey?.trim();
      if (configuredAdminKey) {
        const provided = req.header('x-admin-key')?.trim();
        if (provided) {
          if (provided === configuredAdminKey) {
            next();
            return;
          }
          res.status(403).json({ error: 'Invalid admin key' });
          return;
        }
      }

      const auth = req.headers.authorization;

      if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const payload = authService.verifyToken(auth.slice(7));
      if (!payload?.sub || payload.type === 'anonymous') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { email: true, isAdmin: true },
      });

      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const email = user.email?.toLowerCase() ?? null;

      // ── Priority 1: ADMIN_ALLOWED_EMAILS whitelist (.env) ──────────────────
      // If configured, email match alone is enough — no DB isAdmin flag required.
      if (config.adminAllowedEmails.length > 0) {
        if (email && config.adminAllowedEmails.includes(email)) {
          next();
          return;
        }
        res.status(403).json({ error: 'Access denied. Email not whitelisted.' });
        return;
      }

      // ── Priority 2: isAdmin flag in DB (fallback when whitelist is empty) ──
      if (user.isAdmin) {
        next();
        return;
      }

      // No whitelist configured and no isAdmin flag — deny in production
      if (config.nodeEnv === 'production') {
        res.status(403).json({ error: 'Admin access is not configured.' });
        return;
      }

      // Dev fallback (no whitelist, no isAdmin, not production) — allow
      next();
    } catch (err) {
      next(err);
    }
  }

  router.use(adminAuth);

  /** GET /api/admin/live — Redis: active room keys + socket bindings */
  router.get(
    '/live',
    asyncRoute(async (_req, res) => {
      const asOf = new Date().toISOString();
      if (!redisStore) {
        res.json({ activeRooms: 0, playersOnline: 0, redisConnected: false, asOf });
        return;
      }
      const stats = await redisStore.getLiveStats();
      res.json({ ...stats, asOf });
    })
  );

  // ─── WordPacks ──────────────────────────────────────────────────────

  /** GET /api/admin/packs — list all packs */
  router.get(
    '/packs',
    asyncRoute(async (_req, res) => {
      const packs = await prisma.wordPack.findMany({
        orderBy: [{ language: 'asc' }, { category: 'asc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          language: true,
          category: true,
          difficulty: true,
          version: true,
          price: true,
          isFree: true,
          wordCount: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json(packs);
    })
  );

  /** GET /api/admin/packs/:id — get pack with concepts and translations */
  router.get(
    '/packs/:id',
    asyncRoute(async (req, res) => {
      const pack = await prisma.wordPack.findUnique({
        where: { id: req.params.id },
        include: {
          concepts: {
            include: {
              translations: {
                where: { language: 'UA' }, // В адмінці показуємо український переклад для орієнтиру
              },
            },
          },
        },
      });
      if (!pack) {
        res.status(404).json({ error: 'Pack not found' });
        return;
      }

      // Форматуємо дані так, як очікує старий фронтенд адмінки (щоб не переписувати весь UI)
      const words = pack.concepts.map((c) => ({
        id: c.id, // UUID рядка в БД
        conceptKey: c.conceptKey, // стабільний ключ з контенту (JSON conceptId), якщо є
        text: c.translations[0]?.word || `Концепт без UA перекладу (ID: ${c.id.slice(0, 4)})`,
      }));

      res.json({ ...pack, words });
    })
  );

  /** POST /api/admin/packs — create a new pack */
  router.post(
    '/packs',
    asyncRoute(async (req, res) => {
      const { slug, name, language, category, difficulty, price, isFree, description } = req.body;
      if (!slug || !name || !language || !category) {
        res.status(400).json({ error: 'slug, name, language, category are required' });
        return;
      }
      const pack = await prisma.wordPack.create({
        data: { slug, name, language, category, difficulty, price, isFree, description },
      });
      // Auto-notify subscribers about new pack
      broadcastPush(prisma, {
        title: '🃏 Новий набір слів!',
        body: `«${pack.name}» вже доступний у магазині`,
        url: '/?tab=store',
      }).catch(() => {});
      res.status(201).json(pack);
    })
  );

  /** PUT /api/admin/packs/:id — update pack metadata */
  router.put(
    '/packs/:id',
    asyncRoute(async (req, res) => {
      const { name, difficulty, price, isFree, description } = req.body;
      const pack = await prisma.wordPack.update({
        where: { id: req.params.id },
        data: { name, difficulty, price, isFree, description },
      });
      res.json(pack);
    })
  );

  /** DELETE /api/admin/packs/:id — delete pack and its words */
  router.delete(
    '/packs/:id',
    asyncRoute(async (req, res) => {
      await prisma.wordPack.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    })
  );

  /** DELETE /api/admin/packs/:packId/words/:conceptId — delete a single concept */
  router.delete(
    '/packs/:packId/words/:conceptId',
    asyncRoute(async (req, res) => {
      const { packId, conceptId } = req.params;

      // Видаляємо весь концепт (його переклади видаляться автоматично завдяки onDelete: Cascade)
      await prisma.wordConcept.delete({ where: { id: conceptId } });

      const count = await prisma.wordConcept.count({ where: { packId } });
      await prisma.wordPack.update({ where: { id: packId }, data: { wordCount: count } });
      res.json({ ok: true, totalWords: count });
    })
  );

  /** POST /api/admin/packs/:id/words — bulk add simple words to a pack */
  router.post(
    '/packs/:id/words',
    asyncRoute(async (req, res) => {
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

      const uniqueWords = [...new Set(words.map((w) => w.trim()).filter(Boolean))];
      let addedCount = 0;

      await prisma.$transaction(async (tx) => {
        for (const text of uniqueWords) {
          const concept = await tx.wordConcept.create({ data: { packId } });
          await tx.wordTranslation.create({
            data: {
              conceptId: concept.id,
              language: pack.language as Language, // Призначаємо мову всього паку
              word: text,
            },
          });
          addedCount++;
        }

        const count = await tx.wordConcept.count({ where: { packId } });
        await tx.wordPack.update({ where: { id: packId }, data: { wordCount: count } });
      });

      const finalCount = await prisma.wordConcept.count({ where: { packId } });
      res.status(201).json({ added: addedCount, totalWords: finalCount });
    })
  );

  /** POST /api/admin/upload-csv — upload a CSV file for pack word concepts */
  router.post('/upload-csv', upload.single('file'), async (req, res) => {
    try {
      const { packId } = req.body;
      if (!req.file || !packId) {
        res.status(400).json({ error: 'File and packId are required' });
        return;
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      let createdCount = 0;

      await prisma.$transaction(async (tx) => {
        for (const row of records as Record<string, string>[]) {
          const difficulty = parseInt(row.difficulty) || 1;

          const concept = await tx.wordConcept.create({
            data: { packId, difficulty },
          });

          if (row.word_ua) {
            await tx.wordTranslation.create({
              data: {
                conceptId: concept.id,
                language: 'UA',
                word: row.word_ua,
                synonyms: row.synonyms_ua
                  ? row.synonyms_ua.split(',').map((s: string) => s.trim())
                  : [],
                tabooWords: row.taboo_ua
                  ? row.taboo_ua.split(',').map((s: string) => s.trim())
                  : [],
              },
            });
          }

          if (row.word_en) {
            await tx.wordTranslation.create({
              data: {
                conceptId: concept.id,
                language: 'EN',
                word: row.word_en,
                synonyms: row.synonyms_en
                  ? row.synonyms_en.split(',').map((s: string) => s.trim())
                  : [],
                tabooWords: row.taboo_en
                  ? row.taboo_en.split(',').map((s: string) => s.trim())
                  : [],
              },
            });
          }

          createdCount++;
        }

        await tx.wordPack.update({
          where: { id: packId },
          data: { wordCount: { increment: createdCount } },
        });
      });

      res.json({ message: `Successfully uploaded ${createdCount} concepts.` });
    } catch (error) {
      console.error('[Admin] CSV Upload Error:', error);
      res.status(500).json({ error: 'Failed to process CSV file' });
    }
  });

  // ─── Themes ─────────────────────────────────────────────────────────

  /** GET /api/admin/themes — list all themes */
  router.get(
    '/themes',
    asyncRoute(async (_req, res) => {
      const themes = await prisma.theme.findMany({ orderBy: { name: 'asc' } });
      res.json(themes);
    })
  );

  /** PUT /api/admin/themes/:id — update theme price/isFree/name */
  router.put(
    '/themes/:id',
    asyncRoute(async (req, res) => {
      const { name, price, isFree } = req.body as {
        name?: string;
        price?: number;
        isFree?: boolean;
      };
      const theme = await prisma.theme.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(price !== undefined && { price }),
          ...(isFree !== undefined && { isFree }),
        },
      });
      res.json(theme);
    })
  );

  /** DELETE /api/admin/themes/:id */
  router.delete(
    '/themes/:id',
    asyncRoute(async (req, res) => {
      await prisma.theme.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    })
  );

  /** POST /api/admin/themes — create a theme */
  router.post(
    '/themes',
    asyncRoute(async (req, res) => {
      const { slug, name, config: themeConfig, price, isFree } = req.body;
      if (!slug || !name || !themeConfig) {
        res.status(400).json({ error: 'slug, name, config are required' });
        return;
      }
      const theme = await prisma.theme.create({
        data: { slug, name, config: themeConfig, price, isFree },
      });
      res.status(201).json(theme);
    })
  );

  // ─── SoundPacks ─────────────────────────────────────────────────────

  /** GET /api/admin/sound-packs — list all sound packs */
  router.get(
    '/sound-packs',
    asyncRoute(async (_req, res) => {
      const packs = await prisma.soundPack.findMany({ orderBy: { name: 'asc' } });
      res.json(packs);
    })
  );

  /** POST /api/admin/sound-packs — create a sound pack */
  router.post(
    '/sound-packs',
    asyncRoute(async (req, res) => {
      const { slug, name, config: soundConfig, price, isFree } = req.body;
      if (!slug || !name || !soundConfig) {
        res.status(400).json({ error: 'slug, name, config are required' });
        return;
      }
      const pack = await prisma.soundPack.create({
        data: { slug, name, config: soundConfig, price, isFree },
      });
      res.status(201).json(pack);
    })
  );

  // ─── Custom Decks (moderation) ──────────────────────────────────────

  /** GET /api/admin/custom-decks — list all custom decks */
  router.get(
    '/custom-decks',
    asyncRoute(async (_req, res) => {
      const decks = await prisma.customDeck.findMany({
        select: {
          id: true,
          name: true,
          accessCode: true,
          status: true,
          createdAt: true,
          userId: true,
          words: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(
        decks.map((d: AdminCustomDeckListRow) => ({
          ...d,
          wordCount: Array.isArray(d.words) ? (d.words as string[]).length : 0,
          words: undefined,
        }))
      );
    })
  );

  /** PUT /api/admin/custom-decks/:id — update status (approve/reject) */
  router.put(
    '/custom-decks/:id',
    asyncRoute(async (req, res) => {
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
    })
  );

  /** DELETE /api/admin/custom-decks/:id */
  router.delete(
    '/custom-decks/:id',
    asyncRoute(async (req, res) => {
      await prisma.customDeck.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    })
  );

  // ─── Analytics ───────────────────────────────────────────────────────

  /** GET /api/admin/analytics — summary stats */
  router.get(
    '/analytics',
    asyncRoute(async (_req, res) => {
      const [totalSessions, completedSessions, totalPurchases, revenueResult, topPacks] =
        await Promise.all([
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

      const packIds = topPacks.map((p: TopPurchasedPackRow) => p.wordPackId!);
      const packNames = await prisma.wordPack.findMany({
        where: { id: { in: packIds } },
        select: { id: true, name: true },
      });
      const packMap = Object.fromEntries(
        packNames.map((p: { id: string; name: string }) => [p.id, p.name])
      );

      res.json({
        games: {
          total: totalSessions,
          completed: completedSessions,
          completionRate:
            totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
        },
        revenue: {
          totalPurchases,
          totalCents: revenueResult._sum.amount ?? 0,
        },
        topPacks: topPacks.map((p: TopPurchasedPackRow) => ({
          packId: p.wordPackId,
          name: packMap[p.wordPackId!] || 'Unknown',
          purchases: p._count.wordPackId,
        })),
      });
    })
  );

  /** GET /api/admin/analytics/daily?days=30 — time-series activity */
  router.get(
    '/analytics/daily',
    asyncRoute(async (req, res) => {
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
    })
  );

  /** POST /api/admin/push/broadcast — send push notification to all subscribers */
  router.post(
    '/push/broadcast',
    asyncRoute(async (req, res) => {
      const { title, body, url } = req.body as { title?: string; body?: string; url?: string };
      if (!title || !body) {
        res.status(400).json({ error: 'title and body are required' });
        return;
      }
      const count = await prisma.pushSubscription.count();
      await broadcastPush(prisma, { title, body, url });
      res.json({ ok: true, sent: count });
    })
  );

  // ─── Infra / multi-instance debugging ───────────────────────────────

  /**
   * GET /api/admin/infra/room-redis?code=12345
   * Whether a Redis snapshot exists, last writer INSTANCE_ID, minimal state summary.
   */
  router.get(
    '/infra/room-redis',
    asyncRoute(async (req, res) => {
      const code = String(req.query.code ?? '').trim();
      if (!/^\d{5}$/.test(code)) {
        res.status(400).json({ error: 'Query code must be a 5-digit room code' });
        return;
      }
      if (!redisStore?.isConnected) {
        res.status(503).json({ error: 'Redis not connected' });
        return;
      }
      const [snapshot, lastWriterInstanceId] = await Promise.all([
        redisStore.getRoomState(code),
        redisStore.getRoomWriter(code),
      ]);
      res.json({
        roomCode: code,
        hasSnapshot: snapshot !== null,
        lastWriterInstanceId,
        gameState: snapshot?.gameState ?? null,
        playerCount: snapshot?.players?.length ?? 0,
      });
    })
  );

  return router;
}
