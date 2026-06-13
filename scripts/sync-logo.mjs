import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoDir = path.join(root, 'logo');
const clientPublic = path.join(root, 'packages/client/public');
const iconsDir = path.join(clientPublic, 'icons');

const sourceSvgPath = path.join(logoDir, 'logo-swg.svg');
const sourcePngPath = path.join(logoDir, 'logo-original.png');
const source = fs.readFileSync(sourceSvgPath, 'utf8');
const pathMatch = source.match(/d="([^"]+)"/);
if (!pathMatch) throw new Error('logo/logo-swg.svg: path d= not found');

const d = pathMatch[1];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1256 366" fill="currentColor" role="img" aria-label="MOVLI">
  <path fill-rule="evenodd" d="${d}"/>
</svg>
`;

fs.mkdirSync(iconsDir, { recursive: true });
fs.writeFileSync(path.join(clientPublic, 'logo.svg'), svg);

/** Square app mark (logo-original.png) → tab favicon, iOS home screen, PWA manifest. */
async function syncRasterIcons() {
  if (!fs.existsSync(sourcePngPath)) throw new Error(`missing logo asset: ${sourcePngPath}`);

  const rasterTargets = [
    { size: 32, dest: path.join(iconsDir, 'favicon-32.png') },
    { size: 180, dest: path.join(clientPublic, 'apple-touch-icon.png') },
    { size: 192, dest: path.join(iconsDir, 'pwa-192.png') },
    { size: 512, dest: path.join(iconsDir, 'pwa-512.png') },
    { size: 512, dest: path.join(iconsDir, 'logo-original.png') },
  ];

  for (const { size, dest } of rasterTargets) {
    await sharp(sourcePngPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toFile(dest);
  }

  // Legacy .ico for /favicon.ico requests (128×128 round mark, not 16×16 wordmark).
  const legacyIco = path.join(logoDir, 'logo-128-128.ico');
  if (!fs.existsSync(legacyIco)) throw new Error(`missing logo asset: ${legacyIco}`);
  fs.copyFileSync(legacyIco, path.join(clientPublic, 'favicon.ico'));
  fs.copyFileSync(legacyIco, path.join(iconsDir, 'icon-128.ico'));
}

await syncRasterIcons();

const tsx = `import type { SVGProps } from 'react';

/** Vector MOVLI wordmark — synced from logo/logo-swg.svg via scripts/sync-logo.mjs */
export function MovliLogoMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1256 366"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path fillRule="evenodd" d={${JSON.stringify(d)}} />
    </svg>
  );
}
`;

fs.writeFileSync(path.join(root, 'packages/client/src/components/MovliLogoMark.tsx'), tsx);
console.log('synced logo from logo/ (%d chars path)', d.length);
