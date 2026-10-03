/**
 * Pulls the drink photography out of Google Drive, encodes it for the web, and
 * writes the manifest the studio resolves art against.
 *
 *   npm run media:drinks
 *
 * Why the site holds its own copies at all: the menu used to render whatever
 * photograph happened to be attached to a Square catalog item, which meant a
 * third-party CDN in the critical path, an aspect ratio chosen by the POS, and
 * about half the menu with no picture. The Drive library is the real thing —
 * every drink, in every vessel, shot the same way — so it ships with the site.
 *
 * Downloads go over Drive's public file endpoint, so the source folder must be
 * shared as "anyone with the link → viewer" while this runs. Nothing here holds
 * a credential; a 401/HTML response is reported per file and the rest continue,
 * so a single missing shot never costs you the run.
 *
 * Masters land in media-src/drinks/ (git-ignored, never served) and the encoded
 * WebP in public/media/drinks/. Re-running skips anything already downloaded
 * unless --force is passed.
 */
import { mkdir, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { DRINK_ART, SYRUP_ART_SOURCES } from './drinkArtSources';

const SRC_DIR = path.resolve(process.cwd(), 'media-src/drinks');
const OUT_DIR = path.resolve(process.cwd(), 'public/media/drinks');
const SYRUP_SRC_DIR = path.resolve(process.cwd(), 'media-src/syrups');
const SYRUP_OUT_DIR = path.resolve(process.cwd(), 'public/media/syrups');
const MANIFEST = path.resolve(process.cwd(), 'src/features/menu/artManifest.ts');

/**
 * The stage renders the cup at roughly 420 CSS px, so 1200 covers it at 2x on
 * the largest phone and leaves room for the zoom on press. Anything more is
 * bytes nobody sees.
 */
const DRINK_WIDTH = 1200;
/** Syrup bottles are thumbnails on a rail; they never render above ~80px. */
const SYRUP_WIDTH = 320;
const QUALITY = 82;

const force = process.argv.includes('--force');

interface Failure {
  what: string;
  why: string;
}

const failures: Failure[] = [];

async function main(): Promise<void> {
  await mkdir(SRC_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(SYRUP_SRC_DIR, { recursive: true });
  await mkdir(SYRUP_OUT_DIR, { recursive: true });

  console.log(`Drink art: ${DRINK_ART.length} frames, ${SYRUP_ART_SOURCES.length} bottles\n`);

  for (const source of DRINK_ART) {
    const master = path.join(SRC_DIR, source.art, `${source.frame}.png`);
    const out = path.join(OUT_DIR, source.art, `${source.frame}.webp`);
    await handle(`${source.art}/${source.frame}`, source.id, master, out, DRINK_WIDTH);
  }

  for (const source of SYRUP_ART_SOURCES) {
    const master = path.join(SYRUP_SRC_DIR, `${source.slug}.png`);
    const out = path.join(SYRUP_OUT_DIR, `${source.slug}.webp`);
    await handle(`syrup/${source.slug}`, source.id, master, out, SYRUP_WIDTH);
  }

  await writeManifest();

  if (failures.length > 0) {
    console.log(`\n${failures.length} could not be fetched:`);
    for (const failure of failures) console.log(`  ${failure.what}  —  ${failure.why}`);
    console.log(
      '\nIf these are 401s, the Drive folder is not link-shared. Set the top-level\n' +
        'drinks folder to "Anyone with the link → Viewer" and re-run.',
    );
    process.exitCode = 1;
  }
}

/** Download if we do not already hold the master, then always re-encode. */
async function handle(
  label: string,
  id: string,
  master: string,
  out: string,
  width: number,
): Promise<void> {
  await mkdir(path.dirname(master), { recursive: true });
  await mkdir(path.dirname(out), { recursive: true });

  if (force || !(await exists(master))) {
    const bytes = await download(id);
    if (!bytes) {
      failures.push({ what: label, why: lastError });
      return;
    }
    await writeFile(master, bytes);
  }

  const ground = await measureGround(master);
  const pipeline = sharp(master).rotate().resize({ width, withoutEnlargement: true });
  // A lifted scene shot is just a blown-out scene shot: the correction below
  // only makes sense for a cut-out on a sweep.
  const gain = ground.studio ? Math.min(255 / ground.white, 1.15) : 1;
  const encoded = await (gain > 1 ? pipeline.linear(gain, 0) : pipeline)
    .webp({ quality: QUALITY })
    .toBuffer();
  await writeFile(out, encoded);

  const before = (await stat(master)).size;
  console.log(
    `  ${label.padEnd(34)} ${kb(before).padStart(9)} → ${kb(encoded.byteLength).padStart(9)}`,
  );
}

/**
 * How much to lift each shot so its studio ground is actually white.
 *
 * The library is shot over months against a white sweep, and the sweep comes
 * back anywhere from 227 to 255 depending on the light that day. The studio
 * composites every cup with `mix-blend-mode: multiply` so that ground vanishes
 * into whatever colour the stage is washed with (see features/menu/client/
 * DrinkStage) — and multiply is exact: a ground at 235 does not vanish, it
 * leaves a soft grey rectangle 8% darker than the stage around every such
 * drink, while the ones shot at 255 sit perfectly. Inconsistent, and obvious
 * once you swipe between two of them.
 *
 * So each shot is lifted by the gain that puts *its own* ground at white,
 * measured off a border ring — the cup is centred, so the ring is background in
 * every frame in the library.
 *
 * The white point is taken low in that ring rather than at its median, because
 * these shots vignette: the median is the ground at mid-height and the corners
 * sit several percent under it, so correcting to the median leaves the corners
 * showing and only moves the seam rather than closing it. A low percentile
 * lifts the darkest ground to white and clips a little off the drink's own
 * highlights, which on a set of milk and glass is a trade worth making.
 *
 * The gain is capped. Past about 15% we would be papering over a genuinely
 * underexposed shot, and the honest fix for that one is to reshoot it.
 */
async function measureGround(master: string): Promise<{ studio: boolean; white: number }> {
  const { data, info } = await sharp(master)
    .resize({ width: 64, height: 64, fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ring: number[] = [];
  for (let x = 0; x < info.width; x++) {
    ring.push(data[x], data[(info.height - 1) * info.width + x]);
  }
  for (let y = 0; y < info.height; y++) {
    ring.push(data[y * info.width], data[y * info.width + info.width - 1]);
  }

  // What fraction of the border is bright, rather than how bright it is on
  // average. A tight crop where the glass runs off the edge still has bright
  // corners and drags the mean down without being any less of a cut-out; a café
  // table under string lights has almost no bright border at all. Across this
  // library the split is unambiguous — every cut-out sits at 0.55 or above and
  // the three scene shots at 0.10 or below — so the threshold sits in the gap.
  const bright = ring.filter((v) => v >= 230).length / ring.length;
  const sorted = [...ring].sort((a, b) => a - b);

  return { studio: bright >= 0.35, white: sorted[Math.floor(sorted.length * 0.15)] || 255 };
}

let lastError = '';

/**
 * Drive's public download endpoint. A file that is not link-shared answers with
 * an HTML sign-in page and a 200, so the content type is checked rather than
 * the status code — writing that page to disk as a .png is exactly the kind of
 * failure that only shows up much later, in the browser.
 */
async function download(id: string): Promise<Buffer | null> {
  const url = `https://drive.usercontent.google.com/download?id=${id}&export=download`;
  try {
    const response = await fetch(url, { redirect: 'follow' });
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok) {
      lastError = `HTTP ${response.status}`;
      return null;
    }
    if (!type.startsWith('image/') && !type.startsWith('application/octet-stream')) {
      lastError = type.includes('html') ? 'not shared (got a sign-in page)' : `unexpected ${type}`;
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/**
 * Rewrites features/menu/artManifest.ts from what is actually on disk.
 *
 * Generated from the output directory rather than from the source table on
 * purpose: the manifest's job is to tell the resolver what it can safely ask
 * for, and a frame that failed to download must not be in it.
 */
async function writeManifest(): Promise<void> {
  const manifest: Record<string, string[]> = {};
  const sceneFrames: string[] = [];
  for (const folder of await readdirSafe(OUT_DIR)) {
    const frames = (await readdirSafe(path.join(OUT_DIR, folder)))
      .filter((name) => name.endsWith('.webp'))
      .map((name) => name.replace(/\.webp$/, ''))
      .sort();
    if (frames.length === 0) continue;
    manifest[folder] = frames;
    // Classified from what is on disk rather than from the download table, so a
    // frame dropped into public/media/drinks/ by hand is classified too.
    for (const frame of frames) {
      const { studio } = await measureGround(path.join(OUT_DIR, folder, `${frame}.webp`));
      if (!studio) sceneFrames.push(`${folder}/${frame}`);
    }
  }
  sceneFrames.sort();

  const bottles = new Set(
    (await readdirSafe(SYRUP_OUT_DIR))
      .filter((name) => name.endsWith('.webp'))
      .map((name) => name.replace(/\.webp$/, '')),
  );
  const syrups: Record<string, string> = {};
  for (const source of SYRUP_ART_SOURCES) {
    if (!bottles.has(source.slug)) continue;
    for (const modifier of source.modifiers) {
      syrups[normalize(modifier)] = `/media/syrups/${source.slug}.webp`;
    }
  }

  const body = `/**
 * Which drink photographs actually exist on disk.
 *
 * GENERATED — do not edit by hand. \`npm run media:drinks\` walks
 * \`public/media/drinks/\` and rewrites this file.
 *
 * It exists so the art resolver can fall back *before* rendering rather than
 * after: the library is shot drink by drink and is legitimately incomplete
 * (there is a hot flat white sit-in shot and no takeaway one yet), and an
 * <img> that 404s after layout is a worse answer than a considered substitute
 * chosen up front. See ./drinkArt.
 *
 * Keys are art folders; values are \`<temp>-<serve>\` slugs, where temp is
 * hot | iced | na and serve is sit-in | takeaway | can.
 */
export const ART_MANIFEST: Record<string, string[]> = ${stringify(manifest)};

/** Bottle shots for the syrup rail, keyed by Square modifier name, normalized. */
export const SYRUP_ART: Record<string, string> = ${stringify(syrups)};

/**
 * Frames shot in the café rather than on the studio sweep, as \`<art>/<frame>\`.
 *
 * These cannot be composited with multiply — there is no white ground to drop
 * out, only a table and a wall, and blending one turns the whole photograph the
 * colour of the stage. They are presented as photographs instead: a framed card
 * rather than a cup floating on colour. See ./drinkArt's \`isSceneFrame\`.
 */
export const SCENE_FRAMES: string[] = ${stringify(sceneFrames)};
`;

  await writeFile(MANIFEST, body, 'utf8');
  const frames = Object.values(manifest).reduce((sum, list) => sum + list.length, 0);
  console.log(
    `\nManifest: ${Object.keys(manifest).length} drinks, ${frames} frames, ` +
      `${Object.keys(syrups).length} bottle shots, ${sceneFrames.length} in the café`,
  );
}

/** Matches features/shop/retail's normalizeName, which is what the app looks up by. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/\n/g, '\n');
}

async function readdirSafe(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
