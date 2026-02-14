import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const words: { text: string; language: string; category: string }[] = [
  // Ukrainian - General
  ...['Кіт', 'Собака', 'Автомобіль', 'Сонце', 'Море', 'Дерево', 'Будинок', 'Книга', 'Телефон', 'Комп\'ютер', 'Літак', 'Київ', 'Картопля', 'М\'яч', 'Гітара', 'Кава', 'Окуляри', 'Рюкзак', 'Міст', 'Годинник'].map(text => ({ text, language: 'UA', category: 'General' })),
  // Ukrainian - Food
  ...['Яблуко', 'Піца', 'Борщ', 'Кава', 'Шоколад', 'Морозиво', 'Суші', 'Паста', 'Хліб', 'Вино', 'Салат', 'Стейк', 'Лимон', 'Сир', 'Вареники'].map(text => ({ text, language: 'UA', category: 'Food' })),
  // Ukrainian - Travel
  ...['Літак', 'Париж', 'Рюкзак', 'Готель', 'Карта', 'Пляж', 'Гори', 'Поїзд', 'Паспорт', 'Квиток', 'Намет', 'Валіза', 'Музей', 'Компас', 'Океан'].map(text => ({ text, language: 'UA', category: 'Travel' })),
  // Ukrainian - Science
  ...['Атом', 'ДНК', 'Планета', 'Мікроскоп', 'Енергія', 'Робот', 'Космос', 'Формула', 'Лабораторія', 'Генетика', 'Квант', 'Телескоп', 'Магніт', 'Еволюція'].map(text => ({ text, language: 'UA', category: 'Science' })),
  // Ukrainian - Movies
  ...['Актор', 'Камера', 'Оскар', 'Сценарій', 'Попкорн', 'Голлівуд', 'Трейлер', 'Режисер', 'Комедія', 'Бойовик', 'Мультфільм', 'Кінотеатр', 'Детектив'].map(text => ({ text, language: 'UA', category: 'Movies' })),

  // German - General
  ...['Katze', 'Hund', 'Auto', 'Sonne', 'Meer', 'Baum', 'Haus', 'Buch', 'Telefon', 'Computer'].map(text => ({ text, language: 'DE', category: 'General' })),
  // German - Food
  ...['Apfel', 'Pizza', 'Borscht', 'Kaffee', 'Schokolade', 'Eis', 'Sushi', 'Pasta', 'Brot', 'Wein'].map(text => ({ text, language: 'DE', category: 'Food' })),
  // German - Travel
  ...['Flugzeug', 'Paris', 'Rucksack', 'Hotel', 'Karte', 'Strand', 'Berge', 'Zug', 'Reisepass', 'Ticket'].map(text => ({ text, language: 'DE', category: 'Travel' })),
  // German - Science
  ...['Atom', 'DNA', 'Planet', 'Mikroskop', 'Energie', 'Roboter', 'Weltraum', 'Formel', 'Labor', 'Genetik'].map(text => ({ text, language: 'DE', category: 'Science' })),
  // German - Movies
  ...['Schauspieler', 'Kamera', 'Oscar', 'Drehbuch', 'Popcorn', 'Hollywood', 'Trailer', 'Regisseur', 'Komödie', 'Action'].map(text => ({ text, language: 'DE', category: 'Movies' })),

  // English - General
  ...['Cat', 'Dog', 'Car', 'Sun', 'Sea', 'Tree', 'House', 'Book', 'Phone', 'Computer'].map(text => ({ text, language: 'EN', category: 'General' })),
  // English - Food
  ...['Apple', 'Pizza', 'Borscht', 'Coffee', 'Chocolate', 'Ice Cream', 'Sushi', 'Pasta', 'Bread', 'Wine'].map(text => ({ text, language: 'EN', category: 'Food' })),
  // English - Travel
  ...['Airplane', 'Paris', 'Backpack', 'Hotel', 'Map', 'Beach', 'Mountains', 'Train', 'Passport', 'Ticket'].map(text => ({ text, language: 'EN', category: 'Travel' })),
  // English - Science
  ...['Atom', 'DNA', 'Planet', 'Microscope', 'Energy', 'Robot', 'Space', 'Formula', 'Laboratory', 'Genetics'].map(text => ({ text, language: 'EN', category: 'Science' })),
  // English - Movies
  ...['Actor', 'Camera', 'Oscar', 'Script', 'Popcorn', 'Hollywood', 'Trailer', 'Director', 'Comedy', 'Action'].map(text => ({ text, language: 'EN', category: 'Movies' })),
];

async function main() {
  console.log('Seeding database...');

  for (const word of words) {
    await prisma.word.upsert({
      where: {
        text_language_category: {
          text: word.text,
          language: word.language,
          category: word.category,
        },
      },
      update: {},
      create: word,
    });
  }

  const count = await prisma.word.count();
  console.log(`Seeded ${count} words`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
