import { normalizeName } from '@/features/shop/retail';
import type { CartLine } from '@/features/order/types';
import { displayNameFor } from './drinkArt';
import { findGroup, findVariation, type PricedGroup, type PricedItem } from './priceBook';
import type { Drink, DrinkChoice, Lang, OptionRef, Serve, Temp } from './types';

/**
 * Turning "a large iced latte with oat milk and caramel" into the three things
 * that matter downstream: a price to show, a Square variation id to sell, and a
 * line for the cart.
 *
 * This is the only place the local catalog and the Square price book are read
 * together. Everything upstream of it deals in the café's own vocabulary
 * (hot/iced, sit in/takeaway/can, milk, syrup) and everything downstream deals
 * in Square ids, which keeps the studio free of POS concepts and the checkout
 * free of ours.
 *
 * Nothing here trusts its own arithmetic: the price it computes is a display
 * figure, and the server recomputes every cent from the live catalog at
 * checkout. See server/square/checkout.ts.
 */

/** A modifier rail, once its Square list has been found and priced. */
export interface ResolvedOption {
  ref: OptionRef;
  group: PricedGroup;
}

/**
 * Temperatures this drink can actually be sold at today.
 *
 * The catalog declares intent ("this comes hot and iced") and Square decides
 * whether that is currently true — a variation the POS has dropped disappears
 * from the switch rather than becoming an unsellable button.
 */
export function availableTemps(drink: Drink, item: PricedItem | undefined): Temp[] {
  const map = drink.variations;
  if (map.by === 'temp') {
    const temps: Temp[] = [];
    if (map.hot && findVariation(item, map.hot)) temps.push('hot');
    if (map.iced && findVariation(item, map.iced)) temps.push('iced');
    return temps;
  }
  // Serve-priced and single-price drinks still have a temperature; it just is
  // not a choice, so the switch does not appear and the art still knows which
  // frame to ask for.
  if (map.by === 'serve' || map.by === 'none') return map.temp ? [map.temp] : [];
  return [];
}

/** Whether the temperature switch should be shown at all. */
export function tempIsChoice(drink: Drink, item: PricedItem | undefined): boolean {
  return drink.variations.by === 'temp' && availableTemps(drink, item).length > 1;
}

/**
 * The Square variation a choice resolves to.
 *
 * For most drinks the price axis is temperature; for smoothies and juice it is
 * the vessel; for a croissant there is only one. A `can` has no variation of
 * its own anywhere in the catalog — it is the takeaway line with a different
 * vessel, and reaches the counter as a note. See {@link serveNote}.
 */
export function variationFor(drink: Drink, item: PricedItem | undefined, choice: DrinkChoice) {
  const map = drink.variations;
  switch (map.by) {
    case 'temp': {
      const name = choice.temp === 'iced' ? map.iced : map.hot;
      // A hot-only drink asked for iced (or the reverse) falls back to the one
      // variation it has rather than pricing as nothing.
      return findVariation(item, name ?? '') ?? findVariation(item, map.hot ?? map.iced ?? '');
    }
    case 'serve':
      return findVariation(item, choice.serve === 'sitIn' ? map.sitIn : map.takeaway);
    case 'none':
      return findVariation(item, map.name);
    case 'pick': {
      const pick = map.picks.find((p) => p.id === choice.pickId) ?? map.picks[0];
      return findVariation(item, pick.square);
    }
  }
}

/** True when the serve switch also picks the price, rather than only the vessel. */
export function serveIsPriced(drink: Drink): boolean {
  return drink.variations.by === 'serve';
}

/**
 * The modifier rails to render, in catalog order, dropping any Square has no
 * list for. A café that deletes its purée list simply loses that rail.
 */
export function resolveOptions(drink: Drink, item: PricedItem | undefined): ResolvedOption[] {
  return drink.options.flatMap((ref) => {
    // "Coming soon" is a statement on the menu, not a choice: even if Square
    // still carries the list, nothing from it may be selected, priced or sent.
    if (ref.comingSoon) return [];
    const group = findGroup(item, ref.square);
    if (!group || group.modifiers.length === 0) return [];
    return [{ ref, group }];
  });
}

/**
 * The choice a drink opens on: its default temperature and vessel, and the
 * first option of anything Square marks required — a milk drink has to be made
 * with *some* milk, and making the customer name it before the price appears
 * would be a worse screen.
 */
