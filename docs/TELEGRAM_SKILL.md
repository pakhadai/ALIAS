# TELEGRAM BOT & MINI APP — SKILL

> Ти — досвідчений Telegram-розробник з 20-річним стажем.
> Цей файл — твоя операційна пам'ять. Читай його ПЕРЕД будь-якою задачею пов'язаною з Telegram.
> Ніколи не здогадуйся. Завжди дій за правилами нижче.

**Актуальна версія API:** Bot API 9.6 (квітень 2026)
**Офіційна документація:** https://core.telegram.org/bots/api
**JS SDK для Mini Apps:** https://telegram.org/js/telegram-web-app.js?62

---

## РОЗДІЛ 0 — ПЕРШЕ ПРАВИЛО (читай завжди першим)

```
ПЕРЕД ПОЧАТКОМ БУДЬ-ЯКОЇ ЗАДАЧІ ВИЗНАЧ:
  1. Що будуємо? → Класичний бот / Mini App / Обидва
  2. Яка мова? → Python / Node.js / Go / інша
  3. Є бекенд? → Так / Ні (serverless)
  4. Потрібні платежі? → Так (Stars/провайдер) / Ні
  5. Це продакшн? → Так (webhook) / Ні (long polling)

БЕЗ ВІДПОВІДІ НА ЦІ 5 ПИТАНЬ — НЕ ПОЧИНАЙ.
```

---

## РОЗДІЛ 1 — ДЕРЕВО РІШЕНЬ: ЩО БУДУЄМО?

### 1.1 Класичний бот vs Mini App — як обрати

```
Користувач хоче:
│
├── Прості команди, сповіщення, інтеграції
│   └── ✅ КЛАСИЧНИЙ БОТ (команди + кнопки)
│
├── Складний UI, форми, графіки, ігри, магазин
│   └── ✅ MINI APP (JavaScript всередині Telegram)
│
├── Замінити існуючий сайт/PWA
│   └── ✅ MINI APP — це і є заміна сайту
│
├── Бізнес-автоматизація (відповіді від імені акаунту)
│   └── ✅ BUSINESS BOT
│
└── Все одночасно
    └── ✅ БОТ + MINI APP (найчастіший продакшн-кейс)
```

### 1.2 Який спосіб отримання оновлень обрати

```
ЯКЩО продакшн → ЗАВЖДИ Webhook
  Причини: не тримає з'єднання, масштабується, serverless-friendly

ЯКЩО розробка/тест → Long Polling
  Причини: не потрібен домен/SSL, запускається локально

НІКОЛИ не використовуй Long Polling в продакшні!
```

---

## РОЗДІЛ 2 — ШВИДКИЙ СТАРТ (мінімально необхідне)

### 2.1 Створення бота (одноразово)

```
1. Написати @BotFather → /newbot
2. Ввести: Назва (довільна) → Username (закінчується на "bot")
3. Зберегти токен → НІКОЛИ не комітити в git!
4. Опціонально: /setdescription, /setcommands, /setuserpic
```

### 2.2 Структура токена

```
110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
└─ bot_id ┘ └──────── secret_part ───────────┘
```

### 2.3 Перевірка токена (перший запит завжди цей)

```bash
curl https://api.telegram.org/bot<TOKEN>/getMe
```

Відповідь:
```json
{
  "ok": true,
  "result": {
    "id": 110201543,
    "is_bot": true,
    "first_name": "MyBot",
    "username": "my_bot",
    "can_join_groups": true,
    "can_read_all_group_messages": false,
    "supports_inline_queries": false
  }
}
```

---

## РОЗДІЛ 3 — НАЛАШТУВАННЯ WEBHOOK (продакшн)

### 3.1 Вимоги до Webhook

```
✅ HTTPS з валідним SSL сертифікатом
✅ Порт: 443, 80, 88 або 8443
✅ Публічний IP або домен
❌ Self-signed cert — НЕ РЕКОМЕНДУЄТЬСЯ (складно налаштувати)
❌ Localhost — не працює (потрібен ngrok для тесту)
```

### 3.2 Встановлення Webhook

```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/webhook/<SECRET_PATH>",
    "allowed_updates": ["message", "callback_query", "inline_query"],
    "drop_pending_updates": true,
    "secret_token": "your_random_secret_32chars"
  }'
```

**ВАЖЛИВО:** Використовуй секретний шлях (`/<TOKEN>` або `/webhook/<random>`) — це єдина перевірка автентичності.

### 3.3 Перевірка Webhook

```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

### 3.4 Видалення Webhook (для переходу на long polling)

```bash
curl https://api.telegram.org/bot<TOKEN>/deleteWebhook?drop_pending_updates=true
```

### 3.5 Відповідь на Webhook (найефективніший спосіб)

```python
# Замість окремого запиту — відповідай прямо у відповідь на webhook
# (лише для простих відповідей, без можливості обробити помилку)
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    update = request.json
    # ...обробка...
    # Відповідаємо прямо — 0 додаткових запитів!
    return jsonify({
        "method": "sendMessage",
        "chat_id": update["message"]["chat"]["id"],
        "text": "Привіт!"
    })
```

---

## РОЗДІЛ 4 — ОБРОБКА ОНОВЛЕНЬ (Updates)

### 4.1 Структура обробника — ЗАВЖДИ перевіряй наявність полів

```python
def handle_update(update: dict):
    # ПРАВИЛО: Кожне поле може бути відсутнє — перевіряй через .get()

    if "message" in update:
        handle_message(update["message"])

    elif "callback_query" in update:
        handle_callback(update["callback_query"])

    elif "inline_query" in update:
        handle_inline(update["inline_query"])

    elif "pre_checkout_query" in update:
        handle_pre_checkout(update["pre_checkout_query"])

    elif "business_connection" in update:
        handle_business(update["business_connection"])

    # ... інші типи за потребою
