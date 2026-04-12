# Дані слів і Prisma seed

> Загальна архітектура монорепо та мережеві контракти — у кореневому **[`README.md`](../README.md)**. Тут лише **дані слів**, **seed** та **JSON-формати**.

Цей документ описує **ієрархію моделей**, **формати JSON** у `packages/server/prisma/data/` і **логіку** `packages/server/prisma/seed.ts` після переходу на структуровані концепти та поле `conceptKey`.

---

## Ієрархія в БД

```
WordPack          — пакунок у магазині / грі (slug на кшталт `ua-general`, мова + категорія)
  └── WordConcept — одна «картка» в цьому пакунку
        └── WordTranslation — переклад картки для конкретної мови (UA | EN | DE)
```

- **`WordConcept.conceptKey`** — стабільний логічний ідентифікатор з контенту (відповідає полю **`conceptId`** у JSON). Унікальний у парі з **`packId`** (`@@unique([packId, conceptKey])`). Для рядків без ключа (legacy / ручне додавання) значення може бути `NULL`.
- **`WordTranslation`** зберігає **`word`**, **`synonyms`**, **`antonyms`**, **`tabooWords`**, **`hint`** — це використовується в т.ч. режимом QUIZ (`WordService`).

Міграція колонки: `prisma/migrations/20260410193000_word_concept_concept_key/migration.sql`.

Після `git pull` з цією міграцією потрібно застосувати міграції (`pnpm --filter @alias/server db:migrate` або `prisma migrate deploy`), потім за бажанням перезапустити seed.

---

## Розташування файлів

| Шлях | Призначення |
|------|-------------|
| `packages/server/prisma/seed.ts` | Логіка upsert паків, імпорт JSON, теми, sound packs, опційно `SEED_ADMIN_EMAILS` |
| `packages/server/prisma/data/general.json` | Категорія General |
| `packages/server/prisma/data/food.json` | Food |
| `packages/server/prisma/data/travel.json` | Travel |
| `packages/server/prisma/data/science.json` | Science |
| `packages/server/prisma/data/movies.json` | Movies |

Кожен файл категорії підключається в `seed.ts` у масиві `categoryAssets` (поля `slug`, `category`, `data`).

---

## Формат A: масив концептів (рекомендований)

Файл — **JSON-масив** об’єктів. Один об’єкт = один логічний концепт із перекладами для всіх мов.

```json
[
  {
    "conceptId": "general-cat",
    "difficulty": 1,
    "translations": {
      "UA": {
        "word": "Кіт",
        "antonyms": ["собака"],
        "synonyms": ["кішка"],
        "tabooWords": ["мяу", "миша"],
        "hint": "Домашня тварина"
      },
      "EN": { "word": "Cat", "antonyms": [], "synonyms": [], "tabooWords": [], "hint": null },
      "DE": { "word": "Katze", "antonyms": [], "synonyms": [], "tabooWords": [], "hint": null }
    }
  }
]
```

Правила сидера для цього формату:

- Для пакета **`ua-general`** створюються **`WordConcept`** з **`conceptKey`** = `conceptId` (якщо задано) і **один** **`WordTranslation`** мовою **UA** з усіма полями.
- Аналогічно **`en-general`** / **`de-general`** — лише відповідна гілка в `translations`.
- Якщо для потрібної мови немає `word` (порожньо / відсутній блок) — концепт для цього пакета **пропускається**.
- Дедуплікація: якщо є **`conceptId`**, унікальність у межах пакета по **`conceptKey`**; якщо **`conceptId`** немає — дедуп по **`word`** для цієї мови.

Поле **`conceptId`** у JSON при записі в БД потрапляє в **`WordConcept.conceptKey`** (не плутати з UUID `WordConcept.id` або FK `WordTranslation.conceptId`).

---

## Формат B: legacy (лише списки слів)

Об’єкт з ключами мов і масивами рядків:

```json
{
  "UA": ["Яблуко", "Піца"],
  "EN": ["Apple", "Pizza"],
  "DE": ["Apfel", "Pizza"]
}
```

Сидер створює **`WordConcept`** з **`conceptKey: null`** і один переклад лише з **`word`**. Підтримується для поступової міграції файлів на формат A.

---

## Адмін API

`GET /api/admin/packs/:id` у зручному для UI масиві **`words`** повертає для кожного концепта:

- **`id`** — UUID рядка `WordConcept`
- **`conceptKey`** — значення з БД (якщо було засіяно з JSON `conceptId`)
- **`text`** — орієнтовний підпис (UA переклад для адмінки)

---

## Команди

```bash
# Застосувати міграції
pnpm --filter @alias/server db:migrate

# Пересіяти словники (потрібна БД і DATABASE_URL)
pnpm --filter @alias/server db:seed
```

TypeScript для імпорту JSON: у `packages/server/tsconfig.json` увімкнено **`resolveJsonModule`**; у `tsconfig.typecheck.json` включено `prisma/data/**/*.json`.

---

## Пов’язані файли в коді

- `packages/server/prisma/schema.prisma` — `WordPack`, `WordConcept`, `WordTranslation`
- `packages/server/src/services/WordService.ts` — вибірка перекладів і метаданих для гри / QUIZ
- `packages/server/src/routes/admin.ts` — CRUD паків, bulk words, CSV; відображення `conceptKey` у списку слів пакета
