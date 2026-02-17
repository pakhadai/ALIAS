import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Word data per language/category ───────────────────────────────────

const UA_GENERAL = [
  'Кіт', 'Собака', 'Автомобіль', 'Сонце', 'Море', 'Дерево', 'Будинок', 'Книга', 'Телефон', "Комп'ютер",
  'Літак', 'Київ', 'Картопля', "М'яч", 'Гітара', 'Кава', 'Окуляри', 'Рюкзак', 'Міст', 'Годинник',
  'Вікно', 'Двері', 'Лампа', 'Стіл', 'Стілець', 'Ліжко', 'Дзеркало', 'Ключ', 'Замок', 'Парасолька',
  'Ковдра', 'Подушка', 'Чашка', 'Тарілка', 'Ложка', 'Виделка', 'Ніж', 'Пляшка', 'Сумка', 'Гаманець',
  'Зошит', 'Олівець', 'Ручка', 'Папір', 'Ножиці', 'Клей', 'Лінійка', 'Фарби', 'Пензлик', 'Калькулятор',
  'Велосипед', 'Мотоцикл', 'Автобус', 'Трамвай', 'Метро', 'Таксі', 'Потяг', 'Корабель', 'Ракета', 'Гелікоптер',
  'Школа', 'Університет', 'Лікарня', 'Аптека', 'Магазин', 'Ринок', 'Банк', 'Пошта', 'Бібліотека', 'Церква',
  'Футбол', 'Баскетбол', 'Теніс', 'Плавання', 'Біг', 'Шахи', 'Танець', 'Спів', 'Малювання', 'Фотографія',
  'Лев', 'Слон', 'Жираф', 'Мавпа', 'Ведмідь', 'Вовк', 'Лисиця', 'Заєць', 'Олень', 'Орел',
  'Троянда', 'Тюльпан', 'Соняшник', 'Ромашка', 'Фіалка', 'Кактус', 'Пальма', 'Береза', 'Дуб', 'Сосна',
  'Дощ', 'Сніг', 'Вітер', 'Хмара', 'Блискавка', 'Веселка', 'Туман', 'Мороз', 'Спека', 'Шторм',
  'Свічка', 'Вогонь', 'Вода', 'Земля', 'Повітря', 'Камінь', 'Пісок', 'Глина', 'Метал', 'Скло',
  'Привид', 'Дракон', 'Єдиноріг', 'Русалка', 'Фея', 'Лицар', 'Пірат', 'Ковбой', 'Ніндзя', 'Робот',
  'Серце', 'Зірка', 'Місяць', 'Коло', 'Трикутник', 'Квадрат', 'Спіраль', 'Стрілка', 'Хрест', 'Корона',
  'Свобода', 'Мрія', 'Щастя', 'Любов', 'Дружба', 'Сила', 'Мудрість', 'Час', 'Таємниця', 'Пригода',
  'Парк', 'Фонтан', 'Памятник', 'Площа', 'Вулиця', 'Провулок', 'Набережна', 'Ліс', 'Поле', 'Озеро',
  'Гора', 'Долина', 'Острів', 'Печера', 'Водоспад', 'Вулкан', 'Пустеля', 'Джунглі', 'Болото', 'Каньйон',
  'Шоколад', 'Цукерка', 'Торт', 'Печиво', 'Мед', 'Варення', 'Пиріг', 'Млинці', 'Каша', 'Суп',
  'Гроші', 'Монета', 'Купюра', 'Карта', 'Компас', 'Бінокль', 'Прапор', 'Медаль', 'Кубок', 'Диплом',
  'Антена', 'Радіо', 'Телевізор', 'Пульт', 'Навушники', 'Мікрофон', 'Колонка', 'Клавіатура', 'Миша', 'Екран',
];

const UA_FOOD = [
  'Яблуко', 'Піца', 'Борщ', 'Кава', 'Шоколад', 'Морозиво', 'Суші', 'Паста', 'Хліб', 'Вино',
  'Салат', 'Стейк', 'Лимон', 'Сир', 'Вареники', 'Пельмені', 'Голубці', 'Деруни', 'Котлета', 'Сосиска',
  'Банан', 'Апельсин', 'Полуниця', 'Вишня', 'Виноград', 'Кавун', 'Диня', 'Персик', 'Ананас', 'Манго',
  'Помідор', 'Огірок', 'Морква', 'Цибуля', 'Часник', 'Перець', 'Капуста', 'Баклажан', 'Кабачок', 'Гарбуз',
  'Гриби', 'Рис', 'Гречка', 'Макарони', 'Овсянка', 'Кукурудза', 'Квасоля', 'Горох', 'Сочевиця', 'Мак',
  'Масло', 'Сметана', 'Молоко', 'Кефір', 'Йогурт', 'Творог', 'Вершки', 'Яйце', 'Мука', 'Цукор',
  'Сіль', 'Кориця', 'Ваніль', 'Базилік', 'Укроп', 'Петрушка', 'Мята', 'Розмарин', 'Імбир', 'Орегано',
  'Чай', 'Какао', 'Сік', 'Компот', 'Лимонад', 'Смузі', 'Коктейль', 'Пиво', 'Шампанське', 'Віскі',
  'Бургер', 'Хот-дог', 'Сендвіч', 'Тако', 'Шаурма', 'Круасан', 'Багет', 'Тост', 'Крекер', 'Чіпси',
  'Тірамісу', 'Чізкейк', 'Пудинг', 'Желе', 'Мус', 'Еклер', 'Макарон', 'Вафлі', 'Пончик', 'Кекс',
  'Карамель', 'Нуга', 'Марципан', 'Зефір', 'Халва', 'Козинак', 'Рахат-лукум', 'Пастила', 'Цукат', 'Джем',
  'Оселедець', 'Лосось', 'Тунець', 'Креветки', 'Краб', 'Мідії', 'Кальмар', 'Восьминіг', 'Ікра', 'Устриці',
  'Курка', 'Індичка', 'Свинина', 'Яловичина', 'Баранина', 'Шинка', 'Бекон', 'Ковбаса', 'Сало', 'Паштет',
  'Олія', 'Оцет', 'Соус', 'Кетчуп', 'Майонез', 'Гірчиця', 'Аджика', 'Хрін', 'Соєвий соус', 'Песто',
  'Фондю', 'Рататуй', 'Газпачо', 'Мінестроне', 'Том ям', 'Харчо', 'Солянка', 'Окрошка', 'Юшка', 'Бульйон',
  'Картопля фрі', 'Пюре', 'Запіканка', 'Рагу', 'Плов', 'Різотто', 'Паелья', 'Лазанья', 'Равіолі', 'Ньокі',
  'Хумус', 'Фалафель', 'Табуле', 'Долма', 'Мусака', 'Гуляш', 'Штрудель', 'Кнедлик', 'Шніцель', 'Бретцель',
  'Чебурек', 'Самса', 'Лагман', 'Манти', 'Бешбармак', 'Пахлава', 'Кутя', 'Узвар', 'Сирники', 'Оладки',
  'Повидло', 'Маринад', 'Соління', 'Квашена капуста', 'Гранола', 'Тофу', 'Авокадо', 'Кіноа', 'Чіа', 'Асаї',
  'Спіруліна', 'Матча', 'Комбуча', 'Міндаль', 'Волоський горіх', 'Кешю', 'Фісташка', 'Арахіс', 'Фундук', 'Кокос',
];

