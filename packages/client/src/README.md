# Client source (`packages/client/src`)

Документація продукту та архітектури — у кореневому **[`README.md`](../../../README.md)** (монорепо). Лобі та збір команд — **[`docs/LOBBY_TEAM_BUILDER.md`](../../../docs/LOBBY_TEAM_BUILDER.md)**.

Цей каталог містить вихідний код клієнта (React, екрани, контексти, хуки). Точка входу збірки: **`index.tsx`**; кореневий layout і `GameRouter` — **`App.tsx`**.

**Версія клієнта** в меню береться з **`packages/client/package.json`** → поле **`version`** (підставляється збіркою через `define` у `vite.config.ts`). Останні зміни лобі / правил — у кореневому **`CHANGELOG.md`**.
