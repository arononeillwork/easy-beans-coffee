import { DRINKS, SECTIONS, baseArt } from '../drinks';
import { resolveArt } from '../drinkArt';
import {
  findVariation,
  indexPriceBook,
  lowestCents,
  type PriceBook,
  type PricedItem,
} from '../priceBook';
import type { Bilingual, Drink, Section, Temp } from '../types';
import { normalizeName } from '@/features/shop/retail';

/**
 * The in-café display board's data, built from the same two halves as the
 * studio: `drinks.ts` says what the menu *is* (names, sections, photography),
 * the price book says what Square charges for it today. Pure — the screen
 * component can rebuild the board whenever a fresh book arrives, and the
 * whole thing unit-tests without a network.
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
  /**
   * A pick shelf's choices spelled out — "Coca-Cola · Sprite · …" — so the
   * fridge reads as one line with its options, not one row per bottle.
   */
  options: Bilingual | null;
  /** Resolved photograph, for any layout that wants thumbnails. */
  art: string | null;
  price: RowPrice;
  /**
   * True when the drink is priced along hot/iced, so the card can rule up
   * caliente/frío columns from the menu's shape — before Square has answered,
   * and even when one temperature is missing.
   */
  tempAxis: boolean;
  soldOut: boolean;
}

export interface DisplaySection {
  id: Section;
  label: Bilingual;
  blurb: Bilingual;
  /** True when any row prices hot and iced apart, for the board's legend. */
  hasTempPair: boolean;
  rows: DisplayRow[];
}

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
      // Kept apart even when only one exists: the board prints these drinks
      // under caliente/frío columns, and which column a price falls in is
      // part of the answer.
      if (hot !== undefined || iced !== undefined) return { hot, iced };
      // Both temperature names missing is safe to bridge only when the item
      // has a single price — two unidentifiable prices could label iced as hot.
      return { one: item && item.variations.length === 1 ? cheapest(item) : undefined };
    }
    case 'serve': {
      const prices = [cents(item, v.sitIn), cents(item, v.takeaway)].filter(
        (value): value is number => value !== undefined,
      );
      return { one: prices.length ? Math.min(...prices) : cheapest(item) };
    }
    case 'none':
      return { one: cents(item, v.name) ?? cheapest(item) };
    case 'pick': {
      // One line for the shelf, at its (invariably shared) cheapest price.
      const prices = v.picks
        .map((pick) => cents(item, pick.square))
        .filter((value): value is number => value !== undefined);
      return { one: prices.length ? Math.min(...prices) : cheapest(item) };
    }
  }
}

/** Thumbnail frame for a drink, preferring the temperature it is sold at first. */
function rowArt(drink: Drink): string | null {
  const v = drink.variations;
  const temp: Temp | null =
    v.by === 'temp' ? (v.hot ? 'hot' : 'iced') : (v.by === 'pick' ? null : v.temp ?? null);
  return resolveArt(baseArt(drink), temp, drink.serves[0] ?? 'sitIn');
}

function toRow(drink: Drink, item: PricedItem | undefined): DisplayRow {
  const options =
    drink.variations.by === 'pick'
      ? {
          en: drink.variations.picks.map((pick) => pick.name.en).join(' · '),
          es: drink.variations.picks.map((pick) => pick.name.es).join(' · '),
        }
      : null;

  return {
    id: drink.id,
    name: drink.name,
    tagline: drink.tagline,
    options,
    art: rowArt(drink),
    price: priceFor(drink, item),
    tempAxis: drink.variations.by === 'temp',
    soldOut: item?.soldOut ?? false,
  };
}

/** The whole board, one section per entry, in the order the café reads it. */
export function buildDisplayBoard(book: PriceBook): DisplaySection[] {
  const byKey = indexPriceBook(book);

  return SECTIONS.map((section) => {
    const rows = DRINKS.filter((drink) => drink.section === section.id).map((drink) =>
      toRow(drink, byKey.get(normalizeName(drink.square))),
    );
    return {
      id: section.id,
      label: section.label,
      blurb: section.blurb,
      hasTempPair: rows.some((row) => row.price.hot !== undefined),
      rows,
    };
  }).filter((section) => section.rows.length > 0);
}