const UA_TRAVEL = [
  'Літак', 'Париж', 'Рюкзак', 'Готель', 'Карта', 'Пляж', 'Гори', 'Поїзд', 'Паспорт', 'Квиток',
  'Намет', 'Валіза', 'Музей', 'Компас', 'Океан', 'Круїз', 'Екскурсія', 'Путівник', 'Віза', 'Аеропорт',
  'Вокзал', 'Порт', 'Кемпінг', 'Хостел', 'Мотель', 'Бунгало', 'Вілла', 'Шале', 'Курорт', 'Санаторій',
  'Сувенір', 'Фотоапарат', 'Селфі', 'Подорож', 'Пригода', 'Відпочинок', 'Канікули', 'Відпустка', 'Турист', 'Мандрівник',
  'Лондон', 'Рим', 'Барселона', 'Амстердам', 'Прага', 'Відень', 'Берлін', 'Токіо', 'Нью-Йорк', 'Стамбул',
  'Єгипет', 'Греція', 'Італія', 'Іспанія', 'Таїланд', 'Японія', 'Австралія', 'Бразилія', 'Мексика', 'Індія',
  'Піраміди', 'Колізей', 'Ейфелева вежа', 'Біг-Бен', 'Тадж-Махал', 'Велика стіна', 'Статуя Свободи', 'Мачу-Пікчу', 'Сафарі', 'Базар',
  'Серфінг', 'Дайвінг', 'Сноуборд', 'Лижі', 'Каяк', 'Парапланеризм', 'Зіплайн', 'Рафтинг', 'Альпінізм', 'Треккінг',
  'Карнавал', 'Фестиваль', 'Ярмарок', 'Парад', 'Вуличний артист', 'Місцева кухня', 'Дегустація', 'Винарня', 'Ресторан', 'Кафе',
  'Захід сонця', 'Схід сонця', 'Зоряне небо', 'Північне сяйво', 'Водоспад', 'Вулкан', 'Ріф', 'Лагуна', 'Оазис', 'Каньйон',
  'Автостоп', 'Велотур', 'Кругосвітня', 'Бекпекер', 'Номад', 'Орієнтування', 'Навігатор', 'Маршрут', 'Трансфер', 'Прокат',
  'Митниця', 'Кордон', 'Посольство', 'Страховка', 'Бронювання', 'Реєстрація', 'Посадка', 'Турбуленція', 'Затримка', 'Пересадка',
  'Сонцезахисний крем', 'Панама', 'Сонцезахисні окуляри', 'Шльопанці', 'Купальник', 'Рушник', 'Аптечка', 'Ліхтарик', 'Спальник', 'Каримат',
  'Острів', 'Архіпелаг', 'Фіорд', 'Дельта', 'Мис', 'Протока', 'Затока', 'Бухта', 'Півострів', 'Атол',
  'Джунглі', 'Савана', 'Тундра', 'Тайга', 'Степ', 'Прерія', 'Пампа', 'Мангрови', 'Коралові рифи', 'Льодовик',
  'Храм', 'Мечеть', 'Собор', 'Палац', 'Фортеця', 'Руїни', 'Амфітеатр', 'Акведук', 'Обеліск', 'Маяк',
  'Бутик', 'Антикваріат', 'Галерея', 'Оперний театр', 'Зоопарк', 'Ботанічний сад', 'Акваріум', 'Планетарій', 'Обсерваторія', 'Парк розваг',
  'Пором', 'Яхта', 'Катамаран', 'Гондола', 'Канатна дорога', 'Фунікулер', 'Монорейка', 'Рикша', 'Тук-тук', 'Караван',
  'Хмарочос', 'Базиліка', 'Мінарет', 'Пагода', 'Вітряк', 'Замок', 'Садиба', 'Особняк', 'Будиночок на дереві', 'Іглу',
  'Розмовник', 'Перекладач', 'Гід', 'Портьє', 'Бармен', 'Офіціант', 'Пілот', 'Стюардеса', 'Капітан', 'Провідник',
];

const UA_SCIENCE = [
  'Атом', 'ДНК', 'Планета', 'Мікроскоп', 'Енергія', 'Робот', 'Космос', 'Формула', 'Лабораторія', 'Генетика',
  'Квант', 'Телескоп', 'Магніт', 'Еволюція', 'Гравітація', 'Молекула', 'Електрон', 'Протон', 'Нейтрон', 'Фотон',
  'Галактика', 'Зірка', 'Чорна діра', 'Туманність', 'Комета', 'Астероїд', 'Метеорит', 'Супутник', 'Орбіта', "Сузір'я",
  'Вакцина', 'Антибіотик', 'Вірус', 'Бактерія', 'Імунітет', 'Клітина', 'Тканина', 'Орган', 'Хромосома', 'Ген',
  'Хімія', 'Фізика', 'Біологія', 'Математика', 'Геологія', 'Астрономія', 'Екологія', 'Ботаніка', 'Зоологія', 'Психологія',
  'Експеримент', 'Гіпотеза', 'Теорія', 'Закон', 'Доказ', 'Аналіз', 'Синтез', 'Каталіз', 'Реакція', 'Розчин',
  "Температура", 'Тиск', "Об'єм", 'Маса', 'Швидкість', 'Прискорення', 'Частота', 'Хвиля', 'Резонанс', 'Вібрація',
  'Електрика', 'Магнетизм', 'Радіація', 'Рентген', 'Ультразвук', 'Інфрачервоний', 'Ультрафіолет', 'Лазер', 'Оптика', 'Призма',
  "Динозавр", "Скам'янілість", 'Палеонтологія', 'Археологія', 'Антропологія', 'Геном', 'Мутація', 'Селекція', 'Клонування', 'Стовбурова клітина',
  'Вуглець', 'Кисень', 'Водень', 'Азот', 'Залізо', 'Золото', 'Мідь', 'Алюміній', 'Уран', 'Плутоній',
  'Нейрон', 'Синапс', 'Мозок', 'Рефлекс', 'Свідомість', "Пам'ять", 'Інтелект', 'Нейромережа', 'Алгоритм', 'Штучний інтелект',
  'Термодинаміка', 'Ентропія', 'Кінетика', 'Потенціал', 'Індукція', 'Конвекція', 'Дифузія', 'Осмос', 'Капілярність', 'Турбулентність',
  'Полімер', 'Кристал', 'Сплав', 'Композит', 'Нанотехнологія', 'Графен', 'Напівпровідник', 'Надпровідник', 'Оптоволокно', 'Плазма',
  'Відносність', 'Квантова механіка', 'Струнна теорія', 'Темна матерія', 'Темна енергія', 'Антиматерія', 'Бозон Хіггса', 'Великий вибух', 'Паралельний всесвіт', 'Кротова нора',
  'Фотосинтез', 'Метаболізм', 'Мітоз', 'Мейоз', 'Ферментація', 'Дихання', 'Кровообіг', 'Травлення', 'Регенерація', 'Гомеостаз',
  'Вакуум', 'Абсолютний нуль', 'Швидкість світла', 'Звукова хвиля', 'Інтерференція', 'Дифракція', 'Поляризація', 'Спектр', 'Дисперсія', 'Рефракція',
  'Сейсмограф', 'Барометр', 'Термометр', 'Амперметр', 'Вольтметр', 'Осцилограф', 'Спектрометр', 'Центрифуга', 'Піпетка', 'Пробірка',
  'Марс', 'Венера', 'Юпітер', 'Сатурн', 'Нептун', 'Плутон', 'Місяць', 'Сонце', 'Андромеда', 'Чумацький шлях',
  'Біосфера', 'Екосистема', 'Ареал', 'Симбіоз', 'Паразитизм', 'Мімікрія', 'Адаптація', 'Міграція', 'Гібернація', 'Метаморфоза',
  'Теорема', 'Аксіома', 'Інтеграл', 'Похідна', 'Матриця', 'Вектор', 'Фрактал', 'Імовірність', 'Статистика', 'Логарифм',
];