export function initialChoice(
  drink: Drink,
  item: PricedItem | undefined,
  preferred?: { temp?: Temp; serve?: Serve },
): DrinkChoice {
  const temps = availableTemps(drink, item);
  const temp = preferred?.temp && temps.includes(preferred.temp) ? preferred.temp : (temps[0] ?? null);
  const serve =
    preferred?.serve && drink.serves.includes(preferred.serve) ? preferred.serve : drink.serves[0];

  const options: Record<string, string[]> = {};
  for (const { ref, group } of resolveOptions(drink, item)) {
    if (group.minSelected > 0 && group.modifiers[0]) {
      options[ref.square] = [group.modifiers[0].name];
    }
  }

  const pickId = drink.variations.by === 'pick' ? drink.variations.picks[0].id : null;

  return { drinkId: drink.id, temp, serve, pickId, options, quantity: 1 };
}

/** Square modifier ids for a choice, in rail order. Unknown names are dropped. */
export function modifierIdsFor(
  drink: Drink,
  item: PricedItem | undefined,
  choice: DrinkChoice,
): Array<{ id: string; name: string; cents: number }> {
  const out: Array<{ id: string; name: string; cents: number }> = [];
  for (const { ref, group } of resolveOptions(drink, item)) {
    for (const name of choice.options[ref.square] ?? []) {
      const needle = normalizeName(name);
      const modifier = group.modifiers.find((m) => m.key === needle);
      if (modifier) out.push({ id: modifier.id, name: modifier.name, cents: modifier.cents });
    }
  }
  return out;
}

export interface ComposedPrice {
  /** Undefined when Square has no price for this drink — the board says so. */
  unitCents: number | undefined;
  variationId: string | undefined;
  soldOut: boolean;
}

export function composePrice(
  drink: Drink,
  item: PricedItem | undefined,
  choice: DrinkChoice,
): ComposedPrice {
  const variation = variationFor(drink, item, choice);
  if (!variation) return { unitCents: undefined, variationId: undefined, soldOut: false };

  const extras = modifierIdsFor(drink, item, choice).reduce((sum, m) => sum + m.cents, 0);
  return {
    unitCents: variation.cents + extras,
    variationId: variation.id,
    soldOut: variation.soldOut,
  };
}

/**
 * What the counter needs told that the Square line item cannot say on its own.
 *
 * For a smoothie the vessel *is* the variation, so there is nothing to add. For
 * a coffee it is not priced at all, and a barista pulling the ticket has no
 * other way to know whether to reach for a glass, a cup or a can. Null when the
 * line already carries it.
 */
export function serveNote(drink: Drink, choice: DrinkChoice, lang: Lang): string | null {
  if (serveIsPriced(drink)) return null;
  if (drink.serves.length <= 1) return null;
  return SERVE_NOTE[choice.serve][lang];
}

const SERVE_NOTE: Record<Serve, Record<Lang, string>> = {
  sitIn: { en: 'sit in', es: 'para tomar aquí' },
  takeaway: { en: 'takeaway cup', es: 'para llevar' },
  can: { en: 'in a can', es: 'en lata' },
};

/**
 * The cart line for a composed choice, or null when it cannot be sold — no
 * Square variation, or the item is out.
 *
 * `imageUrl` is now a local path rather than a Square CDN URL, which is the
 * whole point of the rebuild: the cart thumbnail is the same photograph the
 * customer just chose, served from our own origin.
 */
export function toCartLine(
  drink: Drink,
  item: PricedItem | undefined,
  choice: DrinkChoice,
  lang: Lang,
  imageUrl: string | null,
): CartLine | null {
  const variation = variationFor(drink, item, choice);
  if (!variation || variation.soldOut) return null;

  const modifiers = modifierIdsFor(drink, item, choice);
  const note = serveNote(drink, choice, lang);
  // The ticket is read at the counter, so it goes to Square in the café's own
  // working language regardless of which one the customer ordered in.
  const ticketNote = serveNote(drink, choice, 'es');
  const name = displayNameFor(drink, choice)[lang];

  return {
    lineId: crypto.randomUUID(),
    itemId: item?.id ?? drink.id,
    itemName: name,
    variationId: variation.id,
    // The variation name a customer reads should be the choice they made, not
    // Square's internal label — "Iced · takeaway cup", not "Iced".
    variationName: note ? `${variation.name} · ${note}` : variation.name,
    modifierIds: modifiers.map((m) => m.id),
    modifierNames: modifiers.map((m) => m.name),
    quantity: choice.quantity,
    unitPriceCents: variation.cents + modifiers.reduce((sum, m) => sum + m.cents, 0),
    kind: 'drink',
    imageUrl: imageUrl ?? undefined,
    note: ticketNote ?? undefined,
  };
}
