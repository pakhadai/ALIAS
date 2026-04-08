import { Router, type IRouter } from 'express';
import type { PrismaClient } from '@prisma/client';
import webpush from 'web-push';
import { config } from '../config';
import { authService } from '../services/AuthService';

export function createPushRoutes(prisma: PrismaClient): IRouter {
  const router: IRouter = Router();

  // Configure web-push if VAPID keys are present
  if (config.vapid.publicKey && config.vapid.privateKey) {
    webpush.setVapidDetails(config.vapid.email, config.vapid.publicKey, config.vapid.privateKey);
  }

  /** GET /api/push/vapid-key — return public VAPID key for client subscription */
  router.get('/vapid-key', (_req, res) => {
    res.json({ publicKey: config.vapid.publicKey });
  });

  /** POST /api/push/subscribe — save push subscription */
  router.post('/subscribe', async (req, res) => {
    const { endpoint, keys } = req.body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'endpoint and keys (p256dh, auth) are required' });
      return;
    }

    // Optionally associate with authenticated user
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = authService.verifyToken(authHeader.slice(7));
      if (payload?.sub) userId = payload.sub;
    }

    try {
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh: keys.p256dh, auth: keys.auth, ...(userId && { userId }) },
        create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId },
      });
      res.json({ ok: true });
    } catch (err) {
      console.error('[Push] subscribe error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /** DELETE /api/push/unsubscribe — remove push subscription */
  router.delete('/unsubscribe', async (req, res) => {
    const { endpoint } = req.body as { endpoint?: string };
    if (!endpoint) {
      res.status(400).json({ error: 'endpoint required' });
      return;
    }
    try {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
      res.json({ ok: true });
    } catch (err) {
      console.error('[Push] unsubscribe error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

/** Send a push notification to all subscriptions, silently remove dead ones */
export async function broadcastPush(
  prisma: PrismaClient,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!config.vapid.publicKey || !config.vapid.privateKey) return;

  const subs = await prisma.pushSubscription.findMany();
  const dead: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        // 410 Gone = subscription expired, clean up
        const webPushErr = err as { statusCode?: number };
        if (webPushErr.statusCode === 410 || webPushErr.statusCode === 404) {
          dead.push(sub.endpoint);
        }
      }
    })
  );

  if (dead.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: dead } } });
  }
}