const UA_MOVIES = [
  'Актор', 'Камера', 'Оскар', 'Сценарій', 'Попкорн', 'Голлівуд', 'Трейлер', 'Режисер', 'Комедія', 'Бойовик',
  'Мультфільм', 'Кінотеатр', 'Детектив', 'Трилер', 'Жахи', 'Мелодрама', 'Фантастика', 'Документальний', 'Вестерн', 'Мюзикл',
  "Суперзірка", "Прем'єра", 'Продюсер', 'Оператор', 'Каскадер', 'Дублер', 'Гримерка', 'Костюмер', 'Декорація', 'Знімальний майданчик',
  "Монтаж", 'Спецефекти', "Комп'ютерна графіка", 'Саундтрек', 'Дубляж', 'Субтитри', 'Кадр', 'Сцена', 'Дубль', 'Хлопушка',
  'Джокер', 'Бетмен', 'Супермен', 'Людина-павук', 'Залізна людина', 'Тор', 'Халк', 'Капітан Америка', 'Чорна Пантера', 'Танос',
  'Зоряні війни', 'Гаррі Поттер', 'Володар перснів', 'Матриця', 'Аватар', 'Титанік', 'Форрест Гамп', 'Хрещений батько', 'Інтерстеллар', 'Початок',
  'Сіквел', 'Пріквел', 'Ремейк', 'Спін-оф', 'Кросовер', 'Франшиза', 'Серіал', 'Пілотний епізод', 'Фінал сезону', 'Кліфхенгер',
  'Нагорода', 'Номінація', 'Червоний килим', 'Фотосесія', "Інтерв'ю", 'Автограф', 'Фан', 'Критик', 'Рецензія', 'Рейтинг',
  'Анімація', 'Піксар', 'Дісней', 'Студія Гіблі', 'Аніме', 'Манга', 'Стоп-моушн', 'Ротоскопія', 'Моушн-кепчер', 'Рендеринг',
  'Блокбастер', 'Незалежне кіно', 'Артхаус', 'Нуар', 'Кіберпанк', 'Стімпанк', 'Дистопія', 'Утопія', 'Апокаліпсис', 'Постапокаліпсис',
  'Білет', 'Екран', 'Звук', 'Кінозал', 'Прожектор', 'Рупор', 'Візок', 'Кран', 'Штатив', 'Рейки',
  'Кастинг', 'Аудиція', 'Репетиція', 'Проба', 'Імпровізація', 'Діалог', 'Монолог', 'Флешбек', 'Голос за кадром', 'Крупний план',
  'Спілберг', 'Тарантіно', 'Нолан', 'Скорсезе', 'Кубрик', 'Хічкок', 'Камерон', 'Кополла', 'Фінчер', 'Лінч',
  'Бондіана', 'Місія нездійсненна', 'Швидкий і шалений', 'Парк Юрського періоду', 'Індіана Джонс', 'Пірати Карибського моря', 'Трансформери', 'Месники', 'Ікс-мени', 'Ліга справедливості',
  'Драма', 'Трагедія', 'Пародія', 'Сатира', 'Фарс', 'Кабаре', 'Водевіль', 'Опера', 'Балет', 'Пантоміма',
  'Проектор', 'Плівка', 'Цифрове кіно', '3D', 'IMAX', 'Долбі', 'Стрімінг', 'Нетфлікс', 'Платформа', 'Підписка',
  'Кіномарафон', 'Кінофестиваль', 'Канни', 'Венеція', 'Берлінале', 'Санденс', 'Золотий глобус', 'БАФТА', 'Сезар', 'Ніка',
  'Саспенс', 'Інтрига', 'Поворот сюжету', "Розв'язка", 'Кульмінація', 'Експозиція', 'Конфлікт', 'Антагоніст', 'Протагоніст', 'Антигерой',
  'Грим', 'Костюм', 'Перука', 'Маска', 'Світло', 'Тінь', 'Силует', 'Панорама', 'Наїзд', 'Відїзд',
  'Збори', 'Бюджет', 'Каса', 'Промоція', 'Постер', 'Тізер', 'Прес-реліз', "Допрем'єрний показ", 'Ексклюзив', 'Ембарго',
];

const EN_GENERAL = [
  'Cat', 'Dog', 'Car', 'Sun', 'Sea', 'Tree', 'House', 'Book', 'Phone', 'Computer',
  'Airplane', 'Bridge', 'Guitar', 'Coffee', 'Glasses', 'Backpack', 'Clock', 'Mirror', 'Window', 'Door',
  'Lamp', 'Table', 'Chair', 'Bed', 'Key', 'Lock', 'Umbrella', 'Blanket', 'Pillow', 'Cup',
  'Plate', 'Spoon', 'Fork', 'Knife', 'Bottle', 'Bag', 'Wallet', 'Notebook', 'Pencil', 'Pen',
  'Paper', 'Scissors', 'Glue', 'Ruler', 'Brush', 'Calculator', 'Bicycle', 'Motorcycle', 'Bus', 'Subway',
  'Taxi', 'Train', 'Ship', 'Rocket', 'Helicopter', 'School', 'Hospital', 'Pharmacy', 'Market', 'Bank',
  'Library', 'Church', 'Football', 'Basketball', 'Tennis', 'Swimming', 'Running', 'Chess', 'Dance', 'Singing',
  'Painting', 'Photography', 'Lion', 'Elephant', 'Giraffe', 'Monkey', 'Bear', 'Wolf', 'Fox', 'Rabbit',
  'Deer', 'Eagle', 'Rose', 'Tulip', 'Sunflower', 'Daisy', 'Cactus', 'Palm', 'Birch', 'Oak',
  'Pine', 'Rain', 'Snow', 'Wind', 'Cloud', 'Lightning', 'Rainbow', 'Fog', 'Frost', 'Storm',
  'Candle', 'Fire', 'Water', 'Earth', 'Air', 'Stone', 'Sand', 'Metal', 'Glass', 'Ghost',
  'Dragon', 'Unicorn', 'Mermaid', 'Fairy', 'Knight', 'Pirate', 'Cowboy', 'Ninja', 'Robot', 'Heart',
  'Star', 'Moon', 'Circle', 'Triangle', 'Square', 'Spiral', 'Arrow', 'Crown', 'Freedom', 'Dream',
  'Happiness', 'Love', 'Friendship', 'Strength', 'Wisdom', 'Time', 'Mystery', 'Adventure', 'Park', 'Fountain',
  'Monument', 'Street', 'River', 'Lake', 'Mountain', 'Valley', 'Island', 'Cave', 'Waterfall', 'Volcano',
  'Desert', 'Jungle', 'Swamp', 'Canyon', 'Chocolate', 'Candy', 'Cake', 'Honey', 'Pie', 'Soup',
  'Money', 'Coin', 'Flag', 'Medal', 'Trophy', 'Diploma', 'Antenna', 'Radio', 'Television', 'Headphones',
  'Microphone', 'Speaker', 'Keyboard', 'Screen', 'Sunset', 'Sunrise', 'Whistle', 'Bell', 'Drum', 'Flute',
  'Trumpet', 'Violin', 'Piano', 'Harp', 'Accordion', 'Balloon', 'Fireworks', 'Confetti', 'Ribbon', 'Gift',
  'Puzzle', 'Dice', 'Cards', 'Board game', 'Kite', 'Swing', 'Slide', 'Trampoline', 'Hammock', 'Tent',
];

