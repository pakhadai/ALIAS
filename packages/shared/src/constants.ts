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
    [Category.GENERAL]: ['Katze', 'Hund', 'Auto', 'Sonne', 'Meer', 'Baum', 'Haus', 'Buch', 'Telefon', 'Computer'],
    [Category.FOOD]: ['Apfel', 'Pizza', 'Borscht', 'Kaffee', 'Schokolade', 'Eis', 'Sushi', 'Pasta', 'Brot', 'Wein'],
    [Category.TRAVEL]: ['Flugzeug', 'Paris', 'Rucksack', 'Hotel', 'Karte', 'Strand', 'Berge', 'Zug', 'Reisepass', 'Ticket'],
    [Category.SCIENCE]: ['Atom', 'DNA', 'Planet', 'Mikroskop', 'Energie', 'Roboter', 'Weltraum', 'Formel', 'Labor', 'Genetik'],
    [Category.MOVIES]: ['Schauspieler', 'Kamera', 'Oscar', 'Drehbuch', 'Popcorn', 'Hollywood', 'Trailer', 'Regisseur', 'Komödie', 'Action'],
  },
  [Language.EN]: {
    [Category.GENERAL]: ['Cat', 'Dog', 'Car', 'Sun', 'Sea', 'Tree', 'House', 'Book', 'Phone', 'Computer'],
    [Category.FOOD]: ['Apple', 'Pizza', 'Borscht', 'Coffee', 'Chocolate', 'Ice Cream', 'Sushi', 'Pasta', 'Bread', 'Wine'],
    [Category.TRAVEL]: ['Airplane', 'Paris', 'Backpack', 'Hotel', 'Map', 'Beach', 'Mountains', 'Train', 'Passport', 'Ticket'],
    [Category.SCIENCE]: ['Atom', 'DNA', 'Planet', 'Microscope', 'Energy', 'Robot', 'Space', 'Formula', 'Laboratory', 'Genetics'],
    [Category.MOVIES]: ['Actor', 'Camera', 'Oscar', 'Script', 'Popcorn', 'Hollywood', 'Trailer', 'Director', 'Comedy', 'Action'],
  },
};
