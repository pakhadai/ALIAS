import { PrismaClient, type Language } from '@prisma/client';

import foodData from './data/food.json';
import generalData from './data/general.json';
import moviesData from './data/movies.json';
import scienceData from './data/science.json';
import soundPacksData from './data/sounds.json';
import themesData from './data/themes.json';
import travelData from './data/travel.json';

const prisma = new PrismaClient();

const SUPPORTED_LANGS = ['UA', 'EN', 'DE'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

type SeedRuntime = typeof globalThis & {
  process: {
    env: Record<string, string | undefined>;
    exit: (code?: number) => never;
  };
};

function seedRuntime(): SeedRuntime {
  return globalThis as SeedRuntime;
}

function parseCsvList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface TranslationBlock {
  word: string;
  antonyms?: string[];
  synonyms?: string[];
  tabooWords?: string[];
  hint?: string | null;
}

interface ConceptSeed {
  conceptId?: string;
  difficulty?: number;
  translations: Partial<Record<string, TranslationBlock>>;
}

interface CategoryAsset {
  slug: string;
  category: string;
  data: unknown;
}

const categoryAssets: CategoryAsset[] = [
  { slug: 'general', category: 'General', data: generalData },
  { slug: 'food', category: 'Food', data: foodData },
  { slug: 'travel', category: 'Travel', data: travelData },
  { slug: 'science', category: 'Science', data: scienceData },
  { slug: 'movies', category: 'Movies', data: moviesData },
];

function isConceptArray(data: unknown): data is ConceptSeed[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  const first = data[0];
  return typeof first === 'object' && first !== null && 'translations' in first;
}

function pickTranslation(
  translations: Partial<Record<string, TranslationBlock>>,
  lang: SupportedLang
): TranslationBlock | undefined {
  return translations[lang] ?? translations[lang.toLowerCase()];
}

function packName(language: string, category: string): string {
  const lang = language.toUpperCase();

  if (lang === 'UA') {
    switch (category) {
      case 'General':
        return 'Загальні 🇺🇦';
      case 'Food':
        return 'Їжа 🇺🇦';
      case 'Travel':
        return 'Подорожі 🇺🇦';
      case 'Science':
        return 'Наука 🇺🇦';
      case 'Movies':
        return 'Кіно 🇺🇦';
      default:
        return `${category} 🇺🇦`;
    }
  }

  if (lang === 'EN') {
    switch (category) {
      case 'General':
        return 'General 🇬🇧';
      case 'Food':
        return 'Food 🇬🇧';
      case 'Travel':
        return 'Travel 🇬🇧';
      case 'Science':
        return 'Science 🇬🇧';
      case 'Movies':
        return 'Movies 🇬🇧';
      default:
        return `${category} 🇬🇧`;
    }
  }

  if (lang === 'DE') {
    switch (category) {
      case 'General':
        return 'Allgemein 🇩🇪';
      case 'Food':
        return 'Essen 🇩🇪';
      case 'Travel':
        return 'Reisen 🇩🇪';
      case 'Science':
        return 'Wissenschaft 🇩🇪';
      case 'Movies':
        return 'Filme 🇩🇪';
      default:
        return `${category} 🇩🇪`;
    }
  }

  return `${category} ${lang}`;
}

async function upsertWordPack(
  slug: string,
  name: string,
  lang: SupportedLang,
  category: string,
  wordCount: number
) {
  return prisma.wordPack.upsert({
    where: { slug },
    update: {
      name,
      language: lang,
      category,
      isDefault: category === 'General',
      wordCount,
    },
    create: {
      slug,
      name,
      language: lang,
      category,
      isFree: true,
      isDefault: category === 'General',
      wordCount,
    },
  });
}

async function seedRichLanguagePack(
  wordPackId: string,
  lang: SupportedLang,
  concepts: ConceptSeed[]
): Promise<number> {
  const language = lang as Language;
  const seenConceptKeys = new Set<string>();
  const seenWords = new Set<string>();
  const rows: { difficulty: number; conceptKey: string | null; data: TranslationBlock }[] = [];

  for (const concept of concepts) {
    const block = pickTranslation(concept.translations, lang);
    const word = block?.word?.trim();
    if (!word) continue;
    const conceptKey = concept.conceptId?.trim() || null;
    if (conceptKey) {
      if (seenConceptKeys.has(conceptKey)) continue;
      seenConceptKeys.add(conceptKey);
    } else if (seenWords.has(word)) {
      continue;
    } else {
      seenWords.add(word);
    }
    rows.push({
      difficulty: concept.difficulty ?? 1,
      conceptKey,
      data: block!,
    });
  }

  await prisma.wordConcept.deleteMany({ where: { packId: wordPackId } });

  for (const row of rows) {
    const t = row.data;
    await prisma.wordConcept.create({
      data: {
        packId: wordPackId,
        conceptKey: row.conceptKey,
        difficulty: row.difficulty,
        translations: {
          create: [
            {
              language,
              word: t.word.trim(),
              synonyms: t.synonyms ?? [],
              antonyms: t.antonyms ?? [],
              tabooWords: t.tabooWords ?? [],
              hint: t.hint && t.hint.length > 0 ? t.hint : null,
            },
          ],
        },
      },
    });
  }

  return rows.length;
}

// ─── Main seed function ────────────────────────────────────────────────

async function main() {
  console.log('Seeding database...');

  for (const asset of categoryAssets) {
    for (const lang of SUPPORTED_LANGS) {
      const slug = `${lang.toLowerCase()}-${asset.slug}`;
      const name = packName(lang, asset.category);

      if (!isConceptArray(asset.data)) {
        throw new Error(`Invalid word data for category "${asset.slug}": expected concept[]`);
      }
      const wp = await upsertWordPack(slug, name, lang, asset.category, 0);
      const count = await seedRichLanguagePack(wp.id, lang, asset.data);
      await prisma.wordPack.update({
        where: { id: wp.id },
        data: { wordCount: count },
      });

      console.log(`  [WordPack] ${slug}: ${count} words`);
    }
  }

  // Seed feature packs (purchasable features, no actual words)
  await prisma.wordPack.upsert({
    where: { slug: 'feature-custom-packs' },
    update: {
      name: 'Мої паки слів',
      price: 299,
      isFree: false,
      description: 'Розблокуй можливість створювати власні колоди слів (до 5 пакунків).',
    },
    create: {
      slug: 'feature-custom-packs',
      name: 'Мої паки слів',
      language: 'UA',
      category: 'Feature',
      isFree: false,
      price: 299,
      wordCount: 0,
      description: 'Розблокуй можливість створювати власні колоди слів (до 5 пакунків).',
    },
  });
  console.log('  [Feature] feature-custom-packs');

  // Seed Themes
  for (const theme of themesData) {
    await prisma.theme.upsert({
      where: { slug: theme.slug },
      update: { name: theme.name, config: theme.config, isFree: theme.isFree, price: theme.price },
      create: {
        slug: theme.slug,
        name: theme.name,
        config: theme.config,
        isFree: theme.isFree,
        price: theme.price,
      },
    });
    console.log(`  [Theme] ${theme.slug}`);
  }

  // Seed SoundPacks
  for (const sp of soundPacksData) {
    await prisma.soundPack.upsert({
      where: { slug: sp.slug },
      update: { name: sp.name, config: sp.config, isFree: sp.isFree },
      create: { slug: sp.slug, name: sp.name, config: sp.config, isFree: sp.isFree },
    });
    console.log(`  [SoundPack] ${sp.slug}`);
  }

  const seedAdminEmails = parseCsvList(seedRuntime().process.env.SEED_ADMIN_EMAILS).map((e) =>
    e.toLowerCase()
  );
  if (seedAdminEmails.length > 0) {
    if ((seedRuntime().process.env.NODE_ENV || 'development') === 'production') {
      console.warn(
        '  [Admin] SEED_ADMIN_EMAILS is set but NODE_ENV=production — skipping admin seeding'
      );
    } else {
      const adminResult = await prisma.user.updateMany({
        where: { email: { in: seedAdminEmails } },
        data: { isAdmin: true },
      });
      console.log(`  [Admin] ${adminResult.count} user(s) set as admin (SEED_ADMIN_EMAILS)`);
    }
  }

  const wordCount = await prisma.wordConcept.count();
  const packCount = await prisma.wordPack.count();
  console.log(`\nSeed complete: ${packCount} word packs, ${wordCount} total concepts`);
}

main()
  .catch((e) => {
    console.error(e);
    seedRuntime().process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