const EN_FOOD = [
  'Apple', 'Pizza', 'Borscht', 'Coffee', 'Chocolate', 'Ice Cream', 'Sushi', 'Pasta', 'Bread', 'Wine',
  'Salad', 'Steak', 'Lemon', 'Cheese', 'Dumplings', 'Burger', 'Hot dog', 'Sandwich', 'Taco', 'Wrap',
  'Banana', 'Orange', 'Strawberry', 'Cherry', 'Grape', 'Watermelon', 'Melon', 'Peach', 'Pineapple', 'Mango',
  'Tomato', 'Cucumber', 'Carrot', 'Onion', 'Garlic', 'Pepper', 'Cabbage', 'Eggplant', 'Zucchini', 'Pumpkin',
  'Mushroom', 'Rice', 'Buckwheat', 'Noodles', 'Oatmeal', 'Corn', 'Beans', 'Peas', 'Lentils', 'Quinoa',
  'Butter', 'Sour cream', 'Milk', 'Yogurt', 'Cottage cheese', 'Cream', 'Egg', 'Flour', 'Sugar', 'Salt',
  'Cinnamon', 'Vanilla', 'Basil', 'Dill', 'Parsley', 'Mint', 'Rosemary', 'Ginger', 'Turmeric', 'Oregano',
  'Tea', 'Cocoa', 'Juice', 'Lemonade', 'Smoothie', 'Cocktail', 'Beer', 'Champagne', 'Whiskey', 'Rum',
  'Croissant', 'Baguette', 'Toast', 'Cracker', 'Chips', 'Pretzel', 'Muffin', 'Scone', 'Pancake', 'Waffle',
  'Tiramisu', 'Cheesecake', 'Pudding', 'Jelly', 'Mousse', 'Eclair', 'Macaron', 'Donut', 'Cupcake', 'Brownie',
  'Caramel', 'Nougat', 'Marzipan', 'Marshmallow', 'Fudge', 'Toffee', 'Praline', 'Truffle', 'Meringue', 'Sorbet',
  'Salmon', 'Tuna', 'Shrimp', 'Crab', 'Lobster', 'Mussels', 'Squid', 'Octopus', 'Caviar', 'Oyster',
  'Chicken', 'Turkey', 'Pork', 'Beef', 'Lamb', 'Ham', 'Bacon', 'Sausage', 'Ribs', 'Brisket',
  'Ketchup', 'Mayonnaise', 'Mustard', 'Soy sauce', 'Pesto', 'Hummus', 'Guacamole', 'Salsa', 'Ranch', 'Vinaigrette',
  'Fondue', 'Ratatouille', 'Gazpacho', 'Minestrone', 'Chowder', 'Gumbo', 'Bisque', 'Broth', 'Stew', 'Chili',
  'French fries', 'Mashed potato', 'Casserole', 'Pilaf', 'Risotto', 'Paella', 'Lasagna', 'Ravioli', 'Gnocchi', 'Couscous',
  'Falafel', 'Kebab', 'Gyros', 'Dim sum', 'Spring roll', 'Tempura', 'Ramen', 'Pho', 'Bibimbap', 'Pad Thai',
  'Schnitzel', 'Goulash', 'Strudel', 'Bratwurst', 'Pierogi', 'Blintz', 'Crepe', 'Quiche', 'Souffle', 'Creme brulee',
  'Avocado', 'Tofu', 'Granola', 'Acai', 'Matcha', 'Kombucha', 'Almond', 'Walnut', 'Cashew', 'Pistachio',
  'Olive oil', 'Vinegar', 'Honey', 'Maple syrup', 'Jam', 'Marmalade', 'Chutney', 'Relish', 'Pickle', 'Kimchi',
];

const EN_TRAVEL = [
  'Airplane', 'Paris', 'Backpack', 'Hotel', 'Map', 'Beach', 'Mountains', 'Train', 'Passport', 'Ticket',
  'Tent', 'Suitcase', 'Museum', 'Compass', 'Ocean', 'Cruise', 'Excursion', 'Guidebook', 'Visa', 'Airport',
  'Station', 'Port', 'Camping', 'Hostel', 'Motel', 'Bungalow', 'Villa', 'Chalet', 'Resort', 'Spa',
  'Souvenir', 'Camera', 'Selfie', 'Journey', 'Adventure', 'Vacation', 'Holiday', 'Tourist', 'Traveler', 'Nomad',
  'London', 'Rome', 'Barcelona', 'Amsterdam', 'Prague', 'Vienna', 'Berlin', 'Tokyo', 'New York', 'Istanbul',
  'Egypt', 'Greece', 'Italy', 'Spain', 'Thailand', 'Japan', 'Australia', 'Brazil', 'Mexico', 'India',
  'Pyramids', 'Colosseum', 'Eiffel Tower', 'Big Ben', 'Taj Mahal', 'Great Wall', 'Statue of Liberty', 'Machu Picchu', 'Safari', 'Bazaar',
  'Surfing', 'Diving', 'Snowboard', 'Skiing', 'Kayak', 'Paragliding', 'Zipline', 'Rafting', 'Climbing', 'Trekking',
  'Carnival', 'Festival', 'Fair', 'Parade', 'Street food', 'Wine tasting', 'Vineyard', 'Restaurant', 'Cafe', 'Pub',
  'Sunset', 'Sunrise', 'Stargazing', 'Northern lights', 'Waterfall', 'Volcano', 'Coral reef', 'Lagoon', 'Oasis', 'Canyon',
  'Hitchhiking', 'Road trip', 'Round trip', 'Backpacker', 'Navigator', 'Route', 'Transfer', 'Rental', 'Customs', 'Border',
  'Embassy', 'Insurance', 'Booking', 'Check-in', 'Boarding', 'Turbulence', 'Delay', 'Layover', 'Jet lag', 'First class',
  'Sunscreen', 'Sunglasses', 'Flip-flops', 'Swimsuit', 'Towel', 'First aid', 'Flashlight', 'Sleeping bag', 'Hammock', 'Binoculars',
  'Island', 'Archipelago', 'Fjord', 'Delta', 'Cape', 'Strait', 'Bay', 'Peninsula', 'Atoll', 'Glacier',
  'Jungle', 'Savanna', 'Tundra', 'Steppe', 'Prairie', 'Mangrove', 'Rainforest', 'Wetland', 'Plateau', 'Gorge',
  'Temple', 'Mosque', 'Cathedral', 'Palace', 'Fortress', 'Ruins', 'Amphitheater', 'Aqueduct', 'Obelisk', 'Lighthouse',
  'Marketplace', 'Gallery', 'Opera house', 'Zoo', 'Botanical garden', 'Aquarium', 'Planetarium', 'Observatory', 'Theme park', 'Waterpark',
  'Ferry', 'Yacht', 'Catamaran', 'Gondola', 'Cable car', 'Funicular', 'Monorail', 'Rickshaw', 'Tuk-tuk', 'Caravan',
  'Skyscraper', 'Windmill', 'Castle', 'Mansion', 'Cottage', 'Treehouse', 'Igloo', 'Yurt', 'Houseboat', 'Cabin',
  'Phrasebook', 'Translator', 'Guide', 'Concierge', 'Bartender', 'Waiter', 'Pilot', 'Captain', 'Steward', 'Porter',
];

