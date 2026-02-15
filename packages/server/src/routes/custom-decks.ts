import { Router, type IRouter, type Request, type Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import type { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/AuthService';

const authService = new AuthService();

/** Require authenticated JWT → returns userId or null */
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

/** Generate a 6-char alphanumeric access code */
function generateAccessCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Parse words from raw text: newline or comma separated, sanitize */
function parseWordList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((w) => w.trim().replace(/<[^>]*>/g, '').slice(0, 100))
    .filter((w) => w.length > 0);
}

// multer: in-memory storage (max 2MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

export function createCustomDeckRoutes(prisma: PrismaClient): IRouter {
  const router: IRouter = Router();

  // ─── Create deck (JSON) ───────────────────────────────────────────────
  /**
   * POST /api/custom-decks
   * Body: { name, words: string[], branding?, accessCode? }
   */
  router.post('/', async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { name, words, branding, accessCode } = req.body as {
      name?: string;
      words?: string[];
      branding?: { logoUrl?: string; primaryColor?: string; companyName?: string };
      accessCode?: string;
    };

    if (!name || !Array.isArray(words) || words.length === 0) {
      res.status(400).json({ error: 'name and words[] are required' });
      return;
    }

    const sanitized = words
      .map((w) => String(w).trim().replace(/<[^>]*>/g, '').slice(0, 100))
      .filter(Boolean)
      .slice(0, 2000); // max 2000 words

    if (sanitized.length < 5) {
      res.status(400).json({ error: 'Minimum 5 words required' });
      return;
    }

    // Ensure unique access code
    const code = accessCode?.toUpperCase() || generateAccessCode();
    const existing = await prisma.customDeck.findUnique({ where: { accessCode: code } });
    if (existing) {
      res.status(409).json({ error: 'Access code already taken' });
      return;
    }

    const deck = await prisma.customDeck.create({
      data: {
        userId,
        name: name.trim().slice(0, 80),
        words: sanitized,
        branding: branding ?? undefined,
        accessCode: code,
        status: 'approved', // self-created decks are auto-approved
      },
    });

    res.status(201).json(deck);
  });

  // ─── Upload CSV ───────────────────────────────────────────────────────
  /**
   * POST /api/custom-decks/upload
   * Multipart: file (CSV, first column = words) + name (text field)
   */
  router.post('/upload', upload.single('file'), async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const name = (req.body?.name as string)?.trim().slice(0, 80) || 'Мій словник';

    let words: string[];
    try {
      const ext = req.file.originalname.split('.').pop()?.toLowerCase();
      if (ext === 'csv') {
        const records = parse(req.file.buffer, {
          skip_empty_lines: true,
          trim: true,
        }) as string[][];
        words = records.map((row) => row[0]).filter(Boolean);
      } else {
        // Plain text file
        words = parseWordList(req.file.buffer.toString('utf-8'));
      }
    } catch {
      res.status(400).json({ error: 'Could not parse file' });
      return;
    }

    const sanitized = words
      .map((w) => String(w).replace(/<[^>]*>/g, '').trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 2000);

    if (sanitized.length < 5) {
      res.status(400).json({ error: 'Need at least 5 valid words in the file' });
      return;
    }

    const code = generateAccessCode();
    const deck = await prisma.customDeck.create({
      data: {
        userId,
        name,
        words: sanitized,
        accessCode: code,
        status: 'approved',
      },
    });

    res.status(201).json(deck);
  });

  // ─── My decks ─────────────────────────────────────────────────────────
  /**
   * GET /api/custom-decks/my
   */
  router.get('/my', async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const decks = await prisma.customDeck.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        accessCode: true,
        status: true,
        branding: true,
        createdAt: true,
        words: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return wordCount instead of full array for list view
    const result = decks.map((d) => ({
      ...d,
      wordCount: Array.isArray(d.words) ? (d.words as string[]).length : 0,
      words: undefined,
    }));

    res.json(result);
  });

  // ─── Get by access code (public) ──────────────────────────────────────
  /**
   * GET /api/custom-decks/access/:code
   * Used by clients to load a deck before game start
   */
  router.get('/access/:code', async (req, res) => {
    const deck = await prisma.customDeck.findUnique({
      where: { accessCode: req.params.code.toUpperCase() },
      select: {
        id: true,
        name: true,
        accessCode: true,
        status: true,
        branding: true,
        words: true,
      },
    });

    if (!deck) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    if (deck.status !== 'approved') {
      res.status(403).json({ error: 'Deck is not approved yet' });
      return;
    }

    res.json({
      ...deck,
      wordCount: Array.isArray(deck.words) ? (deck.words as string[]).length : 0,
    });
  });

  // ─── Delete own deck ──────────────────────────────────────────────────
  /**
   * DELETE /api/custom-decks/:id
   */
  router.delete('/:id', async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const deck = await prisma.customDeck.findUnique({ where: { id: req.params.id } });
    if (!deck || deck.userId !== userId) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    await prisma.customDeck.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  });

  return router;
}