```

### 4.2 Обробка повідомлення — мінімально необхідний шаблон

```python
def handle_message(msg: dict):
    chat_id = msg["chat"]["id"]
    user = msg.get("from", {})
    text = msg.get("text", "")

    # Перевірка команд
    if text.startswith("/start"):
        params = text.split(" ", 1)
        deep_link = params[1] if len(params) > 1 else None
        handle_start(chat_id, user, deep_link)

    elif text.startswith("/help"):
        send_help(chat_id)

    # Перевірка типу контенту
    elif "photo" in msg:
        handle_photo(msg)

    elif "document" in msg:
        handle_document(msg)

    elif "location" in msg:
        handle_location(msg)
```

### 4.3 ВАЖЛИВІ поля Update які часто забувають

```python
# Ідентифікатори — завжди різні типи!
chat_id = msg["chat"]["id"]          # int, може бути від'ємним для груп
user_id = msg["from"]["id"]          # int, завжди додатній
message_id = msg["message_id"]       # int

# Мова користувача (може бути None!)
lang = msg.get("from", {}).get("language_code", "en") or "en"

# Тип чату
chat_type = msg["chat"]["type"]      # "private", "group", "supergroup", "channel"

# Чи є повідомлення forwarded?
is_forwarded = "forward_origin" in msg

# Чи є reply?
reply_to = msg.get("reply_to_message")
```

---

## РОЗДІЛ 5 — НАДСИЛАННЯ ПОВІДОМЛЕНЬ

### 5.1 sendMessage — повний шаблон

```python
def send_message(
    chat_id: int,
    text: str,
    parse_mode: str = "HTML",       # ЗАВЖДИ вказуй! HTML або MarkdownV2
    reply_markup = None,
    reply_to_message_id: int = None,
    disable_web_page_preview: bool = True
) -> dict:
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": disable_web_page_preview,
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    if reply_to_message_id:
        payload["reply_parameters"] = {"message_id": reply_to_message_id}

    return api_request("sendMessage", payload)
```

### 5.2 HTML vs MarkdownV2 — коли що використовувати

```
HTML (рекомендовано — простіше):
  <b>жирний</b>
  <i>курсив</i>
  <u>підкреслений</u>
  <s>закреслений</s>
  <code>моноширний</code>
  <pre>блок коду</pre>
  <a href="url">посилання</a>
  <tg-spoiler>спойлер</tg-spoiler>

MarkdownV2 (обережно — потребує escape!):
  *жирний*  _курсив_  `код`  [текст](url)
  Символи що ПОТРІБНО екранувати (\):
  _ * [ ] ( ) ~ ` > # + - = | { } . !
```

### 5.3 Ліміти тексту — ЗАВЖДИ перевіряй

```
sendMessage:       до 4096 символів
sendCaption:       до 1024 символів
callback_data:     до 64 байт
inline_query text: до 512 символів
bot description:   до 512 символів
bot about:         до 120 символів
команда:           до 32 символів
```

### 5.4 Rate limits — КРИТИЧНО для продакшну

```
Один чат:          1 повідомлення/секунду (короткі burst дозволені)
Група:             20 повідомлень/хвилину
Broadcast:         30 повідомлень/секунду (безкоштовно)
Broadcast paid:    1000 повідомлень/секунду (100k Stars на балансі + 100k MAU)

ЯКЩО отримав помилку 429 (Too Many Requests):
  → retry_after поле містить час очікування в секундах
  → ЗАВЖДИ реалізуй exponential backoff
```

```python
import time

def api_request_with_retry(method: str, payload: dict, max_retries: int = 5) -> dict:
    for attempt in range(max_retries):
        response = api_request(method, payload)
        if response.get("ok"):
            return response
        error_code = response.get("error_code")
        if error_code == 429:
            wait = response.get("parameters", {}).get("retry_after", 2 ** attempt)
            time.sleep(wait)
        elif error_code in (400, 403):
            # Не повторювати — помилка в запиті або бот заблокований
            raise ValueError(response.get("description"))
        else:
            time.sleep(2 ** attempt)
    raise Exception(f"Failed after {max_retries} retries")
```

---

## РОЗДІЛ 6 — КЛАВІАТУРИ

### 6.1 Inline Keyboard — шаблон (найпоширеніший тип)

```python
def make_inline_keyboard(buttons: list[list[dict]]) -> dict:
    """
    buttons = [
        [{"text": "Кнопка 1", "callback_data": "btn_1"},
         {"text": "Кнопка 2", "callback_data": "btn_2"}],
        [{"text": "Сайт", "url": "https://example.com"}],
        [{"text": "Mini App", "web_app": {"url": "https://example.com/app"}}],
    ]
    """
    return {"inline_keyboard": buttons}

# Приклад — меню налаштувань
settings_kb = make_inline_keyboard([
    [{"text": "🔔 Сповіщення", "callback_data": "settings:notifications"}],
    [{"text": "🌍 Мова", "callback_data": "settings:language"}],
    [{"text": "❌ Закрити", "callback_data": "close"}],
])
```

### 6.2 Обробка callback_query — ОБОВ'ЯЗКОВО відповідай!

```python
def handle_callback(callback: dict):
    query_id = callback["id"]
    data = callback.get("data", "")
    user = callback["from"]
    msg = callback.get("message")

    # ЗАВЖДИ підтверджуй callback — інакше кнопка "крутиться" до 30 сек
    answer_callback(query_id)  # без тексту — тиха відповідь

    # Парсинг даних (рекомендований формат: "action:param")
    if ":" in data:
        action, param = data.split(":", 1)
    else:
        action, param = data, None

    if action == "settings":
        handle_settings(msg, param)
    elif action == "close":
        delete_message(msg["chat"]["id"], msg["message_id"])

def answer_callback(query_id: str, text: str = "", show_alert: bool = False):
    api_request("answerCallbackQuery", {
        "callback_query_id": query_id,
        "text": text,
        "show_alert": show_alert,  # True = popup, False = toast
    })
```

### 6.3 Reply Keyboard — коли використовувати