const EN_SCIENCE = [
  'Atom', 'DNA', 'Planet', 'Microscope', 'Energy', 'Robot', 'Space', 'Formula', 'Laboratory', 'Genetics',
  'Quantum', 'Telescope', 'Magnet', 'Evolution', 'Gravity', 'Molecule', 'Electron', 'Proton', 'Neutron', 'Photon',
  'Galaxy', 'Star', 'Black hole', 'Nebula', 'Comet', 'Asteroid', 'Meteorite', 'Satellite', 'Orbit', 'Constellation',
  'Vaccine', 'Antibiotic', 'Virus', 'Bacteria', 'Immunity', 'Cell', 'Tissue', 'Organ', 'Chromosome', 'Gene',
  'Chemistry', 'Physics', 'Biology', 'Mathematics', 'Geology', 'Astronomy', 'Ecology', 'Botany', 'Zoology', 'Psychology',
  'Experiment', 'Hypothesis', 'Theory', 'Law', 'Proof', 'Analysis', 'Synthesis', 'Catalyst', 'Reaction', 'Solution',
  'Temperature', 'Pressure', 'Volume', 'Mass', 'Velocity', 'Acceleration', 'Frequency', 'Wave', 'Resonance', 'Vibration',
  'Electricity', 'Magnetism', 'Radiation', 'X-ray', 'Ultrasound', 'Infrared', 'Ultraviolet', 'Laser', 'Optics', 'Prism',
  'Dinosaur', 'Fossil', 'Paleontology', 'Archaeology', 'Anthropology', 'Genome', 'Mutation', 'Selection', 'Cloning', 'Stem cell',
  'Carbon', 'Oxygen', 'Hydrogen', 'Nitrogen', 'Iron', 'Gold', 'Copper', 'Aluminum', 'Uranium', 'Plutonium',
  'Neuron', 'Synapse', 'Brain', 'Reflex', 'Consciousness', 'Memory', 'Intelligence', 'Neural network', 'Algorithm', 'Artificial intelligence',
  'Thermodynamics', 'Entropy', 'Kinetics', 'Potential', 'Induction', 'Convection', 'Diffusion', 'Osmosis', 'Capillarity', 'Turbulence',
  'Polymer', 'Crystal', 'Alloy', 'Composite', 'Nanotechnology', 'Graphene', 'Semiconductor', 'Superconductor', 'Fiber optics', 'Plasma',
  'Relativity', 'Quantum mechanics', 'String theory', 'Dark matter', 'Dark energy', 'Antimatter', 'Higgs boson', 'Big Bang', 'Parallel universe', 'Wormhole',
  'Photosynthesis', 'Metabolism', 'Mitosis', 'Meiosis', 'Fermentation', 'Respiration', 'Circulation', 'Digestion', 'Regeneration', 'Homeostasis',
  'Vacuum', 'Absolute zero', 'Speed of light', 'Sound wave', 'Interference', 'Diffraction', 'Polarization', 'Spectrum', 'Dispersion', 'Refraction',
  'Seismograph', 'Barometer', 'Thermometer', 'Ammeter', 'Voltmeter', 'Oscilloscope', 'Spectrometer', 'Centrifuge', 'Pipette', 'Test tube',
  'Mars', 'Venus', 'Jupiter', 'Saturn', 'Neptune', 'Pluto', 'Moon', 'Andromeda', 'Milky Way', 'Supernova',
  'Biosphere', 'Ecosystem', 'Habitat', 'Symbiosis', 'Parasitism', 'Mimicry', 'Adaptation', 'Migration', 'Hibernation', 'Metamorphosis',
  'Theorem', 'Axiom', 'Integral', 'Derivative', 'Matrix', 'Vector', 'Fractal', 'Probability', 'Statistics', 'Logarithm',
];

const EN_MOVIES = [
  'Actor', 'Camera', 'Oscar', 'Script', 'Popcorn', 'Hollywood', 'Trailer', 'Director', 'Comedy', 'Action',
  'Animation', 'Cinema', 'Detective', 'Thriller', 'Horror', 'Romance', 'Sci-fi', 'Documentary', 'Western', 'Musical',
  'Superstar', 'Premiere', 'Producer', 'Cinematographer', 'Stuntman', 'Double', 'Makeup', 'Costume', 'Set design', 'Film set',
  'Editing', 'Special effects', 'CGI', 'Soundtrack', 'Dubbing', 'Subtitles', 'Frame', 'Scene', 'Take', 'Slate',
  'Joker', 'Batman', 'Superman', 'Spider-Man', 'Iron Man', 'Thor', 'Hulk', 'Captain America', 'Black Panther', 'Thanos',
  'Star Wars', 'Harry Potter', 'Lord of the Rings', 'Matrix', 'Avatar', 'Titanic', 'Forrest Gump', 'Godfather', 'Interstellar', 'Inception',
  'Sequel', 'Prequel', 'Remake', 'Spin-off', 'Crossover', 'Franchise', 'Series', 'Pilot', 'Finale', 'Cliffhanger',
  'Award', 'Nomination', 'Red carpet', 'Photoshoot', 'Interview', 'Autograph', 'Fan', 'Critic', 'Review', 'Rating',
  'Pixar', 'Disney', 'Studio Ghibli', 'Anime', 'Manga', 'Stop motion', 'Rotoscope', 'Motion capture', 'Rendering', 'Storyboard',
  'Blockbuster', 'Indie film', 'Art house', 'Film noir', 'Cyberpunk', 'Steampunk', 'Dystopia', 'Utopia', 'Apocalypse', 'Post-apocalypse',
  'Ticket', 'Screen', 'Sound', 'Theater', 'Projector', 'Spotlight', 'Clapperboard', 'Megaphone', 'Dolly', 'Crane',
  'Casting', 'Audition', 'Rehearsal', 'Improvisation', 'Dialogue', 'Monologue', 'Flashback', 'Voiceover', 'Close-up', 'Wide shot',
  'Spielberg', 'Tarantino', 'Nolan', 'Scorsese', 'Kubrick', 'Hitchcock', 'Cameron', 'Coppola', 'Fincher', 'Lynch',
  'James Bond', 'Mission Impossible', 'Fast and Furious', 'Jurassic Park', 'Indiana Jones', 'Pirates of the Caribbean', 'Transformers', 'Avengers', 'X-Men', 'Justice League',
  'Drama', 'Tragedy', 'Parody', 'Satire', 'Farce', 'Cabaret', 'Opera', 'Ballet', 'Pantomime', 'Slapstick',
  'Film reel', 'Digital cinema', '3D', 'IMAX', 'Dolby', 'Streaming', 'Netflix', 'Platform', 'Subscription', 'Binge-watch',
  'Film marathon', 'Film festival', 'Cannes', 'Venice', 'Berlinale', 'Sundance', 'Golden Globe', 'BAFTA', 'Emmy', 'Grammy',
  'Suspense', 'Intrigue', 'Plot twist', 'Resolution', 'Climax', 'Exposition', 'Conflict', 'Antagonist', 'Protagonist', 'Antihero',
  'Wig', 'Mask', 'Lighting', 'Shadow', 'Silhouette', 'Panorama', 'Zoom in', 'Zoom out', 'Pan', 'Tilt',
  'Box office', 'Budget', 'Revenue', 'Promotion', 'Poster', 'Teaser', 'Press release', 'Screening', 'Exclusive', 'Embargo',
];

