import { Router, type IRouter } from 'express';
import type { Prisma, PrismaClient } from '@prisma/client';
import { AuthService } from '../services/AuthService';
import { maxDate, parseNonNegInt } from '../utils/playerStats';

const authService = new AuthService();

function playerStatsJson(u: {
  statsGamesPlayed: number;
  statsWordsGuessed: number;
  statsWordsSkipped: number;
  statsLastPlayedAt: Date | null;
}) {
  return {
    gamesPlayed: u.statsGamesPlayed,
    wordsGuessed: u.statsWordsGuessed,
    wordsSkipped: u.statsWordsSkipped,
    lastPlayed: u.statsLastPlayedAt ? u.statsLastPlayedAt.toISOString() : '',
  };
}

export function createAuthRoutes(prisma: PrismaClient): IRouter {
  const router: IRouter = Router();

  // ─── Anonymous ────────────────────────────────────────────────────────

  /**
   * POST /api/auth/anonymous
   * Body: { deviceId: string }
   * Creates or finds an anonymous User, returns JWT.
   * Games can be played without calling this — it's needed for purchases.
   */
  router.post('/anonymous', async (req, res) => {
    const { deviceId } = req.body as { deviceId?: string };
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 10) {
      res.status(400).json({ error: 'deviceId is required (min 10 chars)' });
      return;
    }

    try {
      const user = await prisma.user.upsert({
        where: { anonymousId: deviceId },
        update: {},
        create: { anonymousId: deviceId, authProvider: 'anonymous' },
      });
      const token = authService.createToken({ sub: user.id, type: 'anonymous' });
      res.json({ token, userId: user.id });
    } catch (err: unknown) {
      // Race: два запити з одним deviceId — другий отримає P2002 Unique constraint
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2002') {
        const existing = await prisma.user.findFirst({ where: { anonymousId: deviceId } });
        if (existing) {
          const token = authService.createToken({ sub: existing.id, type: 'anonymous' });
          res.json({ token, userId: existing.id });
          return;
        }
      }
      console.error('[Auth] anonymous error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── Google OAuth ─────────────────────────────────────────────────────

  /**
   * POST /api/auth/google
   * Body: { idToken: string, deviceId?: string }
   * Verifies Google ID token, creates/finds User, returns JWT.
   * If deviceId provided and anonymous user exists, merges purchases.
   */
  router.post('/google', async (req, res) => {
    const { idToken, deviceId } = req.body as { idToken?: string; deviceId?: string };
    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({ error: 'idToken is required' });
      return;
    }

    const verified = await authService.verifyGoogleToken(idToken);
    if (!verified) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: verified.email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: verified.email, authProvider: 'google' },
      });
    } else if (user.authProvider === 'anonymous') {
      // Upgrade anonymous → google
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email: verified.email, authProvider: 'google' },
      });
    }

    // Merge anonymous purchases + player stats if deviceId provided
    if (deviceId) {
      const anonUser = await prisma.user.findUnique({ where: { anonymousId: deviceId } });
      if (anonUser && anonUser.id !== user.id) {
        const mergedLast = maxDate(user.statsLastPlayedAt, anonUser.statsLastPlayedAt);
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: {
              statsGamesPlayed: { increment: anonUser.statsGamesPlayed },
              statsWordsGuessed: { increment: anonUser.statsWordsGuessed },
              statsWordsSkipped: { increment: anonUser.statsWordsSkipped },
              ...(mergedLast ? { statsLastPlayedAt: mergedLast } : {}),
            },
          }),
          prisma.user.update({
            where: { id: anonUser.id },
            data: {
              statsGamesPlayed: 0,
              statsWordsGuessed: 0,
              statsWordsSkipped: 0,
              statsLastPlayedAt: null,
            },
          }),
          prisma.purchase.updateMany({
            where: { userId: anonUser.id },
            data: { userId: user.id },
          }),
          prisma.customDeck.updateMany({
            where: { userId: anonUser.id },
            data: { userId: user.id },
          }),
        ]);
        const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
        if (refreshed) user = refreshed;
      }
    }

    const token = authService.createToken({
      sub: user.id,
      type: 'google',
      email: user.email!,
      isAdmin: user.isAdmin,
    });
    res.json({ token, userId: user.id, email: user.email, isAdmin: user.isAdmin });
  });

  // ─── Update profile ───────────────────────────────────────────────────

  router.patch('/profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = authService.verifyToken(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { displayName, avatarId } = req.body as { displayName?: string; avatarId?: string };
    const data: Record<string, unknown> = {};

    if (displayName !== undefined) {
      const name = String(displayName)
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, 20);
      if (name) data.displayName = name;
    }
    if (avatarId !== undefined) {
      const idx = parseInt(String(avatarId));
      if (!isNaN(idx) && idx >= 0 && idx <= 19) data.avatarId = String(idx);
    }

    const user = await prisma.user.update({ where: { id: payload.sub }, data });
    res.json({ displayName: user.displayName, avatarId: user.avatarId });
  });

  // ─── Lobby settings ───────────────────────────────────────────────────

  router.get('/lobby-settings', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = authService.verifyToken(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { defaultSettings: true },
    });
    res.json({ settings: user?.defaultSettings ?? null });
  });

  router.put('/lobby-settings', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = authService.verifyToken(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Invalid settings' });
      return;
    }

    await prisma.user.update({ where: { id: payload.sub }, data: { defaultSettings: settings } });
    res.json({ success: true });
  });

  // ─── Player stats (server-backed) ─────────────────────────────────────

  /**
   * POST /api/auth/player-stats/delta
   * Atomic increments for the authenticated user.
   */
  router.post('/player-stats/delta', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = authService.verifyToken(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const dGames = parseNonNegInt(body.gamesPlayed) ?? 0;
    const dGuess = parseNonNegInt(body.wordsGuessed) ?? 0;
    const dSkip = parseNonNegInt(body.wordsSkipped) ?? 0;
    if (dGames === 0 && dGuess === 0 && dSkip === 0) {
      res.status(400).json({ error: 'At least one positive delta is required' });
      return;
    }

    const now = new Date();
    const updated = await prisma.user.update({
      where: { id: payload.sub },
      data: {
        statsGamesPlayed: { increment: dGames },
        statsWordsGuessed: { increment: dGuess },
        statsWordsSkipped: { increment: dSkip },
        statsLastPlayedAt: now,
      },
    });

    res.json({ playerStats: playerStatsJson(updated) });
  });

  /**
   * POST /api/auth/player-stats/merge-local
   * One-time style import of legacy localStorage totals (adds to server counters).
   */
  router.post('/player-stats/merge-local', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = authService.verifyToken(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const addGames = parseNonNegInt(body.gamesPlayed) ?? 0;
    const addGuess = parseNonNegInt(body.wordsGuessed) ?? 0;
    const addSkip = parseNonNegInt(body.wordsSkipped) ?? 0;

    let legacyDate: Date | null = null;
    if (typeof body.lastPlayed === 'string' && body.lastPlayed.length > 0) {
      const d = new Date(body.lastPlayed);
      if (!Number.isNaN(d.getTime())) legacyDate = d;
    }

    const current = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const hasTotals = addGames > 0 || addGuess > 0 || addSkip > 0;

    if (!hasTotals) {
      if (
        legacyDate &&
        (!current.statsLastPlayedAt || legacyDate.getTime() > current.statsLastPlayedAt.getTime())
      ) {
        const updated = await prisma.user.update({
          where: { id: payload.sub },
          data: { statsLastPlayedAt: legacyDate },
        });
        res.json({ playerStats: playerStatsJson(updated) });
        return;
      }
      res.json({ playerStats: playerStatsJson(current) });
      return;
    }

    const mergedLast =
      maxDate(maxDate(current.statsLastPlayedAt, legacyDate), new Date()) ?? new Date();

    const data: Prisma.UserUpdateInput = {
      statsLastPlayedAt: mergedLast,
    };
    if (addGames > 0) data.statsGamesPlayed = { increment: addGames };
    if (addGuess > 0) data.statsWordsGuessed = { increment: addGuess };
    if (addSkip > 0) data.statsWordsSkipped = { increment: addSkip };

    const updated = await prisma.user.update({ where: { id: payload.sub }, data });
    res.json({ playerStats: playerStatsJson(updated) });
  });

  // ─── Me ───────────────────────────────────────────────────────────────

  /**
   * GET /api/auth/me
   * Header: Authorization: Bearer <token>
   * Returns current user info + owned purchases + profile data.
   */
  router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        purchases: {
          where: { status: 'completed' },
          select: {
            id: true,
            wordPackId: true,
            wordPack: { select: { slug: true } },
            themeId: true,
            soundPackId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      authProvider: user.authProvider,
      displayName: user.displayName,
      avatarId: user.avatarId,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      purchases: user.purchases,
      playerStats: playerStatsJson(user),
    });
  });

  return router;
}
