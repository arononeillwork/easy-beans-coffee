import { DRINKS, SECTIONS, baseArt, drinkById } from '../drinks';
import { resolveArt } from '../drinkArt';
import { paletteForDrink, type FamilyPalette } from '../palette';
import {
  findVariation,
  indexPriceBook,
  lowestCents,
  type PriceBook,
  type PricedItem,
} from '../priceBook';
import type { Bilingual, Drink, Section, Serve, Temp } from '../types';
import { normalizeName } from '@/features/shop/retail';

/**
 * The in-café display board's data, built from the same two halves as the
 * studio: `drinks.ts` says what the menu *is* (names, sections, photography),
 * the price book says what Square charges for it today. Pure — the screen
 * component can rebuild pages whenever a fresh book arrives, and the whole
 * thing unit-tests without a network.
 */

/** What a row costs. Either one number, or the hot/iced pair side by side. */
export interface RowPrice {
  hot?: number;
  iced?: number;
  one?: number;
}

export interface DisplayRow {
  id: string;
  name: Bilingual;
  tagline: Bilingual | null;
  /** Resolved photograph for the row's thumbnail, if the library has one. */
  art: string | null;
  price: RowPrice;
  soldOut: boolean;
}

export interface DisplayPage {
  section: Section;
  label: Bilingual;
  blurb: Bilingual;
  palette: FamilyPalette;
  /** Big photograph for the page, when the section has one worth leading with. */
  hero: { src: string; alt: string } | null;
  /** True when any row prices hot and iced apart, so the page shows the legend. */
  hasTempPair: boolean;
  rows: DisplayRow[];
}

/**
 * The photograph each section leads with. Chosen by eye, resolved through the
 * same fallback ladder as the studio, so a reshuffled library degrades to a
 * near frame instead of a broken image. Bakery has no studio shots yet and
 * leads with type instead.
 */
const HEROES: Partial<Record<Section, { drinkId: string; temp: Temp | null; serve: Serve }>> = {
  coffee: { drinkId: 'flat-white', temp: 'hot', serve: 'sitIn' },
  speciality: { drinkId: 'ube-latte', temp: 'iced', serve: 'can' },
  smoothies: { drinkId: 'berry-blast', temp: 'iced', serve: 'sitIn' },
  cold: { drinkId: 'fresh-orange-juice', temp: null, serve: 'sitIn' },
  food: { drinkId: 'acai-bowl', temp: null, serve: 'sitIn' },
};

function cents(item: PricedItem | undefined, variationName: string | undefined): number | undefined {
  if (!variationName) return undefined;
  const found = findVariation(item, variationName);
  return found && found.cents > 0 ? found.cents : undefined;
}

/** The item's cheapest variation, when it genuinely carries a price. */
function cheapest(item: PricedItem | undefined): number | undefined {
  const low = lowestCents(item);
  return low !== undefined && low > 0 ? low : undefined;
}

/**
 * A drink's price(s) for the board, read along the axis its variations
 * declare.
 *
 * Looser than the studio on purpose: when the named variation is missing —
 * the POS prices Corona as "Corona"/"Corona Cero" where the board expects
 * "Regular" — the wall shows the item's cheapest price rather than a gap.
 * The wall only quotes; nothing is ordered from it, so checkout's strict
 * name matching is not weakened by this.
 */
function priceFor(drink: Drink, item: PricedItem | undefined): RowPrice {
  const v = drink.variations;
  switch (v.by) {
    case 'temp': {
      const hot = cents(item, v.hot);
      const iced = cents(item, v.iced);
      // One temperature is a plain price; two is the pair.
      if (hot !== undefined && iced !== undefined) {
        return hot === iced ? { one: hot } : { hot, iced };
      }
      // Both temperature names missing is safe to bridge only when the item
      // has a single price — two unidentifiable prices could label iced as hot.
      if (hot === undefined && iced === undefined) {
        return { one: item && item.variations.length === 1 ? cheapest(item) : undefined };
      }
      return { one: hot ?? iced };
    }
    case 'serve': {
      const prices = [cents(item, v.sitIn), cents(item, v.takeaway)].filter(
        (value): value is number => value !== undefined,
      );
      return { one: prices.length ? Math.min(...prices) : cheapest(item) };
    }
    case 'none':
      return { one: cents(item, v.name) ?? cheapest(item) };
    case 'pick':
      // Pick shelves are expanded into one row per pick — see buildRows.
      return { one: undefined };
  }
}

