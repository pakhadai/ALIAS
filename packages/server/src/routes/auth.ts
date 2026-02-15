import { Router, type IRouter } from 'express';
import type { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/AuthService';
import type { TokenPayload } from '../services/AuthService';

const authService = new AuthService();

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
    } catch (err) {
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

    // Merge anonymous purchases if deviceId provided
    if (deviceId) {
      const anonUser = await prisma.user.findUnique({ where: { anonymousId: deviceId } });
      if (anonUser && anonUser.id !== user.id) {
        await prisma.purchase.updateMany({
          where: { userId: anonUser.id },
          data: { userId: user.id },
        });
        await prisma.customDeck.updateMany({
          where: { userId: anonUser.id },
          data: { userId: user.id },
        });
      }
    }

    const token = authService.createToken({ sub: user.id, type: 'google', email: user.email! });
    res.json({ token, userId: user.id, email: user.email });
  });

  // ─── Apple Sign In ────────────────────────────────────────────────────

  /**
   * POST /api/auth/apple
   * Body: { idToken: string, email?: string, deviceId?: string }
   * Apple only sends email on first sign-in, so client should pass it too.
   */
  router.post('/apple', async (req, res) => {
    const { idToken, email: clientEmail, deviceId } = req.body as {
      idToken?: string;
      email?: string;
      deviceId?: string;
    };
    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({ error: 'idToken is required' });
      return;
    }

    const verified = await authService.verifyAppleToken(idToken);
    if (!verified) {
      res.status(401).json({ error: 'Invalid Apple token' });
      return;
    }

    const email = verified.email || clientEmail || `apple_${verified.appleId}@privaterelay.appleid.com`;

    let user = await prisma.user.findFirst({
      where: { OR: [{ email }, { anonymousId: verified.appleId }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email, authProvider: 'apple', anonymousId: verified.appleId },
      });
    } else if (user.authProvider === 'anonymous') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email, authProvider: 'apple' },
      });
    }

    // Merge anonymous purchases
    if (deviceId) {
      const anonUser = await prisma.user.findUnique({ where: { anonymousId: deviceId } });
      if (anonUser && anonUser.id !== user.id) {
        await prisma.purchase.updateMany({
          where: { userId: anonUser.id },
          data: { userId: user.id },
        });
        await prisma.customDeck.updateMany({
          where: { userId: anonUser.id },
          data: { userId: user.id },
        });
      }
    }

    const token = authService.createToken({ sub: user.id, type: 'apple', email });
    res.json({ token, userId: user.id, email });
  });

  // ─── Me ───────────────────────────────────────────────────────────────

  /**
   * GET /api/auth/me
   * Header: Authorization: Bearer <token>
   * Returns current user info + owned purchases.
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
      createdAt: user.createdAt,
      purchases: user.purchases,
    });
  });

  return router;
}

