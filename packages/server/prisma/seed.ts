import { PrismaClient, type Language } from '@prisma/client';

import foodData from './data/food.json';
import generalData from './data/general.json';
import moviesData from './data/movies.json';
import scienceData from './data/science.json';
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

type WordListsByLanguage = Record<string, string[]>;

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

function isLegacyWordLists(data: unknown): data is WordListsByLanguage {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  return Object.values(data).every(
    (v) => Array.isArray(v) && v.every((item) => typeof item === 'string')
  );
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

async function seedLegacyLanguagePack(
  wordPackId: string,
  lang: SupportedLang,
  words: string[]
): Promise<number> {
  const language = lang as Language;
  const uniqueWords = [...new Set(words.map((w) => w.trim()).filter((w) => w.length > 0))];

  await prisma.wordConcept.deleteMany({ where: { packId: wordPackId } });

  for (const text of uniqueWords) {
    await prisma.wordConcept.create({
      data: {
        packId: wordPackId,
        difficulty: 1,
        translations: {
          create: [{ language, word: text }],
        },
      },
    });
  }

  return uniqueWords.length;
}

// ─── Seed themes ────────────────────────────────────────────────────────

const themes = [
  {
    slug: 'premium-dark',
    name: 'Midnight Ruby',
    isFree: true,
    price: 0,
    config: {
      id: 'PREMIUM_DARK',
      description: 'OLED chocolate-black with pearl text and ruby accents',
      preview: { bg: '#0A0809', accent: '#E11D48' },
      fonts: { heading: "'Playfair Display', serif", body: "'Lato', sans-serif" },
    },
  },
  {
    slug: 'premium-light',
    name: 'Premium Light',
    isFree: true,
    price: 0,
    config: {
      id: 'PREMIUM_LIGHT',
      description: 'Clean light with classic serif',
      preview: { bg: '#F8FAFC', accent: '#1E293B' },
      fonts: { heading: "'Playfair Display', serif", body: "'Lato', sans-serif" },
    },
  },
  {
    slug: 'cyberpunk',
    name: 'Indigo',
    isFree: false,
    price: 99,
    config: {
      id: 'CYBERPUNK',
      description: 'Dark neon with indigo & pink',
      preview: { bg: '#020617', accent: '#6366F1' },
      fonts: { heading: "'Playfair Display', serif", body: "'Lato', sans-serif" },
    },
  },
  {
    slug: 'forest',
    name: 'Luminous Aero',
    isFree: false,
    price: 99,
    config: {
      id: 'FOREST',
      description: 'Cool white surfaces with indigo, cyan and coral accents',
      preview: { bg: '#FAFCFF', accent: '#6366F1' },
      fonts: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    },
  },
  {
    slug: 'sleek',
    name: 'Sleek',
    isFree: true,
    price: 0,
    config: {
      id: 'SLEEK',
      description: 'Dark pro with sharp corners',
      preview: { bg: '#050505', accent: '#4338CA' },
      fonts: { heading: "'Exo 2', sans-serif", body: "'Inter', sans-serif" },
    },
  },
  {
    slug: 'void-luxe',
    name: 'Void Luxe',
    isFree: false,
    price: 99,
    config: {
      id: 'VOID_LUXE',
      description: 'OLED black with cool blue and warm premium accents',
      preview: { bg: '#000000', accent: '#052659' },
      fonts: { heading: "'Playfair Display', serif", body: "'Lato', sans-serif" },
    },
  },
  {
    slug: 'quantum-eclipse',
    name: 'Quantum Eclipse',
    isFree: false,
    price: 99,
    config: {
      id: 'QUANTUM_ECLIPSE',
      description: 'True OLED black with violet, cyan, and neon orange accents',
      preview: { bg: '#000000', accent: '#6C47FF' },
      fonts: { heading: "'Exo 2', sans-serif", body: "'Inter', sans-serif" },
    },
  },
];

// ─── Seed sound packs ──────────────────────────────────────────────────

const soundPacks = [
  {
    slug: 'fun',
    name: 'Fun',
    isFree: true,
    config: { id: 'FUN', correct: 'pop', skip: 'whoosh', timer: 'tick', gameOver: 'fanfare' },
  },
  {
    slug: 'minimal',
    name: 'Minimal',
    isFree: true,
    config: {
      id: 'MINIMAL',
      correct: 'click',
      skip: 'soft-whoosh',
      timer: 'soft-tick',
      gameOver: 'chime',
    },
  },
  {
    slug: 'eight-bit',
    name: '8-Bit',
    isFree: true,
    config: { id: 'EIGHT_BIT', correct: 'coin', skip: 'jump', timer: 'beep', gameOver: 'level-up' },
  },
];

// ─── Main seed function ────────────────────────────────────────────────

async function main() {
  console.log('Seeding database...');

  for (const asset of categoryAssets) {
    for (const lang of SUPPORTED_LANGS) {
      const slug = `${lang.toLowerCase()}-${asset.slug}`;
      const name = packName(lang, asset.category);

      let count: number;

      if (isConceptArray(asset.data)) {
        const wp = await upsertWordPack(slug, name, lang, asset.category, 0);
        count = await seedRichLanguagePack(wp.id, lang, asset.data);
        await prisma.wordPack.update({
          where: { id: wp.id },
          data: { wordCount: count },
        });
      } else if (isLegacyWordLists(asset.data)) {
        const list = asset.data[lang] ?? asset.data[lang.toLowerCase()] ?? [];
        const wp = await upsertWordPack(slug, name, lang, asset.category, 0);
        count = await seedLegacyLanguagePack(wp.id, lang, list);
        await prisma.wordPack.update({
          where: { id: wp.id },
          data: { wordCount: count },
        });
      } else {
        throw new Error(
          `Invalid word data for category "${asset.slug}": expected concept[] or { UA|EN|DE: string[] }`
        );
      }

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
  for (const theme of themes) {
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
  for (const sp of soundPacks) {
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
