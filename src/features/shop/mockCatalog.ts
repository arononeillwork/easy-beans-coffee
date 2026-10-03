import type { MenuCategory, MenuItem } from '@/features/order/types';

const PLACEHOLDER_ID_PREFIX = 'mock-';

/**
 * True for stand-in stock. Square never issues ids with this prefix, so this
 * is a safe guard for disabling anything that would reach checkout — the
 * server would reject these ids as `catalog_mismatch` anyway, and failing at
 * the button is kinder than failing at the payment link.
 */
export function isPlaceholderItem(item: MenuItem): boolean {
  return item.id.startsWith(PLACEHOLDER_ID_PREFIX);
}

/**
 * Placeholder shop stock.
 *
 * Square is the single source of truth for everything on this site. No retail
 * products exist in the catalog yet, so these stand in purely so the shop can
 * be built and reviewed — they are used ONLY when Square returns no retail
 * categories at all, and vanish the moment real products are seeded (see
 * `npm run seed:catalog`, which creates these same items for real).
 *
 * Every id is prefixed `mock-` so a placeholder can never be mistaken for a
 * live catalog object, and so checkout rejects it: validateLines looks ids up
 * in the live catalog and throws `catalog_mismatch` on a miss.
 *
 * Copy is taken from the Edition 01 guidelines (p.06 "Our coffee"). Prices are
 * illustrative and are NOT authoritative — real prices come from Square.
 */
export const MOCK_RETAIL_CATEGORIES: MenuCategory[] = [
  {
    id: 'mock-cat-beans',
    name: 'Coffee beans',
    sortOrder: 100,
    kind: 'retail',
    retailSlug: 'beans',
    items: [
      {
        id: 'mock-oro-fino',
        name: 'Oro Fino · Dark roast',
        description:
          'Caramel, nuts and chocolate — balanced and sweet. Hand-roasted in micro-batches in Temple Bar, Dublin. Deeper and rounder: our espresso base.',
        soldOut: false,
        kind: 'retail',
        slug: 'oro-fino-dark-roast',
        badge: 'pick',
        variations: [
          { id: 'mock-oro-fino-250', name: '250 g', priceCents: 1200, currency: 'EUR' },
          { id: 'mock-oro-fino-1kg', name: '1 kg', priceCents: 4000, currency: 'EUR' },
        ],
        modifierGroups: [
          {
            id: 'mock-grind',
            name: 'Grind',
            required: true,
            minSelected: 1,
            maxSelected: 1,
            modifiers: [
              { id: 'mock-grind-whole', name: 'Whole bean', priceCents: 0 },
              { id: 'mock-grind-espresso', name: 'Ground for espresso', priceCents: 0 },
              { id: 'mock-grind-filter', name: 'Ground for filter', priceCents: 0 },
            ],
          },
        ],
      },
      {
        id: 'mock-brasil-bottrel',
        name: 'Brasil Bottrel · Light roast',
        description:
          'Hazelnut cream, chocolate and brown sugar. Catuaí, natural process, from Estate Primavera. Roasted locally by Santa Roaster in Málaga — brighter and sweeter, for filter and iced.',
        soldOut: false,
        kind: 'retail',
        slug: 'brasil-bottrel-light-roast',
        variations: [
          { id: 'mock-bottrel-250', name: '250 g', priceCents: 1200, currency: 'EUR' },
          { id: 'mock-bottrel-1kg', name: '1 kg', priceCents: 4000, currency: 'EUR' },
        ],
        modifierGroups: [
          {
            id: 'mock-grind',
            name: 'Grind',
            required: true,
            minSelected: 1,
            maxSelected: 1,
            modifiers: [
              { id: 'mock-grind-whole', name: 'Whole bean', priceCents: 0 },
              { id: 'mock-grind-espresso', name: 'Ground for espresso', priceCents: 0 },
              { id: 'mock-grind-filter', name: 'Ground for filter', priceCents: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'mock-cat-matcha-chai',
    name: 'Matcha & chai',
    sortOrder: 101,
    kind: 'retail',
    retailSlug: 'matcha-chai',
    items: [
      {
        id: 'mock-ceremonial-matcha',
        name: 'Ceremonial matcha',
        description:
          'Stone-ground, whisked to order, never pre-mixed. The same tin we work from behind the counter. Thirty servings.',
        soldOut: false,
        kind: 'retail',
        slug: 'ceremonial-matcha',
        variations: [{ id: 'mock-matcha-30g', name: '30 g tin', priceCents: 2400, currency: 'EUR' }],
        modifierGroups: [],
      },
      {
        id: 'mock-house-chai',
        name: 'House chai blend',
        description:
          'Brewed here, spice by spice. It takes longer, and it is worth it. Loose blend, enough for roughly twenty cups.',
        soldOut: false,
        kind: 'retail',
        slug: 'house-chai-blend',
        badge: 'new',
        variations: [{ id: 'mock-chai-200g', name: '200 g', priceCents: 1400, currency: 'EUR' }],
        modifierGroups: [],
      },
    ],
  },
  {
    id: 'mock-cat-gift-sets',
    name: 'Gift sets',
    sortOrder: 102,
    kind: 'retail',
    retailSlug: 'gift-sets',
    items: [
      {
        id: 'mock-both-roasts',
        name: 'Both roasts box',
        description:
          'Dublin dark and Málaga light, 250 g of each, in one box. For people who cannot decide, and for people buying for someone else.',
        soldOut: false,
        kind: 'retail',
        slug: 'both-roasts-box',
        compareAtCents: 2400,
        variations: [{ id: 'mock-both-roasts-box', name: 'Box', priceCents: 2200, currency: 'EUR' }],
        modifierGroups: [],
      },
      {
        id: 'mock-morning-set',
        name: 'The morning set',
        description:
          'A bag of the light roast, a tin of ceremonial matcha, and a can glass so the layers read the way they do in the café.',
        soldOut: false,
        kind: 'retail',
        slug: 'the-morning-set',
        badge: 'limited',
        compareAtCents: 4600,
        variations: [{ id: 'mock-morning-set-box', name: 'Box', priceCents: 4200, currency: 'EUR' }],
        modifierGroups: [],
      },
    ],
  },
];
