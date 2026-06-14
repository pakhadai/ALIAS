import { PrismaClient } from '@prisma/client';
import {
  buildMockTranslationDeckEntries,
  Category,
  Language,
  resolveMockTargetLanguage,
} from '@movli/shared';

const prisma = new PrismaClient();

async function verifyDbConceptKeyPairs() {
  const samples = [
    {
      srcSlug: 'ua-general',
      tgtSlug: 'de-general',
      srcLang: 'UA',
      tgtLang: 'DE',
      key: 'general-cat',
    },
    { srcSlug: 'ua-travel', tgtSlug: 'en-travel', srcLang: 'UA', tgtLang: 'EN', key: 'travel-1' },
    { srcSlug: 'ua-food', tgtSlug: 'en-food', srcLang: 'UA', tgtLang: 'EN', key: 'food-apple' },
  ];

  const failures = [];
  for (const s of samples) {
    const src = await prisma.wordTranslation.findFirst({
      where: {
        language: s.srcLang,
        concept: { conceptKey: s.key, pack: { slug: s.srcSlug } },
      },
      select: { word: true },
    });
    const tgt = await prisma.wordTranslation.findFirst({
      where: {
        language: s.tgtLang,
        concept: { conceptKey: s.key, pack: { slug: s.tgtSlug } },
      },
      select: { word: true },
    });
    if (!src?.word || !tgt?.word) {
      failures.push(`${s.key}: missing src=${src?.word ?? '—'} tgt=${tgt?.word ?? '—'}`);
      continue;
    }
    console.log(`DB pair [${s.key}]: ${src.word} (${s.srcLang}) -> ${tgt.word} (${s.tgtLang})`);
  }
  return failures;
}

async function verifyPackCounts() {
  const packs = await prisma.wordPack.findMany({
    where: { category: { not: 'Feature' } },
    select: { slug: true, wordCount: true, category: true, language: true },
    orderBy: { slug: 'asc' },
  });
  console.log('\nWord packs in DB:');
  for (const p of packs) {
    const actual = await prisma.wordConcept.count({ where: { pack: { slug: p.slug } } });
    const ok = actual === p.wordCount ? 'OK' : `MISMATCH (stored ${p.wordCount}, actual ${actual})`;
    console.log(`  ${p.slug}: ${actual} concepts — ${ok}`);
  }
  const nullKeys = await prisma.wordConcept.count({ where: { conceptKey: null } });
  console.log(`\nConcepts without conceptKey: ${nullKeys}`);
  return packs.length >= 15 && nullKeys === 0;
}

async function main() {
  console.log('=== Translation verification ===\n');

  const mockDeck = buildMockTranslationDeckEntries(Language.UA, Language.EN, [
    Category.GENERAL,
    Category.TRAVEL,
  ]);
  const mustHave = ['Кіт|Cat', 'Париж|Paris', 'Літак|Airplane'];
  const mockFails = mustHave.filter((e) => !mockDeck.includes(e));
  console.log('MOCK fallback entries:', mockDeck.length);
  for (const e of mustHave) {
    console.log(`  ${mockDeck.includes(e) ? 'OK' : 'FAIL'}: ${e}`);
  }

  const target = resolveMockTargetLanguage(Language.UA, undefined);
  console.log(`\nDefault target for UA: ${target ?? 'none'} (expected DE)`);

  const dbPairFails = await verifyDbConceptKeyPairs();
  const packsOk = await verifyPackCounts();

  const allOk =
    mockFails.length === 0 && target === Language.DE && dbPairFails.length === 0 && packsOk;
  console.log(`\n=== RESULT: ${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'} ===`);
  if (dbPairFails.length) console.log('DB failures:', dbPairFails);
  process.exit(allOk ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
