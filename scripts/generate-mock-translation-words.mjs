/**
 * Generates packages/shared/src/mockTranslationWords.ts from prisma JSON word data.
 * Run: node scripts/generate-mock-translation-words.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'packages/server/prisma/data');
const outFile = path.join(root, 'packages/shared/src/mockTranslationWords.ts');

const LANGS = ['UA', 'EN', 'DE'];
const CONCEPT_CATEGORIES = [
  { slug: 'general', category: 'GENERAL', file: 'general.json' },
  { slug: 'food', category: 'FOOD', file: 'food.json' },
];
const LEGACY_CATEGORIES = [
  { slug: 'travel', category: 'TRAVEL', file: 'travel.json' },
  { slug: 'science', category: 'SCIENCE', file: 'science.json' },
  { slug: 'movies', category: 'MOVIES', file: 'movies.json' },
];

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
}

function extractConceptCategory(data) {
  const byLang = { UA: [], EN: [], DE: [] };
  for (const concept of data) {
    const words = {};
    let complete = true;
    for (const lang of LANGS) {
      const word = concept.translations?.[lang]?.word?.trim();
      if (!word) {
        complete = false;
        break;
      }
      words[lang] = word;
    }
    if (!complete) continue;
    for (const lang of LANGS) byLang[lang].push(words[lang]);
  }
  return byLang;
}

function extractLegacyCategory(data) {
  const byLang = {};
  for (const lang of LANGS) {
    const list = data[lang] ?? data[lang.toLowerCase()] ?? [];
    byLang[lang] = list.map((w) => String(w).trim()).filter(Boolean);
  }
  const min = Math.min(...LANGS.map((l) => byLang[l].length));
  for (const lang of LANGS) {
    byLang[lang] = byLang[lang].slice(0, min);
  }
  return byLang;
}

function formatWordList(words) {
  const lines = words.map((w) => `      '${w.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',`);
  return `[\n${lines.join('\n')}\n    ]`;
}

const categories = {};

for (const { category, file } of CONCEPT_CATEGORIES) {
  const data = readJson(file);
  if (!Array.isArray(data)) throw new Error(`${file}: expected concept[]`);
  categories[category] = extractConceptCategory(data);
}

for (const { category, file } of LEGACY_CATEGORIES) {
  const data = readJson(file);
  if (Array.isArray(data)) throw new Error(`${file}: expected legacy map`);
  categories[category] = extractLegacyCategory(data);
}

const header = `import { Category, Language } from './enums';

/**
 * Index-aligned fallback words for Translation mode when DB is unavailable.
 * Generated from packages/server/prisma/data/*.json — do not edit by hand.
 * Regenerate: node scripts/generate-mock-translation-words.mjs
 */
export const MOCK_TRANSLATION_WORDS: Record<
  Language,
  Partial<Record<Category, readonly string[]>>
> = {
`;

const body = LANGS.map((lang) => {
  const langEnum = `Language.${lang}`;
  const cats = Object.entries(categories)
    .map(([cat, byLang]) => {
      const words = byLang[lang];
      return `    [Category.${cat}]: ${formatWordList(words)},`;
    })
    .join('\n');
  return `  [${langEnum}]: {\n${cats}\n  },`;
}).join('\n');

const footer = `};

const LOBBY_LANGUAGES = [Language.UA, Language.DE, Language.EN] as const;

export function resolveMockTargetLanguage(
  source: Language,
  explicit?: Language
): Language | undefined {
  if (explicit && explicit !== source) return explicit;
  return LOBBY_LANGUAGES.find((lang) => lang !== source);
}

/** Build source|target pipe entries from aligned MOCK_TRANSLATION_WORDS. */
export function buildMockTranslationDeckEntries(
  source: Language,
  target: Language,
  categories: Category[]
): string[] {
  if (target === source) return [];
  const entries = [];
  for (const cat of categories) {
    if (cat === Category.CUSTOM) continue;
    const srcList = MOCK_TRANSLATION_WORDS[source]?.[cat] ?? [];
    const tgtList = MOCK_TRANSLATION_WORDS[target]?.[cat] ?? [];
    const count = Math.min(srcList.length, tgtList.length);
    for (let i = 0; i < count; i++) {
      const s = srcList[i]?.trim();
      const t = tgtList[i]?.trim();
      if (s && t) entries.push(\`\${s}|\${t}\`);
    }
  }
  return entries;
}
`;

fs.writeFileSync(outFile, header + body + '\n' + footer, 'utf8');
console.log('Wrote', outFile);
for (const [cat, byLang] of Object.entries(categories)) {
  console.log(`  ${cat}: ${byLang.UA.length} aligned triples`);
}