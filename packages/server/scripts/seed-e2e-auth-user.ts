import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const E2E_EMAIL = 'e2e-profile@movli.test';
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

async function main(): Promise<void> {
  const outPath =
    process.env.E2E_AUTH_OUTPUT?.trim() ||
    path.resolve(__dirname, '..', '..', 'e2e', '.e2e-auth.json');

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { email: E2E_EMAIL },
      update: {
        authProvider: 'google',
        displayName: 'E2E Player',
        name: 'E2E Player',
      },
      create: {
        email: E2E_EMAIL,
        authProvider: 'google',
        displayName: 'E2E Player',
        name: 'E2E Player',
      },
    });

    await prisma.wordPack.upsert({
      where: { slug: 'feature-custom-packs' },
      update: {
        name: 'Мої паки слів',
        price: 299,
        isFree: false,
        category: 'Feature',
        description: 'E2E feature pack',
      },
      create: {
        slug: 'feature-custom-packs',
        name: 'Мої паки слів',
        language: 'UA',
        category: 'Feature',
        isFree: false,
        price: 299,
        wordCount: 0,
        description: 'E2E feature pack',
      },
    });

    const token = jwt.sign(
      { sub: user.id, type: 'google', email: user.email, isAdmin: false },
      jwtSecret,
      { expiresIn: '7d' }
    );

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify({ token, email: E2E_EMAIL, userId: user.id }, null, 2)
    );
    console.log(`[e2e] seeded auth fixture → ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[e2e] seed-e2e-auth-user failed:', err);
  process.exit(1);
});