const DE_GENERAL = [
  'Katze', 'Hund', 'Auto', 'Sonne', 'Meer', 'Baum', 'Haus', 'Buch', 'Telefon', 'Computer',
  'Flugzeug', 'Brücke', 'Gitarre', 'Kaffee', 'Brille', 'Rucksack', 'Uhr', 'Spiegel', 'Fenster', 'Tür',
  'Lampe', 'Tisch', 'Stuhl', 'Bett', 'Schlüssel', 'Schloss', 'Regenschirm', 'Decke', 'Kissen', 'Tasse',
  'Teller', 'Löffel', 'Gabel', 'Messer', 'Flasche', 'Tasche', 'Geldbörse', 'Heft', 'Bleistift', 'Kugelschreiber',
  'Papier', 'Schere', 'Kleber', 'Lineal', 'Pinsel', 'Taschenrechner', 'Fahrrad', 'Motorrad', 'Bus', 'U-Bahn',
  'Taxi', 'Zug', 'Schiff', 'Rakete', 'Hubschrauber', 'Schule', 'Krankenhaus', 'Apotheke', 'Markt', 'Bank',
  'Bibliothek', 'Kirche', 'Fußball', 'Basketball', 'Tennis', 'Schwimmen', 'Laufen', 'Schach', 'Tanz', 'Gesang',
  'Malerei', 'Fotografie', 'Löwe', 'Elefant', 'Giraffe', 'Affe', 'Bär', 'Wolf', 'Fuchs', 'Hase',
  'Hirsch', 'Adler', 'Rose', 'Tulpe', 'Sonnenblume', 'Gänseblümchen', 'Kaktus', 'Palme', 'Birke', 'Eiche',
  'Kiefer', 'Regen', 'Schnee', 'Wind', 'Wolke', 'Blitz', 'Regenbogen', 'Nebel', 'Frost', 'Sturm',
  'Kerze', 'Feuer', 'Wasser', 'Erde', 'Luft', 'Stein', 'Sand', 'Metall', 'Glas', 'Geist',
  'Drache', 'Einhorn', 'Meerjungfrau', 'Fee', 'Ritter', 'Pirat', 'Cowboy', 'Ninja', 'Roboter', 'Herz',
  'Stern', 'Mond', 'Kreis', 'Dreieck', 'Quadrat', 'Spirale', 'Pfeil', 'Krone', 'Freiheit', 'Traum',
  'Glück', 'Liebe', 'Freundschaft', 'Kraft', 'Weisheit', 'Zeit', 'Geheimnis', 'Abenteuer', 'Park', 'Brunnen',
  'Denkmal', 'Straße', 'Fluss', 'See', 'Berg', 'Tal', 'Insel', 'Höhle', 'Wasserfall', 'Vulkan',
  'Wüste', 'Dschungel', 'Sumpf', 'Schlucht', 'Schokolade', 'Bonbon', 'Kuchen', 'Honig', 'Torte', 'Suppe',
  'Geld', 'Münze', 'Fahne', 'Medaille', 'Pokal', 'Diplom', 'Antenne', 'Radio', 'Fernseher', 'Kopfhörer',
  'Mikrofon', 'Lautsprecher', 'Tastatur', 'Bildschirm', 'Sonnenuntergang', 'Sonnenaufgang', 'Pfeife', 'Glocke', 'Trommel', 'Flöte',
  'Trompete', 'Geige', 'Klavier', 'Harfe', 'Akkordeon', 'Luftballon', 'Feuerwerk', 'Konfetti', 'Band', 'Geschenk',
  'Puzzle', 'Würfel', 'Karten', 'Brettspiel', 'Drachen', 'Schaukel', 'Rutsche', 'Trampolin', 'Hängematte', 'Zelt',
];

const DE_FOOD = [
  'Apfel', 'Pizza', 'Borschtsch', 'Kaffee', 'Schokolade', 'Eis', 'Sushi', 'Pasta', 'Brot', 'Wein',
  'Salat', 'Steak', 'Zitrone', 'Käse', 'Maultaschen', 'Burger', 'Hotdog', 'Sandwich', 'Taco', 'Wrap',
  'Banane', 'Orange', 'Erdbeere', 'Kirsche', 'Traube', 'Wassermelone', 'Melone', 'Pfirsich', 'Ananas', 'Mango',
  'Tomate', 'Gurke', 'Karotte', 'Zwiebel', 'Knoblauch', 'Paprika', 'Kohl', 'Aubergine', 'Zucchini', 'Kürbis',
  'Pilz', 'Reis', 'Buchweizen', 'Nudeln', 'Haferflocken', 'Mais', 'Bohnen', 'Erbsen', 'Linsen', 'Quinoa',
  'Butter', 'Sahne', 'Milch', 'Joghurt', 'Quark', 'Rahm', 'Ei', 'Mehl', 'Zucker', 'Salz',
  'Zimt', 'Vanille', 'Basilikum', 'Dill', 'Petersilie', 'Minze', 'Rosmarin', 'Ingwer', 'Kurkuma', 'Oregano',
  'Tee', 'Kakao', 'Saft', 'Limonade', 'Smoothie', 'Cocktail', 'Bier', 'Sekt', 'Whiskey', 'Rum',
  'Croissant', 'Baguette', 'Toast', 'Cracker', 'Chips', 'Brezel', 'Muffin', 'Scone', 'Pfannkuchen', 'Waffel',
  'Tiramisu', 'Käsekuchen', 'Pudding', 'Gelee', 'Mousse', 'Eclair', 'Makrone', 'Krapfen', 'Cupcake', 'Brownie',
  'Karamell', 'Nougat', 'Marzipan', 'Marshmallow', 'Fudge', 'Toffee', 'Praline', 'Trüffel', 'Baiser', 'Sorbet',
  'Lachs', 'Thunfisch', 'Garnele', 'Krabbe', 'Hummer', 'Muschel', 'Tintenfisch', 'Oktopus', 'Kaviar', 'Auster',
  'Hähnchen', 'Truthahn', 'Schweinefleisch', 'Rindfleisch', 'Lammfleisch', 'Schinken', 'Speck', 'Wurst', 'Rippchen', 'Braten',
  'Ketchup', 'Mayonnaise', 'Senf', 'Sojasoße', 'Pesto', 'Hummus', 'Guacamole', 'Salsa', 'Dressing', 'Vinaigrette',
  'Fondue', 'Ratatouille', 'Gazpacho', 'Minestrone', 'Eintopf', 'Gulasch', 'Brühe', 'Suppe', 'Chili', 'Curry',
  'Pommes', 'Kartoffelbrei', 'Auflauf', 'Pilaw', 'Risotto', 'Paella', 'Lasagne', 'Ravioli', 'Gnocchi', 'Couscous',
  'Falafel', 'Kebab', 'Gyros', 'Dim Sum', 'Frühlingsrolle', 'Tempura', 'Ramen', 'Pho', 'Bibimbap', 'Pad Thai',
  'Schnitzel', 'Strudel', 'Bratwurst', 'Pirogge', 'Blini', 'Crêpe', 'Quiche', 'Soufflé', 'Crème brûlée', 'Flammkuchen',
  'Avocado', 'Tofu', 'Müsli', 'Acai', 'Matcha', 'Kombucha', 'Mandel', 'Walnuss', 'Cashew', 'Pistazie',
  'Olivenöl', 'Essig', 'Ahornsirup', 'Marmelade', 'Konfitüre', 'Chutney', 'Relish', 'Essiggurke', 'Kimchi', 'Sauerkraut',
];

