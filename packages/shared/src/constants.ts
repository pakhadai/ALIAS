import { Category, Language } from './enums';

export const DEFAULT_ROUND_TIME = 60;
export const WINNING_SCORE = 30;
export const ROOM_CODE_LENGTH = 5;
export const MAX_PLAYERS = 20;

export const TEAM_COLORS = [
  { class: 'bg-indigo-500', hex: '#6366f1' },
  { class: 'bg-pink-500', hex: '#ec4899' },
  { class: 'bg-emerald-500', hex: '#10b981' },
  { class: 'bg-yellow-500', hex: '#f59e0b' },
  { class: 'bg-purple-500', hex: '#a855f7' },
  { class: 'bg-blue-500', hex: '#3b82f6' },
  { class: 'bg-orange-500', hex: '#f97316' },
  { class: 'bg-red-500', hex: '#ef4444' },
];

export const MOCK_WORDS: Record<Language, Partial<Record<Category, string[]>>> = {
  [Language.UA]: {
    [Category.GENERAL]: ['Кіт', 'Собака', 'Автомобіль', 'Сонце', 'Море', 'Дерево', 'Будинок', 'Книга', 'Телефон', 'Комп\'ютер', 'Літак', 'Київ', 'Картопля', 'М\'яч', 'Гітара', 'Кава', 'Окуляри', 'Рюкзак', 'Міст', 'Годинник'],
    [Category.FOOD]: ['Яблуко', 'Піца', 'Борщ', 'Кава', 'Шоколад', 'Морозиво', 'Суші', 'Паста', 'Хліб', 'Вино', 'Салат', 'Стейк', 'Лимон', 'Сир', 'Вареники'],
    [Category.TRAVEL]: ['Літак', 'Париж', 'Рюкзак', 'Готель', 'Карта', 'Пляж', 'Гори', 'Поїзд', 'Паспорт', 'Квиток', 'Намет', 'Валіза', 'Музей', 'Компас', 'Океан'],
    [Category.SCIENCE]: ['Атом', 'ДНК', 'Планета', 'Мікроскоп', 'Енергія', 'Робот', 'Космос', 'Формула', 'Лабораторія', 'Генетика', 'Квант', 'Телескоп', 'Магніт', 'Еволюція'],
    [Category.MOVIES]: ['Актор', 'Камера', 'Оскар', 'Сценарій', 'Попкорн', 'Голлівуд', 'Трейлер', 'Режисер', 'Комедія', 'Бойовик', 'Мультфільм', 'Кінотеатр', 'Детектив'],
  },
  [Language.DE]: {
    [Category.GENERAL]: [
      'Katze', 'Hund', 'Auto', 'Sonne', 'Meer', 'Baum', 'Haus', 'Buch', 'Telefon', 'Computer',
      'Fahrrad', 'Schlüssel', 'Fenster', 'Tisch', 'Stuhl', 'Uhr', 'Brille', 'Rucksack', 'Kaffee', 'Musik',
      'Schule', 'Arbeit', 'Freund', 'Familie', 'Garten', 'Straße', 'Wasser', 'Feuer', 'Regen', 'Schnee',
    ],
    [Category.FOOD]: [
      'Apfel', 'Pizza', 'Kaffee', 'Schokolade', 'Eis', 'Sushi', 'Pasta', 'Brot', 'Wein', 'Käse',
      'Banane', 'Tomate', 'Kartoffel', 'Salat', 'Suppe', 'Steak', 'Hähnchen', 'Fisch', 'Reis', 'Nudeln',
      'Joghurt', 'Butter', 'Honig', 'Zitrone', 'Erdbeere', 'Kuchen', 'Sandwich', 'Saft', 'Tee', 'Wurst',
    ],
    [Category.TRAVEL]: [
      'Flugzeug', 'Rucksack', 'Hotel', 'Karte', 'Strand', 'Berge', 'Zug', 'Reisepass', 'Ticket', 'Museum',
      'Koffer', 'Reise', 'Grenze', 'Flughafen', 'Bahnhof', 'Fähre', 'Taxi', 'Mietwagen', 'Stadt', 'Dorf',
      'Insel', 'Wüste', 'Wald', 'Wanderung', 'Ausflug', 'Sehenswürdigkeit', 'Souvenir', 'Navigation', 'Kompass', 'Reiseführer',
    ],
    [Category.SCIENCE]: [
      'Atom', 'DNA', 'Planet', 'Mikroskop', 'Energie', 'Roboter', 'Weltraum', 'Formel', 'Labor', 'Genetik',
      'Experiment', 'Chemie', 'Physik', 'Biologie', 'Zelle', 'Algorithmus', 'Daten', 'Theorie', 'Beweis', 'Forschung',
      'Teleskop', 'Magnet', 'Elektron', 'Gravitation', 'Evolutionslehre', 'Klimawandel', 'Bakterien', 'Virus', 'Neuron', 'Quanten',
    ],
    [Category.MOVIES]: [
      'Schauspieler', 'Kamera', 'Oscar', 'Drehbuch', 'Popcorn', 'Hollywood', 'Trailer', 'Regisseur', 'Komödie', 'Action',
      'Drama', 'Horror', 'Thriller', 'Animation', 'Kino', 'Premiere', 'Soundtrack', 'Szene', 'Dialog', 'Untertitel',
      'Blockbuster', 'Fortsetzung', 'Superheld', 'Detektiv', 'Abenteuer', 'Fantasy', 'Science-Fiction', 'Romanze', 'Casting', 'Stunt',
    ],
  },
  [Language.EN]: {
    [Category.GENERAL]: [
      'Cat', 'Dog', 'Car', 'Sun', 'Sea', 'Tree', 'House', 'Book', 'Phone', 'Computer',
      'Bicycle', 'Keys', 'Window', 'Table', 'Chair', 'Clock', 'Glasses', 'Backpack', 'Coffee', 'Music',
      'School', 'Work', 'Friend', 'Family', 'Garden', 'Street', 'Water', 'Fire', 'Rain', 'Snow',
    ],
    [Category.FOOD]: [
      'Apple', 'Pizza', 'Coffee', 'Chocolate', 'Ice Cream', 'Sushi', 'Pasta', 'Bread', 'Wine', 'Cheese',
      'Banana', 'Tomato', 'Potato', 'Salad', 'Soup', 'Steak', 'Chicken', 'Fish', 'Rice', 'Noodles',
      'Yogurt', 'Butter', 'Honey', 'Lemon', 'Strawberry', 'Cake', 'Sandwich', 'Juice', 'Tea', 'Sausage',
    ],
    [Category.TRAVEL]: [
      'Airplane', 'Backpack', 'Hotel', 'Map', 'Beach', 'Mountains', 'Train', 'Passport', 'Ticket', 'Museum',
      'Suitcase', 'Trip', 'Border', 'Airport', 'Station', 'Ferry', 'Taxi', 'Rental Car', 'City', 'Village',
      'Island', 'Desert', 'Forest', 'Hike', 'Excursion', 'Landmark', 'Souvenir', 'Navigation', 'Compass', 'Guidebook',
    ],
    [Category.SCIENCE]: [
      'Atom', 'DNA', 'Planet', 'Microscope', 'Energy', 'Robot', 'Space', 'Formula', 'Laboratory', 'Genetics',
      'Experiment', 'Chemistry', 'Physics', 'Biology', 'Cell', 'Algorithm', 'Data', 'Theory', 'Proof', 'Research',
      'Telescope', 'Magnet', 'Electron', 'Gravity', 'Evolution', 'Climate Change', 'Bacteria', 'Virus', 'Neuron', 'Quantum',
    ],
    [Category.MOVIES]: [
      'Actor', 'Camera', 'Oscar', 'Script', 'Popcorn', 'Hollywood', 'Trailer', 'Director', 'Comedy', 'Action',
      'Drama', 'Horror', 'Thriller', 'Animation', 'Cinema', 'Premiere', 'Soundtrack', 'Scene', 'Dialogue', 'Subtitles',
      'Blockbuster', 'Sequel', 'Superhero', 'Detective', 'Adventure', 'Fantasy', 'Sci‑Fi', 'Romance', 'Casting', 'Stunt',
    ],
  },
};
