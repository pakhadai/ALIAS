# PWA icons

Raster icons are generated from `logo/logo-original.png` (square app mark) via:

```bash
pnpm sync:logo
```

This writes:

| File | Size | Purpose |
|------|------|---------|
| `packages/client/public/icons/favicon-32.png` | **32×32** | Browser tab (`<link rel="icon">`) |
| `packages/client/public/favicon.ico` | **128×128** | Legacy `/favicon.ico` requests |
| `packages/client/public/apple-touch-icon.png` | **180×180** | **iOS “Add to Home Screen”** (PNG required; `.ico` is ignored) |
| `packages/client/public/icons/pwa-192.png` | **192×192** | Web manifest launcher |
| `packages/client/public/icons/pwa-512.png` | **512×512** | Web manifest splash / maskable |

`@movli/client` `build` runs `sync:logo` automatically. Source wordmark SVG stays in `logo/logo-swg.svg` for in-app UI only — do **not** use the 16×16 wordmark `.ico` for favicons.

**Export tips:** square mark on solid background; keep the logo centered (~80% safe zone for maskable). After changing `logo/logo-original.png`, run `pnpm sync:logo` and rebuild.