const DE_TRAVEL = [
  'Flugzeug', 'Paris', 'Rucksack', 'Hotel', 'Karte', 'Strand', 'Berge', 'Zug', 'Reisepass', 'Ticket',
  'Zelt', 'Koffer', 'Museum', 'Kompass', 'Ozean', 'Kreuzfahrt', 'Ausflug', 'Reiseführer', 'Visum', 'Flughafen',
  'Bahnhof', 'Hafen', 'Camping', 'Herberge', 'Motel', 'Bungalow', 'Villa', 'Chalet', 'Kurort', 'Wellness',
  'Souvenir', 'Kamera', 'Selfie', 'Reise', 'Abenteuer', 'Urlaub', 'Ferien', 'Tourist', 'Reisender', 'Nomade',
  'London', 'Rom', 'Barcelona', 'Amsterdam', 'Prag', 'Wien', 'Berlin', 'Tokio', 'New York', 'Istanbul',
  'Ägypten', 'Griechenland', 'Italien', 'Spanien', 'Thailand', 'Japan', 'Australien', 'Brasilien', 'Mexiko', 'Indien',
  'Pyramiden', 'Kolosseum', 'Eiffelturm', 'Big Ben', 'Taj Mahal', 'Große Mauer', 'Freiheitsstatue', 'Machu Picchu', 'Safari', 'Basar',
  'Surfen', 'Tauchen', 'Snowboard', 'Skifahren', 'Kajak', 'Paragliding', 'Seilrutsche', 'Rafting', 'Klettern', 'Wandern',
  'Karneval', 'Festival', 'Jahrmarkt', 'Umzug', 'Straßenküche', 'Weinprobe', 'Weingut', 'Restaurant', 'Café', 'Kneipe',
  'Sonnenuntergang', 'Sonnenaufgang', 'Sternenhimmel', 'Nordlicht', 'Wasserfall', 'Vulkan', 'Korallenriff', 'Lagune', 'Oase', 'Schlucht',
  'Trampen', 'Roadtrip', 'Weltreise', 'Rucksackreisender', 'Navigator', 'Route', 'Transfer', 'Mietwagen', 'Zoll', 'Grenze',
  'Botschaft', 'Versicherung', 'Buchung', 'Einchecken', 'Boarding', 'Turbulenzen', 'Verspätung', 'Zwischenlandung', 'Jetlag', 'Erste Klasse',
  'Sonnencreme', 'Sonnenbrille', 'Sandalen', 'Badeanzug', 'Handtuch', 'Erste Hilfe', 'Taschenlampe', 'Schlafsack', 'Hängematte', 'Fernglas',
  'Insel', 'Archipel', 'Fjord', 'Delta', 'Kap', 'Meerenge', 'Bucht', 'Halbinsel', 'Atoll', 'Gletscher',
  'Dschungel', 'Savanne', 'Tundra', 'Steppe', 'Prärie', 'Mangrove', 'Regenwald', 'Feuchtgebiet', 'Hochebene', 'Klamm',
  'Tempel', 'Moschee', 'Dom', 'Palast', 'Festung', 'Ruinen', 'Amphitheater', 'Aquädukt', 'Obelisk', 'Leuchtturm',
  'Marktplatz', 'Galerie', 'Opernhaus', 'Zoo', 'Botanischer Garten', 'Aquarium', 'Planetarium', 'Sternwarte', 'Freizeitpark', 'Wasserpark',
  'Fähre', 'Jacht', 'Katamaran', 'Gondel', 'Seilbahn', 'Zahnradbahn', 'Einschienenbahn', 'Rikscha', 'Tuk-Tuk', 'Karawane',
  'Wolkenkratzer', 'Windmühle', 'Burg', 'Herrenhaus', 'Hütte', 'Baumhaus', 'Iglu', 'Jurte', 'Hausboot', 'Blockhaus',
  'Sprachführer', 'Dolmetscher', 'Reiseleiter', 'Concierge', 'Barkeeper', 'Kellner', 'Pilot', 'Kapitän', 'Steward', 'Portier',
];

const DE_SCIENCE = [
  'Atom', 'DNS', 'Planet', 'Mikroskop', 'Energie', 'Roboter', 'Weltraum', 'Formel', 'Labor', 'Genetik',
  'Quant', 'Teleskop', 'Magnet', 'Evolution', 'Schwerkraft', 'Molekül', 'Elektron', 'Proton', 'Neutron', 'Photon',
  'Galaxie', 'Stern', 'Schwarzes Loch', 'Nebel', 'Komet', 'Asteroid', 'Meteorit', 'Satellit', 'Umlaufbahn', 'Sternbild',
  'Impfstoff', 'Antibiotikum', 'Virus', 'Bakterie', 'Immunität', 'Zelle', 'Gewebe', 'Organ', 'Chromosom', 'Gen',
  'Chemie', 'Physik', 'Biologie', 'Mathematik', 'Geologie', 'Astronomie', 'Ökologie', 'Botanik', 'Zoologie', 'Psychologie',
  'Experiment', 'Hypothese', 'Theorie', 'Gesetz', 'Beweis', 'Analyse', 'Synthese', 'Katalysator', 'Reaktion', 'Lösung',
  'Temperatur', 'Druck', 'Volumen', 'Masse', 'Geschwindigkeit', 'Beschleunigung', 'Frequenz', 'Welle', 'Resonanz', 'Schwingung',
  'Elektrizität', 'Magnetismus', 'Strahlung', 'Röntgen', 'Ultraschall', 'Infrarot', 'Ultraviolett', 'Laser', 'Optik', 'Prisma',
  'Dinosaurier', 'Fossil', 'Paläontologie', 'Archäologie', 'Anthropologie', 'Genom', 'Mutation', 'Selektion', 'Klonen', 'Stammzelle',
  'Kohlenstoff', 'Sauerstoff', 'Wasserstoff', 'Stickstoff', 'Eisen', 'Gold', 'Kupfer', 'Aluminium', 'Uran', 'Plutonium',
  'Neuron', 'Synapse', 'Gehirn', 'Reflex', 'Bewusstsein', 'Gedächtnis', 'Intelligenz', 'Neuronales Netz', 'Algorithmus', 'Künstliche Intelligenz',
  'Thermodynamik', 'Entropie', 'Kinetik', 'Potenzial', 'Induktion', 'Konvektion', 'Diffusion', 'Osmose', 'Kapillarität', 'Turbulenz',
  'Polymer', 'Kristall', 'Legierung', 'Verbundstoff', 'Nanotechnologie', 'Graphen', 'Halbleiter', 'Supraleiter', 'Glasfaser', 'Plasma',
  'Relativität', 'Quantenmechanik', 'Stringtheorie', 'Dunkle Materie', 'Dunkle Energie', 'Antimaterie', 'Higgs-Boson', 'Urknall', 'Paralleluniversum', 'Wurmloch',
  'Fotosynthese', 'Stoffwechsel', 'Mitose', 'Meiose', 'Gärung', 'Atmung', 'Kreislauf', 'Verdauung', 'Regeneration', 'Homöostase',
  'Vakuum', 'Absoluter Nullpunkt', 'Lichtgeschwindigkeit', 'Schallwelle', 'Interferenz', 'Beugung', 'Polarisation', 'Spektrum', 'Dispersion', 'Brechung',
  'Seismograf', 'Barometer', 'Thermometer', 'Amperemeter', 'Voltmeter', 'Oszilloskop', 'Spektrometer', 'Zentrifuge', 'Pipette', 'Reagenzglas',
  'Mars', 'Venus', 'Jupiter', 'Saturn', 'Neptun', 'Pluto', 'Mond', 'Andromeda', 'Milchstraße', 'Supernova',
  'Biosphäre', 'Ökosystem', 'Lebensraum', 'Symbiose', 'Parasitismus', 'Mimikry', 'Anpassung', 'Migration', 'Winterschlaf', 'Metamorphose',
  'Theorem', 'Axiom', 'Integral', 'Ableitung', 'Matrix', 'Vektor', 'Fraktal', 'Wahrscheinlichkeit', 'Statistik', 'Logarithmus',
];