```
✅ Коли є обмежений набір варіантів відповіді
✅ Коли хочеш замінити стандартну клавіатуру
✅ Для вибору з опцій (так/ні, вибір міста тощо)
❌ НЕ використовуй для навігації між розділами → Inline Keyboard

```

```python
def make_reply_keyboard(buttons: list[list[str]], resize: bool = True) -> dict:
    return {
        "keyboard": [[{"text": btn} for btn in row] for row in buttons],
        "resize_keyboard": resize,       # ЗАВЖДИ True — компактний вигляд
        "one_time_keyboard": False,      # True = зникає після натискання
        "input_field_placeholder": "Оберіть варіант...",
    }

# Видалення клавіатури
REMOVE_KEYBOARD = {"remove_keyboard": True}
```

### 6.4 callback_data — правила формату

```
ПРАВИЛО: callback_data ≤ 64 байти (не символи!)

✅ Правильно:  "menu:main"  "settings:lang:uk"  "order:123"
❌ Неправильно: зберігати великі об'єкти або URL в callback_data

ЯКЩО потрібно більше даних:
  → Зберігай стан у БД/Redis, передавай лише ID
  → Або використовуй CloudStorage у Mini App
```

---

## РОЗДІЛ 7 — КОМАНДИ

### 7.1 Обов'язкові команди (ЗАВЖДИ реалізуй)

```
/start   — Початок роботи. Може містити deep link параметр.
/help    — Довідка. Повний список команд та пояснення.
/settings — Налаштування (якщо є).
```

### 7.2 Встановлення команд через API

```python
# Команди для всіх користувачів (дефолт)
api_request("setMyCommands", {
    "commands": [
        {"command": "start", "description": "🚀 Почати роботу"},
        {"command": "help", "description": "❓ Допомога"},
        {"command": "settings", "description": "⚙️ Налаштування"},
    ],
    "scope": {"type": "default"},
    "language_code": "uk"  # локалізація команд
})

# Адмін-команди лише для конкретного чату
api_request("setMyCommands", {
    "commands": [
        {"command": "ban", "description": "Заблокувати"},
        {"command": "stats", "description": "Статистика"},
    ],
    "scope": {"type": "chat", "chat_id": ADMIN_CHAT_ID}
})
```

### 7.3 Deep Linking — шаблон

```python
def handle_start(chat_id: int, user: dict, deep_link: str = None):
    if deep_link:
        # Декодуємо base64url якщо потрібно
        # import base64; data = base64.urlsafe_b64decode(deep_link + "==")

        if deep_link.startswith("ref_"):
            referrer_id = deep_link.replace("ref_", "")
            handle_referral(chat_id, user, referrer_id)
            return

        elif deep_link.startswith("order_"):
            order_id = deep_link.replace("order_", "")
            show_order(chat_id, order_id)
            return

    # Стандартне вітання
    send_welcome(chat_id, user)
```

---

## РОЗДІЛ 8 — MINI APPS

### 8.1 Коли будувати Mini App (чеклист)

```
Будуй Mini App якщо потрібно:
✅ Складні форми з валідацією
✅ Таблиці, графіки, дашборди
✅ Ігри або інтерактивний контент
✅ Магазин / каталог товарів
✅ Замінити існуючий сайт/PWA
✅ Кастомний UI який не вміщується в повідомлення
✅ Drag & drop, canvas, WebGL
✅ Реалтайм взаємодія між кількома користувачами

Класичний бот достатній якщо:
✅ Прості команди і відповіді
✅ Сповіщення і розсилки
✅ Інтеграції (GitHub, Jira, тощо)
✅ Inline-пошук контенту
```

### 8.2 Підключення SDK — перший рядок HTML

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- ЗАВЖДИ першим у <head>, до будь-яких інших скриптів! -->
  <script src="https://telegram.org/js/telegram-web-app.js?62"></script>
  <title>My Mini App</title>
</head>
<body>
  <script>
    // SDK завантажено — доступний window.Telegram.WebApp
    const tg = window.Telegram.WebApp;

    // ЗАВЖДИ викликай ready() на початку
    tg.ready();

    // Розгорнути на всю висоту (рекомендовано)
    tg.expand();
  </script>
</body>
</html>
```

### 8.3 Ініціалізація Mini App — повний шаблон

```javascript
const tg = window.Telegram.WebApp;

// Ініціалізація
tg.ready();
tg.expand();

// Дані користувача (НЕ довіряй без валідації на сервері!)
const user = tg.initDataUnsafe?.user;
const initData = tg.initData;  // Це відправляй на сервер для валідації

// Тема
const theme = tg.colorScheme; // "light" або "dark"
const colors = tg.themeParams;

// CSS змінні теми (використовуй їх в CSS!)
// var(--tg-theme-bg-color)
// var(--tg-theme-text-color)
// var(--tg-theme-button-color)
// var(--tg-theme-button-text-color)
// var(--tg-theme-hint-color)
// var(--tg-theme-link-color)
// var(--tg-theme-secondary-bg-color)

// Адаптація під тему
document.documentElement.style.setProperty(
  "--bg", tg.themeParams.bg_color || "#fff"
);
```

### 8.4 Валідація initData на сервері — КРИТИЧНО (Python)

```python
import hashlib
import hmac
import json
import urllib.parse
from time import time

def validate_init_data(init_data: str, bot_token: str, max_age: int = 3600) -> dict:
    """
    Валідує initData від Telegram Mini App.
    Повертає розпаршені дані або кидає виняток.
    """
    parsed = dict(urllib.parse.parse_qsl(init_data))
    received_hash = parsed.pop("hash", None)

    if not received_hash:
        raise ValueError("Hash is missing")

    # Перевірка часу (захист від replay attacks)
    auth_date = int(parsed.get("auth_date", 0))
    if time() - auth_date > max_age:
        raise ValueError("initData is too old")

    # Формуємо data-check-string
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed.items())
    )

    # Обчислюємо secret key
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256
    ).digest()

    # Обчислюємо хеш
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise ValueError("Invalid hash — data may be tampered")

    # Розпарсити user JSON
    if "user" in parsed:
        parsed["user"] = json.loads(parsed["user"])

    return parsed

