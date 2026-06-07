import { describe, expect, test, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCustomDeckRoutes } from '../custom-decks';
import { authService } from '../../services/AuthService';

const DECK_ID = '660e8400-e29b-41d4-a716-446655440001';
const WORDS = ['one', 'two', 'three', 'four', 'five'];

function makeApp(prisma: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use('/api/custom-decks', createCustomDeckRoutes(prisma as never));
  return app;
}

function authHeader(userId = 'u1') {
  const token = authService.createToken({
    sub: userId,
    type: 'google',
    email: 'a@b.c',
    isAdmin: false,
  });
  return { Authorization: `Bearer ${token}` };
}

describe('Custom decks routes', () => {
  test('POST /api/custom-decks requires auth', async () => {
    const prisma = { customDeck: { findUnique: vi.fn(), create: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app).post('/api/custom-decks').send({ name: 'Test', words: WORDS });

    expect(res.status).toBe(401);
  });

  test('POST /api/custom-decks creates deck when authenticated', async () => {
    const prisma = {
      customDeck: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: DECK_ID,
          name: 'My Deck',
          accessCode: 'ABC123',
          status: 'approved',
          words: WORDS,
        }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/custom-decks')
      .set(authHeader())
      .send({ name: 'My Deck', words: WORDS });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(DECK_ID);
    expect(prisma.customDeck.create).toHaveBeenCalled();
  });

  test('POST /api/custom-decks rejects fewer than 5 words', async () => {
    const prisma = { customDeck: { findUnique: vi.fn(), create: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/custom-decks')
      .set(authHeader())
      .send({ name: 'Short', words: ['a', 'b'] });

    expect(res.status).toBe(400);
    expect(prisma.customDeck.create).not.toHaveBeenCalled();
  });

  test('GET /api/custom-decks/access/:code returns approved deck', async () => {
    const prisma = {
      customDeck: {
        findUnique: vi.fn().mockResolvedValue({
          id: DECK_ID,
          name: 'Public Deck',
          accessCode: 'ABC123',
          status: 'approved',
          branding: null,
          words: WORDS,
        }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/custom-decks/access/abc123');
    expect(res.status).toBe(200);
    expect(res.body.wordCount).toBe(5);
    expect(res.body.words).toBeDefined();
  });

  test('GET /api/custom-decks/access/:code returns 403 for pending deck', async () => {
    const prisma = {
      customDeck: {
        findUnique: vi.fn().mockResolvedValue({
          id: DECK_ID,
          name: 'Pending',
          accessCode: 'PEND01',
          status: 'pending',
          branding: null,
          words: WORDS,
        }),
      },
    };
    const app = makeApp(prisma);

    const res = await request(app).get('/api/custom-decks/access/pend01');
    expect(res.status).toBe(403);
  });

  test('POST /api/custom-decks/upload rejects request without file', async () => {
    const prisma = { customDeck: { create: vi.fn() } };
    const app = makeApp(prisma);

    const res = await request(app)
      .post('/api/custom-decks/upload')
      .set(authHeader())
      .field('name', 'CSV Deck');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No file');
  });

  test('POST /api/custom-decks/upload accepts CSV file', async () => {
    const prisma = {
      customDeck: {
        create: vi.fn().mockResolvedValue({
          id: DECK_ID,
          name: 'CSV Deck',
          accessCode: 'CSV001',
          status: 'approved',
        }),
      },
    };
    const app = makeApp(prisma);

    const csv = 'apple\nbanana\ncherry\ndate\nelderberry\n';
    const res = await request(app)
      .post('/api/custom-decks/upload')
      .set(authHeader())
      .field('name', 'CSV Deck')
      .attach('file', Buffer.from(csv), 'words.csv');

    expect(res.status).toBe(201);
    expect(prisma.customDeck.create).toHaveBeenCalled();
  });
});
