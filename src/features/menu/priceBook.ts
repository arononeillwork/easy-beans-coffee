/**
 * The price book: the only thing the drinks menu still asks Square for.
 *
 * The studio's identity — which drinks exist, what they are called, how they
 * are photographed, which options they take — lives in `drinks.ts` and ships
 * with the site. Square keeps the two things it is actually authoritative
 * about: what a drink costs today, and whether it has run out. That split is
 * why this shape carries no names to display, no descriptions and no image
 * URLs; it is a lookup table, not a menu.
 *
 * Everything here is plain data with no server imports, so the client can hold
 * a snapshot and the checkout path can validate against a fresh one.
 */

import { normalizeName } from '@/features/shop/retail';
import type { MenuResponse } from '@/features/order/types';

export interface PricedVariation {
  /** Square catalog object id — what checkout actually sends. */
  id: string;
  /** Square's own variation name, e.g. "Hot", "Iced", "Sit In". */
  name: string;
  /** Normalized form of {@link name}, for matching against the local catalog. */
  key: string;
  cents: number;
  soldOut: boolean;
}

export interface PricedModifier {
  id: string;
  name: string;
  key: string;
  cents: number;
}

export interface PricedGroup {
  id: string;
  name: string;
  key: string;
  required: boolean;
  minSelected: number;
  maxSelected: number;
  modifiers: PricedModifier[];
}

export interface PricedItem {
  id: string;
  name: string;
  /** Normalized name — the join key between Square and the local catalog. */
  key: string;
  categoryName: string;
  categoryKey: string;
  soldOut: boolean;
  variations: PricedVariation[];
  groups: PricedGroup[];
}

export interface PriceBook {
  items: PricedItem[];
  currency: string;
  /** ISO instant the underlying catalog was read from Square. */
  fetchedAt: string;
  /** Café-local date (YYYY-MM-DD) the snapshot belongs to. */
  day: string;
  /**
   * True when Square could not be reached and this is yesterday's prices (or
   * older). The page still renders; it just stops claiming the prices are
   * today's.
   */
  stale: boolean;
}

/** An empty book renders the menu with prices withheld rather than wrong. */
export const EMPTY_PRICE_BOOK: PriceBook = {
  items: [],
  currency: 'EUR',
  fetchedAt: '1970-01-01T00:00:00.000Z',
  day: '1970-01-01',
  stale: true,
};

/**
 * Strips the catalog down to prices and identifiers.
 *
 * Item names are the join key, so the whole book is keyed on the normalized
 * name rather than the Square id: ids change when the café rebuilds an item in
 * the POS, names do not. A renamed item falls out of the book and its drink
 * renders price-less, which is loud enough to notice and harmless to a
 * customer — far better than a silently wrong number.
 */
export function toPriceBook(menu: MenuResponse, day: string): PriceBook {
  const items: PricedItem[] = [];

  for (const category of menu.categories) {
    for (const item of category.items) {
      items.push({
        id: item.id,
        name: item.name,
        key: normalizeName(item.name),
        categoryName: category.name,
        categoryKey: normalizeName(category.name),
        soldOut: item.soldOut,
        variations: item.variations.map((v) => ({
          id: v.id,
          name: v.name,
          key: normalizeName(v.name),
          cents: v.priceCents,
          soldOut: item.soldOut,
        })),
        groups: item.modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          key: normalizeName(g.name),
          required: g.required,
          minSelected: g.minSelected,
          maxSelected: g.maxSelected,
          modifiers: g.modifiers.map((m) => ({
            id: m.id,
            name: m.name,
            key: normalizeName(m.name),
            cents: m.priceCents,
          })),
        })),
      });
    }
  }

  return {
    items,
    currency: menu.currency,
    fetchedAt: menu.fetchedAt,
    day,
    stale: false,
  };
}

/** Café-local calendar day, which is when "today's prices" turns over. */
export function cafeDay(nowMs: number, timezone: string): string {
  // en-CA gives YYYY-MM-DD, which sorts and compares as a plain string.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(nowMs);
}

/**
 * Index for the lookups the studio does on every render. Built once per
 * snapshot rather than scanning `items` per drink.
 */
export function indexPriceBook(book: PriceBook): Map<string, PricedItem> {
  const byKey = new Map<string, PricedItem>();
  for (const item of book.items) {
    // First write wins: Square carries a handful of duplicate names across
    // categories (the POS has two "Food" categories), and the earlier entry is
    // the one the catalog normalizer already ordered first.
    if (!byKey.has(item.key)) byKey.set(item.key, item);
  }
  return byKey;
}

/** Finds a variation by Square's name, e.g. "Hot"; undefined if the item lacks it. */
export function findVariation(
  item: PricedItem | undefined,
  variationName: string,
): PricedVariation | undefined {
  if (!item) return undefined;
  const needle = normalizeName(variationName);
  return item.variations.find((v) => v.key === needle);
}

/** Finds a modifier group by Square's list name, e.g. "Milk". */
export function findGroup(item: PricedItem | undefined, groupName: string): PricedGroup | undefined {
  if (!item) return undefined;
  const needle = normalizeName(groupName);
  return item.groups.find((g) => g.key === needle);
}

/** Cheapest variation in cents, or undefined when the item carries no price. */
export function lowestCents(item: PricedItem | undefined): number | undefined {
  if (!item || item.variations.length === 0) return undefined;
  return Math.min(...item.variations.map((v) => v.cents));
}