# Використання в FastAPI/Flask:
# data = validate_init_data(request.headers.get("X-Init-Data"), BOT_TOKEN)
# user_id = data["user"]["id"]
```

### 8.5 Способи запуску Mini App — коли що обрати

```
1. KEYBOARD BUTTON (web_app) → відправляє дані назад боту через sendData
   Коли: проста форма введення, не потрібен сервер
   Обмеження: дані до 4096 байт, лише рядок

2. INLINE KEYBOARD (web_app) → answerWebAppQuery, отримує query_id
   Коли: повноцінний застосунок, потрібен API-бекенд
   Найпоширеніший для продакшну

3. MENU BUTTON → те саме що inline keyboard, але запускається з меню
   Коли: основний застосунок бота, постійний доступ

4. MAIN MINI APP (startapp) → https://t.me/bot?startapp=...
   Коли: повноцінний PWA-замінник, відображається в App Store Telegram

5. DIRECT LINK → https://t.me/bot/appname?startapp=...
   Коли: окремий застосунок з власним URL, шеринг посилань

6. INLINE MODE → через answerInlineQuery + button
   Коли: контент-генерація для відправки в чати

7. ATTACHMENT MENU → лише для великих рекламодавців
   Пропускай цей варіант якщо немає спеціального дозволу
```

### 8.6 Keyboard Button → sendData (без сервера)

```javascript
// FRONTEND (Mini App)
const tg = window.Telegram.WebApp;

function submitForm(data) {
  // Відправляємо дані боту як рядок
  tg.sendData(JSON.stringify(data));
  // Mini App закривається автоматично
}
```

```python
# BACKEND (бот) — отримуємо через web_app_data
def handle_message(msg):
    if "web_app_data" in msg:
        data = json.loads(msg["web_app_data"]["data"])
        chat_id = msg["chat"]["id"]
        # Обробляємо дані...
```

### 8.7 Inline Button → answerWebAppQuery (з сервером)

```javascript
// FRONTEND (Mini App)
const tg = window.Telegram.WebApp;

async function submitOrder(order) {
  // Відправляємо на власний сервер
  const response = await fetch("/api/submit-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Init-Data": tg.initData  // Для валідації на сервері
    },
    body: JSON.stringify(order)
  });

  if (response.ok) {
    tg.close(); // Закриваємо Mini App
  }
}
```

```python
# BACKEND — після обробки замовлення
def submit_order(init_data: str, order: dict):
    user_data = validate_init_data(init_data, BOT_TOKEN)
    query_id = user_data.get("query_id")

    # Зберігаємо замовлення в БД...

    # Відповідаємо через answerWebAppQuery
    api_request("answerWebAppQuery", {
        "web_app_query_id": query_id,
        "result": {
            "type": "article",
            "id": "order_confirmed",
            "title": "Замовлення підтверджено",
            "input_message_content": {
                "message_text": f"✅ Замовлення #{order['id']} прийнято!"
            }
        }
    })
```

### 8.8 Main Button / BottomButton — шаблон

```javascript
const tg = window.Telegram.WebApp;
const mainBtn = tg.MainButton; // або tg.BottomButton

// Налаштування
mainBtn.setText("Підтвердити замовлення");
mainBtn.setParams({
  color: tg.themeParams.button_color,
  text_color: tg.themeParams.button_text_color,
});

// Показати/приховати
mainBtn.show();
mainBtn.hide();

// Стан завантаження
mainBtn.showProgress(false); // false = текст видимий
mainBtn.hideProgress();

// Обробник
mainBtn.onClick(() => {
  mainBtn.showProgress(true);
  submitForm();
});

// Вторинна кнопка (Bot API 7.10)
const secBtn = tg.SecondaryButton;
secBtn.setText("Скасувати");
secBtn.show();
secBtn.onClick(() => tg.close());
```

### 8.9 BackButton — правильне використання

```javascript
const tg = window.Telegram.WebApp;

// Показати кнопку "Назад"
tg.BackButton.show();

// Обробник
tg.BackButton.onClick(() => {
  navigateBack(); // Власна функція навігації
});

// На головній сторінці — ховаємо
function showMainPage() {
  tg.BackButton.hide();
  renderMainPage();
}

// На підсторінці — показуємо
function showSubPage() {
  tg.BackButton.show();
  renderSubPage();
}
```

### 8.10 Popup, Alert, Confirm — нативні діалоги

```javascript
// Alert
tg.showAlert("Щось пішло не так!", () => {
  // Callback після закриття
});

// Confirm
tg.showConfirm("Видалити замовлення?", (confirmed) => {
  if (confirmed) deleteOrder();
});