const DE_MOVIES = [
  'Schauspieler', 'Kamera', 'Oscar', 'Drehbuch', 'Popcorn', 'Hollywood', 'Trailer', 'Regisseur', 'Komödie', 'Action',
  'Animation', 'Kino', 'Krimi', 'Thriller', 'Horror', 'Liebesfilm', 'Science-Fiction', 'Dokumentarfilm', 'Western', 'Musical',
  'Superstar', 'Premiere', 'Produzent', 'Kameramann', 'Stuntman', 'Double', 'Maske', 'Kostüm', 'Bühnenbild', 'Drehort',
  'Schnitt', 'Spezialeffekte', 'CGI', 'Filmmusik', 'Synchronisation', 'Untertitel', 'Bild', 'Szene', 'Aufnahme', 'Klappe',
  'Joker', 'Batman', 'Superman', 'Spider-Man', 'Iron Man', 'Thor', 'Hulk', 'Captain America', 'Black Panther', 'Thanos',
  'Star Wars', 'Harry Potter', 'Herr der Ringe', 'Matrix', 'Avatar', 'Titanic', 'Forrest Gump', 'Der Pate', 'Interstellar', 'Inception',
  'Fortsetzung', 'Vorgeschichte', 'Neuverfilmung', 'Ableger', 'Crossover', 'Filmreihe', 'Serie', 'Pilotfolge', 'Staffelfinale', 'Cliffhanger',
  'Auszeichnung', 'Nominierung', 'Roter Teppich', 'Fotoshooting', 'Interview', 'Autogramm', 'Fan', 'Kritiker', 'Rezension', 'Bewertung',
  'Pixar', 'Disney', 'Studio Ghibli', 'Anime', 'Manga', 'Stop-Motion', 'Rotoskopie', 'Motion Capture', 'Rendering', 'Storyboard',
  'Blockbuster', 'Independentfilm', 'Arthouse', 'Film Noir', 'Cyberpunk', 'Steampunk', 'Dystopie', 'Utopie', 'Apokalypse', 'Postapokalypse',
  'Eintrittskarte', 'Leinwand', 'Ton', 'Kinosaal', 'Projektor', 'Scheinwerfer', 'Filmklappe', 'Megafon', 'Kamerawagen', 'Kran',
  'Casting', 'Vorsprechen', 'Probe', 'Improvisation', 'Dialog', 'Monolog', 'Rückblende', 'Erzähler', 'Nahaufnahme', 'Totale',
  'Spielberg', 'Tarantino', 'Nolan', 'Scorsese', 'Kubrick', 'Hitchcock', 'Cameron', 'Coppola', 'Fincher', 'Lynch',
  'James Bond', 'Mission Impossible', 'Fast and Furious', 'Jurassic Park', 'Indiana Jones', 'Fluch der Karibik', 'Transformers', 'Avengers', 'X-Men', 'Justice League',
  'Drama', 'Tragödie', 'Parodie', 'Satire', 'Farce', 'Kabarett', 'Oper', 'Ballett', 'Pantomime', 'Slapstick',
  'Filmrolle', 'Digitalkino', '3D', 'IMAX', 'Dolby', 'Streaming', 'Netflix', 'Plattform', 'Abonnement', 'Binge-Watching',
  'Filmmarathon', 'Filmfestival', 'Cannes', 'Venedig', 'Berlinale', 'Sundance', 'Golden Globe', 'BAFTA', 'Emmy', 'Grammy',
  'Spannung', 'Intrige', 'Wendepunkt', 'Auflösung', 'Höhepunkt', 'Einführung', 'Konflikt', 'Antagonist', 'Protagonist', 'Antiheld',
  'Perücke', 'Beleuchtung', 'Schatten', 'Silhouette', 'Panorama', 'Zoom', 'Schwenk', 'Neigung', 'Zeitlupe', 'Zeitraffer',
  'Einspielergebnis', 'Budget', 'Einnahmen', 'Werbung', 'Filmplakat', 'Teaser', 'Pressemitteilung', 'Vorführung', 'Exklusiv', 'Embargo',
];

// ─── Pack definitions ──────────────────────────────────────────────────

interface PackDef {
  slug: string;
  name: string;
  language: string;
  category: string;
  words: string[];
}

const packs: PackDef[] = [
  // Ukrainian
  { slug: 'ua-general', name: 'Загальні 🇺🇦', language: 'UA', category: 'General', words: UA_GENERAL },
  { slug: 'ua-food', name: 'Їжа 🇺🇦', language: 'UA', category: 'Food', words: UA_FOOD },
  { slug: 'ua-travel', name: 'Подорожі 🇺🇦', language: 'UA', category: 'Travel', words: UA_TRAVEL },
  { slug: 'ua-science', name: 'Наука 🇺🇦', language: 'UA', category: 'Science', words: UA_SCIENCE },
  { slug: 'ua-movies', name: 'Кіно 🇺🇦', language: 'UA', category: 'Movies', words: UA_MOVIES },
  // English
  { slug: 'en-general', name: 'General 🇬🇧', language: 'EN', category: 'General', words: EN_GENERAL },
  { slug: 'en-food', name: 'Food 🇬🇧', language: 'EN', category: 'Food', words: EN_FOOD },
  { slug: 'en-travel', name: 'Travel 🇬🇧', language: 'EN', category: 'Travel', words: EN_TRAVEL },
  { slug: 'en-science', name: 'Science 🇬🇧', language: 'EN', category: 'Science', words: EN_SCIENCE },
  { slug: 'en-movies', name: 'Movies 🇬🇧', language: 'EN', category: 'Movies', words: EN_MOVIES },
  // German
  { slug: 'de-general', name: 'Allgemein 🇩🇪', language: 'DE', category: 'General', words: DE_GENERAL },
  { slug: 'de-food', name: 'Essen 🇩🇪', language: 'DE', category: 'Food', words: DE_FOOD },
  { slug: 'de-travel', name: 'Reisen 🇩🇪', language: 'DE', category: 'Travel', words: DE_TRAVEL },
  { slug: 'de-science', name: 'Wissenschaft 🇩🇪', language: 'DE', category: 'Science', words: DE_SCIENCE },
  { slug: 'de-movies', name: 'Filme 🇩🇪', language: 'DE', category: 'Movies', words: DE_MOVIES },
];

// ─── Seed themes ────────────────────────────────────────────────────────

const themes = [
  {
    slug: 'premium-dark',
    name: 'Premium Dark',
    isFree: true,
    price: 0,
    config: {
      id: 'PREMIUM_DARK',
      description: 'Elegant dark with gold accents',
      preview: { bg: '#1A1A1A', accent: '#F3E5AB' },
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
    name: 'Forest',
    isFree: false,
    price: 99,
    config: {
      id: 'FOREST',
      description: 'Deep nature vibes with Merriweather',
      preview: { bg: '#1F2920', accent: '#4DB6AC' },
      fonts: { heading: "'Merriweather', serif", body: "'Inter', sans-serif" },
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
    config: { id: 'MINIMAL', correct: 'click', skip: 'soft-whoosh', timer: 'soft-tick', gameOver: 'chime' },
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

  // Seed WordPacks + Words
  for (const pack of packs) {
    const uniqueWords = [...new Set(pack.words)];

    const wordPack = await prisma.wordPack.upsert({
      where: { slug: pack.slug },
      update: {
        name: pack.name,
        language: pack.language,
        category: pack.category,
        isDefault: pack.category === 'General',
        wordCount: uniqueWords.length,
      },
      create: {
        slug: pack.slug,
        name: pack.name,
        language: pack.language,
        category: pack.category,
        isFree: true,
        isDefault: pack.category === 'General',
        wordCount: uniqueWords.length,
      },
    });

    // Delete existing words for this pack (to handle updates cleanly)
    await prisma.word.deleteMany({ where: { packId: wordPack.id } });

    // Batch insert words
    await prisma.word.createMany({
      data: uniqueWords.map(text => ({
        text,
        packId: wordPack.id,
      })),
      skipDuplicates: true,
    });

    console.log(`  [WordPack] ${pack.slug}: ${uniqueWords.length} words`);
  }

  // Seed feature packs (purchasable features, no actual words)
  await prisma.wordPack.upsert({
    where: { slug: 'feature-custom-packs' },
    update: { name: 'Мої паки слів', price: 299, isFree: false, description: 'Розблокуй можливість створювати власні колоди слів (до 5 пакунків).' },
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
      create: { slug: theme.slug, name: theme.name, config: theme.config, isFree: theme.isFree, price: theme.price },
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

  // Set admin by email
  const adminResult = await prisma.user.updateMany({
    where: { email: 'mrdemianpahaday@gmail.com' },
    data: { isAdmin: true },
  });
  if (adminResult.count > 0) {
    console.log(`  [Admin] mrdemianpahaday@gmail.com set as admin`);
  }

  // Summary
  const wordCount = await prisma.word.count();
  const packCount = await prisma.wordPack.count();
  console.log(`\nSeed complete: ${packCount} word packs, ${wordCount} total words`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
