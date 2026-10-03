/**
 * Allergens, matching the five on the counter sign (Lista de alérgenos):
 * gluten, lácteos, huevos, frutos secos, soja.
 *
 * The facts live here, in one language-independent table, and only the labels
 * are translated (see `allergens` in en.ts / es.ts). Allergen information is
 * the one thing on this site that must never drift between the two locales, so
 * there is deliberately no per-language copy of it.
 *
 * EDIT THIS TABLE, NOT THE COMPONENTS. It describes the *standard* serve of
 * each drink — milk swaps (oat, soy, lactose-free) are handled at the counter
 * and are covered by the note under the cards.
 */
export const ALLERGEN_IDS = ['gluten', 'milk', 'egg', 'nuts', 'soy'] as const;

export type AllergenId = (typeof ALLERGEN_IDS)[number];

/** Stable keys for the five drinks in the education row; never shown to users. */
export type DrinkId = 'coffee' | 'matcha' | 'ube' | 'acai' | 'chai';

export const DRINK_ALLERGENS: Record<DrinkId, readonly AllergenId[]> = {
  // Espresso itself carries none; the standard serve is a milk drink.
  coffee: ['milk'],
  matcha: ['milk'],
  ube: ['milk'],
  // The bowl is whole fruit — the granola on top is what carries these.
  acai: ['gluten', 'nuts'],
  chai: ['milk'],
};