// Popup з кнопками
tg.showPopup({
  title: "Увага",
  message: "Ви впевнені що хочете вийти?",
  buttons: [
    { id: "cancel", type: "cancel" },
    { id: "confirm", type: "destructive", text: "Вийти" }
  ]
}, (buttonId) => {
  if (buttonId === "confirm") tg.close();
});
```

### 8.11 Теми — CSS підхід (рекомендований)

```css
/* Використовуй CSS змінні Telegram замість хардкоду кольорів */
:root {
  --bg: var(--tg-theme-bg-color, #ffffff);
  --text: var(--tg-theme-text-color, #000000);
  --hint: var(--tg-theme-hint-color, #999999);
  --link: var(--tg-theme-link-color, #2481cc);
  --btn-bg: var(--tg-theme-button-color, #2481cc);
  --btn-text: var(--tg-theme-button-text-color, #ffffff);
  --secondary-bg: var(--tg-theme-secondary-bg-color, #f1f1f1);
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

button.primary {
  background: var(--btn-bg);
  color: var(--btn-text);
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
```

### 8.12 CloudStorage — зберігання стану між сесіями

```javascript
// Запис
tg.CloudStorage.setItem("user_preferences", JSON.stringify({
  language: "uk",
  theme: "auto"
}), (error, stored) => {
  if (error) console.error("Storage error:", error);
});

// Читання
tg.CloudStorage.getItem("user_preferences", (error, value) => {
  if (!error && value) {
    const prefs = JSON.parse(value);
    applyPreferences(prefs);
  }
});

// Обмеження:
// - До 1024 байти на ключ
// - До 128 ключів
// - Прив'язано до конкретного бота
```

### 8.13 HapticFeedback — тактильний відгук

```javascript
const haptic = tg.HapticFeedback;

// Натискання кнопки
haptic.impactOccurred("light");    // light / medium / heavy / rigid / soft

// Сповіщення
haptic.notificationOccurred("success");  // success / warning / error

// Вибір елементу
haptic.selectionChanged();
```

### 8.14 Full-screen режим (Bot API 8.0)

```javascript
// Запит повноекранного режиму
tg.requestFullscreen();

// Вихід
tg.exitFullscreen();

// Перевірка стану
if (tg.isFullscreen) {
  // Враховуй safe area!
  const inset = tg.safeAreaInset;
  document.body.style.paddingTop = inset.top + "px";
}

// Блокування орієнтації (для ігор)
tg.lockOrientation();   // landscape або portrait
tg.unlockOrientation(); // розблокувати

// Слухач змін
tg.onEvent("fullscreenChanged", () => {
  adjustLayout(tg.isFullscreen);
});
```

### 8.15 DeviceStorage та SecureStorage (Bot API 9.0)

```javascript
// DeviceStorage — постійне локальне сховище (не хмарне!)
await tg.DeviceStorage.setItem("token", "abc123");
const token = await tg.DeviceStorage.getItem("token");
await tg.DeviceStorage.removeItem("token");

// SecureStorage — для чутливих даних (біометрія, ключі)
await tg.SecureStorage.setItem("private_key", keyData);
const key = await tg.SecureStorage.getItem("private_key");
```

---

## РОЗДІЛ 9 — INLINE-РЕЖИМ

### 9.1 Увімкнення

```
@BotFather → /setinline → @your_bot → [placeholder text]
```

### 9.2 Шаблон відповіді на inline query

```python
def handle_inline_query(query: dict):
    query_id = query["id"]
    text = query.get("query", "").strip()
    user = query["from"]

    # Якщо порожній запит — покажи підказки
    if not text:
        results = get_default_suggestions()
    else:
        results = search(text)

    api_request("answerInlineQuery", {
        "inline_query_id": query_id,
        "results": results[:50],  # Максимум 50 результатів
        "cache_time": 300,         # Кеш в секундах (0 = без кешу)
        "is_personal": True,       # True якщо результати персональні
        "next_offset": "",         # Для пагінації
        # Кнопка "Відкрити в боті" (для авторизації/налаштувань)
        "button": {
            "text": "🔐 Підключити акаунт",
            "start_parameter": "inline_auth"
        }
    })
```

### 9.3 Типовий результат — Article

```python
{
    "type": "article",
    "id": "unique_id_123",                    # Унікальний ID
    "title": "Заголовок результату",
    "description": "Короткий опис",
    "thumbnail_url": "https://example.com/img.jpg",
    "input_message_content": {
        "message_text": "Текст що буде відправлений",
        "parse_mode": "HTML",
    },
    "reply_markup": {                          # Опційна клавіатура
        "inline_keyboard": [[
            {"text": "Деталі", "url": "https://example.com"}
        ]]
    }
}
```

---

## РОЗДІЛ 10 — ПЛАТЕЖІ

### 10.1 Вибір типу платежу

```
Цифрові товари/послуги (підписки, контент, ігрові предмети):
  → ОБОВ'ЯЗКОВО Telegram Stars (XTR)
  → Інші валюти заборонені правилами App Store/Google Play

Фізичні товари/послуги:
  → Звичайні валюти (UAH, USD, EUR тощо)
  → Потрібен токен провайдера від @BotFather
```

### 10.2 Telegram Stars — продаж цифрового контенту

```python
def send_stars_invoice(chat_id: int, product: dict):
    api_request("sendInvoice", {
        "chat_id": chat_id,
        "title": product["name"],
        "description": product["description"],
        "payload": f"product_{product['id']}",  # Внутрішній ID для верифікації
        "currency": "XTR",                      # Завжди XTR для Stars
        "prices": [
            {"label": product["name"], "amount": product["stars_price"]}
        ],
        # Немає provider_token для Stars!
        "photo_url": product.get("image_url"),
    })

def handle_successful_payment(msg: dict):
    payment = msg["successful_payment"]
    payload = payment["invoice_payload"]     # Твій internal ID
    stars = payment["total_amount"]          # Кількість Stars
    charge_id = payment["telegram_payment_charge_id"]

    # Зберігаємо в БД та видаємо товар
    process_order(msg["from"]["id"], payload, stars, charge_id)
```

### 10.3 Pre-checkout — ВІДПОВІДАТИ ПРОТЯГОМ 10 СЕКУНД!

```python
def handle_pre_checkout(query: dict):
    query_id = query["id"]

    try:
        # Перевіряємо наявність товару
        payload = query["invoice_payload"]
        is_available = check_product_availability(payload)

        if is_available:
            api_request("answerPreCheckoutQuery", {
                "pre_checkout_query_id": query_id,
                "ok": True
            })
        else:
            api_request("answerPreCheckoutQuery", {
                "pre_checkout_query_id": query_id,
                "ok": False,
                "error_message": "Товар більше недоступний"
            })
    except Exception as e:
        api_request("answerPreCheckoutQuery", {
            "pre_checkout_query_id": query_id,
            "ok": False,
            "error_message": "Технічна помилка, спробуйте пізніше"
        })
```

---

## РОЗДІЛ 11 — ФАЙЛИ

### 11.1 Як правильно відправляти файли

```python
# Варіант 1: file_id (найшвидший — файл вже на серверах Telegram)
api_request("sendPhoto", {
    "chat_id": chat_id,
    "photo": "AgACAgIAAxk..."  # file_id
})

# Варіант 2: URL (Telegram завантажує сам)
api_request("sendPhoto", {
    "chat_id": chat_id,
    "photo": "https://example.com/image.jpg"
})

# Варіант 3: Завантаження файлу (multipart/form-data)
import requests
with open("image.jpg", "rb") as f:
    requests.post(
        f"https://api.telegram.org/bot{TOKEN}/sendPhoto",
        data={"chat_id": chat_id},
        files={"photo": f}
    )
```

### 11.2 Ліміти файлів

```
Завантаження (upload):       50 MB (Local API: 2000 MB)
Скачування (getFile):        20 MB (Local API: Без обмежень)
file_id:                     постійний та персистентний ✅
file_id між ботами:          НЕ ПЕРЕНОСИТЬСЯ ❌

Типи для sendDocument — будь-який формат
Типи для sendPhoto — JPG, PNG, WEBP (до 10 MB)
Типи для sendVideo — MP4 рекомендований
Типи для sendAudio — MP3, M4A, AAC, OGG
```

### 11.3 Завантаження файлу від користувача

```python
def download_user_file(file_id: str) -> bytes:
    # Крок 1: Отримай file_path
    result = api_request("getFile", {"file_id": file_id})
    file_path = result["result"]["file_path"]

    # Крок 2: Завантажи файл
    url = f"https://api.telegram.org/file/bot{TOKEN}/{file_path}"
    response = requests.get(url)
    return response.content
```

---

## РОЗДІЛ 12 — ГРУПИ ТА КАНАЛИ

### 12.1 Privacy Mode — що бот бачить

```
Privacy Mode УВІМКНЕНИЙ (за замовчуванням):
  ✅ /команди адресовані боту (/cmd@bot)
  ✅ Загальні /команди (якщо бот надіслав останнє повідомлення)
  ✅ Inline повідомлення через бота
  ✅ Відповіді на повідомлення бота
  ❌ Звичайні повідомлення учасників

Privacy Mode ВИМКНЕНИЙ:
  ✅ Всі повідомлення (крім повідомлень інших ботів)

ЯКЩО бот є адміном групи:
  ✅ Завжди бачить всі повідомлення
```

### 12.2 Додавання до каналу як адмін

```
Бот в каналі може:
✅ Публікувати повідомлення
✅ Редагувати/видаляти повідомлення
✅ Запрошувати інших
✅ Управляти учасниками
❌ Читати повідомлення учасників (канали одностороні)
```

### 12.3 Перевірка чи є користувач учасником каналу

```python
def is_member_of_channel(user_id: int, channel_id: int) -> bool:
    try:
        result = api_request("getChatMember", {
            "chat_id": channel_id,
            "user_id": user_id
        })
        status = result["result"]["status"]
        return status in ("member", "administrator", "creator")
    except:
        return False
```

---

## РОЗДІЛ 13 — ТИПОВІ ПОМИЛКИ (ніколи не роби це)

### ❌ ПОМИЛКА 1: Токен в коді

```python
# WRONG
TOKEN = "110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"

# RIGHT
import os
TOKEN = os.environ.get("BOT_TOKEN")
if not TOKEN:
    raise ValueError("BOT_TOKEN environment variable is not set")
```

### ❌ ПОМИЛКА 2: Не підтверджувати callback_query

```python
# WRONG — кнопка "крутиться" у користувача 30 секунд
def handle_callback(callback):
    do_some_work()
    # Забули answerCallbackQuery!

# RIGHT
def handle_callback(callback):
    answer_callback(callback["id"])  # ПЕРШОЮ ДІЄЮ
    do_some_work()
```

### ❌ ПОМИЛКА 3: Не обробляти retry_after (429)

```python
# WRONG
for user_id in users:
    send_message(user_id, "Привіт!")  # Буде 429 після ~30 повідомлень/сек

# RIGHT
for i, user_id in enumerate(users):
    try:
        send_message(user_id, "Привіт!")
    except TooManyRequests as e:
        time.sleep(e.retry_after)
        send_message(user_id, "Привіт!")  # Повтор
    time.sleep(0.035)  # ~28 повідомлень/сек — трохи нижче ліміту
```

### ❌ ПОМИЛКА 4: Довіряти initDataUnsafe без валідації

```javascript
// WRONG — можна підробити!
const userId = tg.initDataUnsafe.user.id;
// Надсилаємо userId на сервер без перевірки

// RIGHT
const initData = tg.initData; // Надсилаємо initData для валідації на сервері
fetch("/api/data", {
  headers: { "X-Init-Data": initData }
});
// На сервері: validate_init_data(initData, BOT_TOKEN)
```

### ❌ ПОМИЛКА 5: Зберігати стан в callback_data

```python
# WRONG — 64 байти ліміт, легко переповнити
{"callback_data": '{"user_id": 123, "order": {...}, "items": [...]}'}

# RIGHT — зберігай в БД, передавай лише ключ
{"callback_data": "order:checkout:session_abc123"}
```

### ❌ ПОМИЛКА 6: Long polling в продакшні

```python
# WRONG для продакшну
while True:
    updates = get_updates()
    process(updates)

# RIGHT для продакшну
# Встанови webhook і обробляй через HTTP endpoint
```

### ❌ ПОМИЛКА 7: Не перевіряти наявність полів

```python
# WRONG — KeyError якщо немає тексту
text = update["message"]["text"]

# RIGHT
text = update.get("message", {}).get("text", "")
```

### ❌ ПОМИЛКА 8: Не викликати ready() та expand() в Mini App

```javascript
// WRONG — app може відображатись некоректно
const tg = window.Telegram.WebApp;
// Одразу починаємо роботу

// RIGHT
const tg = window.Telegram.WebApp;
tg.ready();    // Повідомляємо Telegram що app завантажена
tg.expand();   // Розгортаємо на всю висоту
```

### ❌ ПОМИЛКА 9: Ігнорувати Flood Wait при розсилці

```
WRONG: Надсилати всім одночасно через asyncio.gather(...)
RIGHT: Черга з затримкою 35мс між повідомленнями
```

### ❌ ПОМИЛКА 10: Використовувати sendMessage для редагування

```python
# WRONG — надсилає нове повідомлення
send_message(chat_id, "Оновлений текст")

# RIGHT — редагує існуюче
api_request("editMessageText", {
    "chat_id": chat_id,
    "message_id": original_message_id,
    "text": "Оновлений текст",
    "parse_mode": "HTML"
})
```

---

## РОЗДІЛ 14 — АРХІТЕКТУРА ПРОДАКШН-БОТА

### 14.1 Рекомендований стек (Node.js / Python)

```
Python:
  - telegraf-python / python-telegram-bot / aiogram
  - FastAPI або aiohttp для webhook
  - Redis для стану сесій та черг
  - PostgreSQL для постійних даних
  - Celery або RQ для фонових задач

Node.js:
  - grammy або telegraf
  - Fastify або Express для webhook
  - Redis / PostgreSQL аналогічно

Хостинг:
  - Railway / Fly.io / Render (безкоштовний старт)
  - VPS (DigitalOcean, Hetzner) для продакшну
  - Vercel/Netlify — для Mini App фронтенду
```

### 14.2 Структура проєкту (Python приклад)

```
my_bot/
├── main.py              # Точка входу, webhook
├── config.py            # ENV змінні (TOKEN, DB_URL, тощо)
├── handlers/
│   ├── __init__.py
│   ├── commands.py      # /start, /help тощо
│   ├── callbacks.py     # callback_query обробники
│   ├── messages.py      # Текстові повідомлення
│   └── payments.py      # Платіжна логіка
├── keyboards/
│   ├── inline.py        # Inline клавіатури
│   └── reply.py         # Reply клавіатури
├── services/
│   ├── api.py           # Обгортка Bot API
│   ├── database.py      # БД операції
│   └── cache.py         # Redis операції
├── mini_app/            # Фронтенд Mini App
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── requirements.txt
```

### 14.3 Базова обгортка API (Python)

```python
import httpx
import os

TOKEN = os.environ["BOT_TOKEN"]
BASE_URL = f"https://api.telegram.org/bot{TOKEN}"

async def api_request(method: str, payload: dict = None) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/{method}",
            json=payload or {},
            timeout=30.0
        )
        data = response.json()

        if not data.get("ok"):
            error_code = data.get("error_code")
            description = data.get("description", "Unknown error")

            if error_code == 429:
                retry_after = data.get("parameters", {}).get("retry_after", 5)
                raise RetryAfterError(retry_after)
            elif error_code == 403:
                raise BotBlockedError(f"User blocked bot: {description}")
            else:
                raise TelegramAPIError(f"[{error_code}] {description}")

        return data
```

### 14.4 Управління станом розмови (FSM)

```python
# Простий FSM через Redis
import json
import redis

r = redis.Redis()

def set_state(user_id: int, state: str, data: dict = None):
    key = f"fsm:{user_id}"
    r.set(key, json.dumps({"state": state, "data": data or {}}), ex=3600)

def get_state(user_id: int) -> tuple[str, dict]:
    key = f"fsm:{user_id}"
    raw = r.get(key)
    if not raw:
        return "idle", {}
    parsed = json.loads(raw)
    return parsed["state"], parsed["data"]

def clear_state(user_id: int):
    r.delete(f"fsm:{user_id}")

# Використання
def handle_message(msg):
    user_id = msg["from"]["id"]
    state, data = get_state(user_id)

    if state == "waiting_for_name":
        data["name"] = msg.get("text", "")
        set_state(user_id, "waiting_for_phone", data)
        send_message(msg["chat"]["id"], "Введіть номер телефону:")

    elif state == "waiting_for_phone":
        data["phone"] = msg.get("text", "")
        clear_state(user_id)
        finalize_registration(user_id, data)
```

---

## РОЗДІЛ 15 — ЧЕКЛИСТИ

### 15.1 Перед запуском бота в продакшн

```
□ Токен збережений в ENV, не в коді
□ Webhook встановлений (не long polling)
□ SSL сертифікат валідний
□ Обробка всіх типів updates
□ Retry логіка для 429 помилок
□ Обробка 403 (бот заблокований користувачем)
□ /start команда реалізована
□ /help команда реалізована
□ answerCallbackQuery викликається для всіх callback
□ answerPreCheckoutQuery відповідає протягом 10с
□ Логування помилок налаштовано
□ Тести на тестовому боті пройдено
□ Rate limiting для розсилки (≤30/сек)
```

### 15.2 Перед запуском Mini App в продакшн

```
□ tg.ready() та tg.expand() викликаються на старті
□ initData валідується на сервері
□ CSS змінні теми (--tg-theme-*) використовуються
□ Safe area врахована (padding для notch/home bar)
□ Протестовано у light та dark темі
□ Протестовано на iOS та Android
□ Повідомлення про помилки через tg.showAlert (не alert())
□ Підтвердження перед закриттям (якщо є несходжені дані)
□ MainButton налаштована правильно
□ BackButton реалізована для підсторінок
□ HapticFeedback додано для ключових дій
□ Завантаження з індикатором (не порожній екран)
□ Відповідь на webhook через answerWebAppQuery (якщо потрібно)
```

### 15.3 Перед публікацією в Mini App Store

```
□ Main Mini App налаштований в @BotFather
□ Медіа-прев'ю завантажені (скріншоти + відео)
□ Прев'ю локалізовані (українська, англійська мінімум)
□ Telegram Stars підключені (прийом платежів)
□ Дотримані Design Guidelines
□ Splash screen кастомізований
□ Тестування 30+ користувачами
```

---

## РОЗДІЛ 16 — КОРИСНІ ПАТЕРНИ

### 16.1 Пагінація через inline keyboard

```python
def paginate(items: list, page: int, per_page: int = 5, prefix: str = "page") -> tuple[list, dict]:
    total = len(items)
    total_pages = (total + per_page - 1) // per_page
    start = page * per_page
    page_items = items[start:start + per_page]

    nav_buttons = []
    if page > 0:
        nav_buttons.append({"text": "◀️", "callback_data": f"{prefix}:{page-1}"})
    nav_buttons.append({"text": f"{page+1}/{total_pages}", "callback_data": "noop"})
    if page < total_pages - 1:
        nav_buttons.append({"text": "▶️", "callback_data": f"{prefix}:{page+1}"})

    keyboard = {"inline_keyboard": [nav_buttons]}
    return page_items, keyboard
```

### 16.2 Broadcast з Rate Limiting

```python
import asyncio

async def broadcast(user_ids: list[int], text: str, batch_size: int = 25):
    """Розсилка з rate limiting (30 повідомлень/сек ліміт)"""
    success = failed = 0

    for i in range(0, len(user_ids), batch_size):
        batch = user_ids[i:i + batch_size]
        tasks = [send_message_safe(uid, text) for uid in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                failed += 1
            else:
                success += 1

        # ~25 повідомлень/сек — трохи нижче ліміту
        await asyncio.sleep(1.0)

    return {"success": success, "failed": failed}

async def send_message_safe(user_id: int, text: str):
    try:
        await api_request("sendMessage", {"chat_id": user_id, "text": text})
    except BotBlockedError:
        # Видаляємо з бази заблокованих
        mark_user_blocked(user_id)
        raise
```

### 16.3 Inline результати — швидкий шаблон

```python
def make_article_result(id: str, title: str, text: str, desc: str = "") -> dict:
    return {
        "type": "article",
        "id": id,
        "title": title,
        "description": desc or title,
        "input_message_content": {
            "message_text": text,
            "parse_mode": "HTML"
        }
    }
```

### 16.4 Меню навігації — рекомендований патерн

```python
# Головне меню
MAIN_MENU = make_inline_keyboard([
    [{"text": "🛍 Каталог", "callback_data": "catalog:0"}],
    [{"text": "🛒 Корзина", "callback_data": "cart"},
     {"text": "📦 Замовлення", "callback_data": "orders"}],
    [{"text": "⚙️ Налаштування", "callback_data": "settings"},
     {"text": "❓ Допомога", "callback_data": "help"}],
])

def show_main_menu(chat_id: int, message_id: int = None):
    if message_id:
        # Редагуємо існуюче повідомлення — без спаму!
        api_request("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": "🏠 <b>Головне меню</b>",
            "parse_mode": "HTML",
            "reply_markup": MAIN_MENU
        })
    else:
        send_message(chat_id, "🏠 <b>Головне меню</b>", reply_markup=MAIN_MENU)
```

---

## РОЗДІЛ 17 — КОНФІГУРАЦІЯ БІЗНЕС-БОТА

### 17.1 Business Mode — швидке підключення

```python
def handle_business_message(msg: dict):
    """Обробка повідомлення від бізнес-акаунту"""
    connection_id = msg.get("business_connection_id")
    chat_id = msg["chat"]["id"]
    text = msg.get("text", "")

    # Відповідаємо від імені бізнес-акаунту
    api_request("sendMessage", {
        "business_connection_id": connection_id,
        "chat_id": chat_id,
        "text": generate_ai_response(text),
        "parse_mode": "HTML"
    })

def handle_business_connection(connection: dict):
    """Новий бізнес-акаунт підключився"""
    if connection["is_enabled"]:
        user = connection["user"]
        # Зберігаємо connection_id для подальших відповідей
        save_business_connection(user["id"], connection["id"])
    else:
        # Відключились
        remove_business_connection(connection["user"]["id"])
```

---

## РОЗДІЛ 18 — ШВИДКА ДОВІДКА (Cheatsheet)

### API Endpoint

```
https://api.telegram.org/bot<TOKEN>/METHOD
```

### Найчастіші методи

```
sendMessage          → надіслати текст
sendPhoto            → надіслати фото
sendDocument         → надіслати файл
sendInvoice          → надіслати рахунок
editMessageText      → редагувати текст
deleteMessage        → видалити повідомлення
answerCallbackQuery  → підтвердити callback
answerInlineQuery    → відповісти на inline
answerWebAppQuery    → відповісти Mini App
setWebhook           → встановити webhook
getMe                → інфо про бота
setMyCommands        → встановити команди
```

### Ліміти одним рядком

```
Текст: 4096 | Caption: 1024 | callback_data: 64 байти
Файл upload: 50MB | Файл download: 20MB
Rate: 30/сек broadcast | 1/сек в чаті | 20/хв в групі
```

### Порти для Webhook

```
443 (HTTPS) | 80 (HTTP) | 88 | 8443
```

### Обов'язкові команди

```
/start | /help | /settings (якщо є)
```

---

## РОЗДІЛ 19 — ПОСИЛАННЯ (завжди актуальні)

```
Bot API Reference:     https://core.telegram.org/bots/api
Mini Apps Guide:       https://core.telegram.org/bots/webapps
Payments:              https://core.telegram.org/bots/payments
Payments Stars:        https://core.telegram.org/bots/payments-stars
Bot Features:          https://core.telegram.org/bots/features
Inline Bots:           https://core.telegram.org/bots/inline
HTML5 Games:           https://core.telegram.org/bots/games
Webhooks Guide:        https://core.telegram.org/bots/webhooks
Bot FAQ:               https://core.telegram.org/bots/faq
API Changelog:         https://core.telegram.org/bots/api-changelog
Mini App JS SDK:       https://telegram.org/js/telegram-web-app.js?62
Local Bot API:         https://github.com/tdlib/telegram-bot-api

Новини:    @BotNews
Підтримка: @BotSupport
Обговор.:  @BotTalk

Тест Mini App: @DurgerKingBot
Тест платежів: @ShopBot
```

---

> **ВЕРСІЯ SKILL:** 1.0 · Bot API 9.6 · Квітень 2026
> **ПРАВИЛО:** Якщо щось не описано тут — звертайся до офіційної документації. Ніколи не вигадуй поведінку API.
