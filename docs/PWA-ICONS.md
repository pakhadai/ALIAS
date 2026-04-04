# PWA icons (PNG checklist)

The app ships with SVG icons (`public/icons/icon-192.svg`, `favicon.svg`) so install works everywhere that accepts SVG. For **best results on iOS and Android**, add raster assets and point `vite.config.ts` → `VitePWA.manifest.icons` to them.

| File | Size | Purpose |
|------|------|---------|
| `packages/client/public/icons/pwa-192.png` | **192×192** | Web manifest `any`, general launcher |
| `packages/client/public/icons/pwa-512.png` | **512×512** | Web manifest `any`, splash / high-res |
| `packages/client/public/icons/pwa-512-maskable.png` | **512×512** | `maskable` — **important graphic in the center ~40%**; outer area is cropped on Android |

Optional for **Apple**:

| File | Size | Usage |
|------|------|--------|
| `apple-touch-icon.png` (or multiple) | **180×180** (classic) | Replace or supplement `<link rel="apple-touch-icon" href="...">` in `index.html` |

**Export tips:** flat or simple logo, no tiny text at edges (maskable safe zone). After adding files, update the `icons` array in `packages/client/vite.config.ts` and rebuild.
