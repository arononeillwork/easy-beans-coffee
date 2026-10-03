import { ART_MANIFEST, SCENE_FRAMES } from './artManifest';
import { baseArt } from './drinks';
import type { Drink, DrinkChoice, Serve, Temp } from './types';

/**
 * Choosing which photograph to show for a drink as it is being built.
 *
 * The library is shot per drink, per temperature, per vessel — `iced-can`,
 * `hot-sit-in` — which is exactly the axes the studio lets a customer move
 * along, so most of the time the lookup is direct. It is also legitimately
 * incomplete: some drinks have five shots and some have one, and new ones
 * arrive weekly. So every lookup falls back down a deliberate order rather
 * than 404ing, and the order is chosen to keep the *drink* right even when the
 * vessel is wrong — an iced latte in the wrong cup still reads as an iced
 * latte; a hot one does not.
 */

const SERVE_SLUG: Record<Serve, string> = {
  sitIn: 'sit-in',
  takeaway: 'takeaway',
  can: 'can',
};

/** Prefer the glass on the table, then the cup, then the can. */
const SERVE_FALLBACK: Serve[] = ['sitIn', 'takeaway', 'can'];

export const DRINK_ART_BASE = '/media/drinks';

/**
 * The art folder for a choice, after any flavour swap.
 *
 * A latte with caramel syrup is photographed as a caramel latte, so that is
 * what gets shown. The first matching flavour wins, which makes the catalog's
 * declaration order the tie-break when someone picks two.
 */
export function artFolderFor(
  drink: Drink,
  choice: Pick<DrinkChoice, 'options' | 'pickId'>,
): string {
  for (const flavour of drink.flavours ?? []) {
    const chosen = choice.options[flavour.group] ?? [];
    if (chosen.includes(flavour.modifier)) return flavour.art;
  }

  // A shelf item is photographed as itself: the fridge row is twelve bottles,
  // not one "Soft Drinks". A pick with no shot of its own falls back to the
  // parent rather than to a folder that does not exist.
  if (drink.variations.by === 'pick') {
    const picks = drink.variations.picks;
    const pick = picks.find((entry) => entry.id === choice.pickId) ?? picks[0];
    const folder = pick.art ?? pick.id;
    if (hasArt(folder)) return folder;
  }

  return baseArt(drink);
}

/** The drink's name once a flavour choice has renamed it, e.g. "Strawberry Matcha". */
export function displayNameFor(drink: Drink, choice: Pick<DrinkChoice, 'options'>) {
  for (const flavour of drink.flavours ?? []) {
    const chosen = choice.options[flavour.group] ?? [];
    if (chosen.includes(flavour.modifier) && flavour.name) return flavour.name;
  }
  return drink.name;
}

/**
 * The shot for one exact combination, or the nearest thing to it.
 *
 * Order: the exact frame, then the same temperature in another vessel, then the
 * other temperature in the same vessel, then anything at all. Temperature is
 * held ahead of vessel on purpose — see the note at the top of the file.
 */
export function resolveArt(art: string, temp: Temp | null, serve: Serve): string | null {
  const frames = ART_MANIFEST[art];
  if (!frames || frames.length === 0) return null;

  const tempSlug = temp ?? 'na';
  const exact = `${tempSlug}-${SERVE_SLUG[serve]}`;
  if (frames.includes(exact)) return frame(art, exact);

  for (const candidate of SERVE_FALLBACK) {
    const key = `${tempSlug}-${SERVE_SLUG[candidate]}`;
    if (frames.includes(key)) return frame(art, key);
  }

  const otherTemp = tempSlug === 'hot' ? 'iced' : 'hot';
  for (const candidate of [serve, ...SERVE_FALLBACK]) {
    const key = `${otherTemp}-${SERVE_SLUG[candidate]}`;
    if (frames.includes(key)) return frame(art, key);
  }

  return frame(art, frames[0]);
}

function frame(art: string, key: string): string {
  return `${DRINK_ART_BASE}/${art}/${key}.webp`;
}

/**
 * Every frame a drink could show across its own switches, so the browser can be
 * told to fetch them before they are asked for. Without this the cup visibly
 * pops on the first press of Hot/Iced, which is the one interaction the whole
 * screen is built around.
 */
export function framesToPreload(drink: Drink, temps: Temp[]): string[] {
  const folders = new Set<string>([baseArt(drink), ...(drink.flavours ?? []).map((f) => f.art)]);
  if (drink.variations.by === 'pick') {
    for (const pick of drink.variations.picks) folders.add(pick.art ?? pick.id);
  }
  const out: string[] = [];
  for (const folder of folders) {
    const frames = ART_MANIFEST[folder] ?? [];
    for (const key of frames) {
      // Only the temperatures this drink actually offers; a hot-only drink has
      // no business warming an iced frame.
      const temp = key.split('-')[0] as Temp | 'na';
      if (temp !== 'na' && !temps.includes(temp)) continue;
      out.push(frame(folder, key));
    }
  }
  return out;
}

/** True when the library has anything at all for this folder. */
export function hasArt(art: string): boolean {
  return (ART_MANIFEST[art]?.length ?? 0) > 0;
}

const SCENES = new Set(SCENE_FRAMES.map((key) => `${DRINK_ART_BASE}/${key}.webp`));

/**
 * True when this frame was shot in the café rather than on the studio sweep.
 *
 * Most of the library is a cup on white, which the stage drops into its wash
 * with a multiply blend. A handful are photographs of the drink on a table
 * under the string lights — there is no ground to drop out, and blending one
 * tints the whole room. Those get shown as photographs: framed, not floated.
 */
export function isSceneFrame(src: string | null): boolean {
  return src !== null && SCENES.has(src);
}
