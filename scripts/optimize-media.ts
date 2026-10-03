/**
 * Re-encodes the brand photography masters in `media-src/` into web-ready
 * assets in `public/media/`.
 *
 * Why this exists: the masters are 1–2.3 MB PNG/JPEG straight from the shoot.
 * `next/image` re-encodes them to AVIF/WebP on demand, and AVIF encoding from a
 * multi-megabyte PNG is seconds per variant — a stall in dev and a slow first
 * hit in production. Encoding once, ahead of time, makes every later encode
 * cheap and cuts what gets deployed.
 *
 * Masters stay out of `public/` so they are never served by accident.
 *
 *   npm run optimize:media
 */
import { mkdir, readdir, copyFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC_DIR = path.resolve(process.cwd(), 'media-src');
const OUT_DIR = path.resolve(process.cwd(), 'public/media');

/** Nothing on the site renders wider than the hero at 2x on a large display. */
const MAX_WIDTH = 2000;
const WEBP_QUALITY = 82;

/** The Open Graph card: JPEG at the spec ratio, since not every scraper takes WebP. */
const OG_SOURCE = 'hero-can.png';
const OG_OUT = 'og-hero.jpg';
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg']);

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const entries = await readdir(SRC_DIR);

  let before = 0;
  let after = 0;
  const rows: string[] = [];

  for (const name of entries) {
    const srcPath = path.join(SRC_DIR, name);
    const ext = path.extname(name).toLowerCase();
    const srcBytes = (await stat(srcPath)).size;
    before += srcBytes;

    if (!IMAGE_EXT.has(ext)) {
      // Video and anything else passes through untouched.
      const outPath = path.join(OUT_DIR, name);
      await copyFile(srcPath, outPath);
      after += srcBytes;
      rows.push(`${name.padEnd(28)} ${kb(srcBytes).padStart(9)} → ${kb(srcBytes).padStart(9)}  (copied)`);
      continue;
    }

    const outName = `${path.basename(name, ext)}.webp`;
    const outPath = path.join(OUT_DIR, outName);
    const buffer = await sharp(srcPath)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    await writeFile(outPath, buffer);
    after += buffer.byteLength;
    rows.push(
      `${name.padEnd(28)} ${kb(srcBytes).padStart(9)} → ${kb(buffer.byteLength).padStart(9)}  ${outName}`,
    );
  }

  // Social card, generated from the same master as the hero.
  const ogSrc = path.join(SRC_DIR, OG_SOURCE);
  const ogBuffer = await sharp(ogSrc)
    .rotate()
    .resize({ width: OG_WIDTH, height: OG_HEIGHT, fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  await writeFile(path.join(OUT_DIR, OG_OUT), ogBuffer);
  after += ogBuffer.byteLength;
  rows.push(`${OG_SOURCE.padEnd(28)} ${''.padStart(9)}   ${kb(ogBuffer.byteLength).padStart(9)}  ${OG_OUT}`);

  console.log(rows.join('\n'));
  console.log(
    `\ntotal ${kb(before)} → ${kb(after)} (${Math.round((1 - after / before) * 100)}% smaller)`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