/** Thumbnail frame for a drink, preferring the temperature it is sold at first. */
function rowArt(drink: Drink): string | null {
  const v = drink.variations;
  const temp: Temp | null =
    v.by === 'temp' ? (v.hot ? 'hot' : 'iced') : (v.by === 'pick' ? null : v.temp ?? null);
  return resolveArt(baseArt(drink), temp, drink.serves[0] ?? 'sitIn');
}

function buildRows(drink: Drink, item: PricedItem | undefined): DisplayRow[] {
  if (drink.variations.by === 'pick') {
    const picks = drink.variations.picks;

    // The fridge reads as its bottles, not as one "Soft Drinks" line…
    if (drink.section === 'cold') {
      return picks.map((pick) => ({
        id: `${drink.id}:${pick.id}`,
        name: pick.name,
        tagline: null,
        art: resolveArt(pick.art ?? pick.id, null, 'takeaway') ?? rowArt(drink),
        price: { one: cents(item, pick.square) },
        soldOut: item?.soldOut ?? false,
      }));
    }

    // …but a flavour choice ("Strawberry or Mango") stays one dish, priced
    // from its cheapest pick. A bare "Strawberry" row says nothing.
    const prices = picks
      .map((pick) => cents(item, pick.square))
      .filter((value): value is number => value !== undefined);
    return [
      {
        id: drink.id,
        name: drink.name,
        tagline: drink.tagline,
        art: rowArt(drink),
        price: { one: prices.length ? Math.min(...prices) : undefined },
        soldOut: item?.soldOut ?? false,
      },
    ];
  }

  return [
    {
      id: drink.id,
      name: drink.name,
      tagline: drink.tagline,
      art: rowArt(drink),
      price: priceFor(drink, item),
      soldOut: item?.soldOut ?? false,
    },
  ];
}

/** One page per section, in board order, priced from the given snapshot. */
export function buildDisplayPages(book: PriceBook): DisplayPage[] {
  const byKey = indexPriceBook(book);

  return SECTIONS.map((section) => {
    const rows = DRINKS.filter((drink) => drink.section === section.id).flatMap((drink) =>
      buildRows(drink, byKey.get(normalizeName(drink.square))),
    );

    const heroRef = HEROES[section.id];
    const heroDrink = heroRef ? drinkById(heroRef.drinkId) : undefined;
    const heroSrc = heroRef && heroDrink ? resolveArt(baseArt(heroDrink), heroRef.temp, heroRef.serve) : null;

    // The page is washed in its hero's colour; a heroless section (bakery)
    // takes the first row's drink so it still arrives with a palette.
    const paletteDrink = heroDrink ?? DRINKS.find((drink) => drink.section === section.id);

    return {
      section: section.id,
      label: section.label,
      blurb: section.blurb,
      palette: paletteFor(paletteDrink),
      hero: heroSrc && heroDrink ? { src: heroSrc, alt: heroDrink.name.en } : null,
      hasTempPair: rows.some((row) => row.price.hot !== undefined),
      rows,
    };
  }).filter((page) => page.rows.length > 0);
}

function paletteFor(drink: Drink | undefined): FamilyPalette {
  if (drink) return paletteForDrink(drink);
  // Unreachable while DRINKS covers every section; a safe cream-side default.
  return { wash: '#F3DED3', glow: '#F79BA4', accent: '#A85A68' };
}
