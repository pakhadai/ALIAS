Integration tests
=================

A small integration script is provided to verify socket-based theme synchronization between two clients.

Prerequisites
-------------
- Server running on http://localhost:3001 (or set `SERVER_URL` env var)

Run the test
------------
From the repository root run:

```bash
pnpm --filter @alias/server exec node scripts/theme-sync-test.js
```

What it does
------------
- Creates a room as a host
- Connects a second client
- Host emits `UPDATE_SETTINGS` with `theme = PREMIUM_LIGHT`
- The script succeeds if the second client receives a `game:state-sync` containing `settings.theme = PREMIUM_LIGHT`

Notes
-----
- Ensure `packages/client/.env.local` contains `VITE_GOOGLE_CLIENT_ID` with your Google client id for normal client behavior.
- If you run server inside Docker, ensure the container has `GOOGLE_CLIENT_ID` set (see `docker-compose.yml`).
