/**
 * Seeds the Square SANDBOX catalog with the Easy Beans menu:
 * categories, items with Hot/Iced variations, and modifier lists
 * (milk, syrups, purées, extras). Idempotent by design — re-running
 * upserts the same objects (matched by stable #temp ids per run, so
 * repeated runs against a non-empty catalog will create duplicates;
 * intended for a fresh sandbox).
 *
 *   npm run seed:catalog
 *
 * Refuses to run against production.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { SquareClient, SquareEnvironment, type Square } from 'square';

loadEnvFiles(['.env.local', '.env']);

const environment = process.env.SQUARE_ENVIRONMENT ?? 'sandbox';
const accessToken = process.env.SQUARE_ACCESS_TOKEN;

if (environment !== 'sandbox') {
  console.error('Refusing to seed a non-sandbox Square environment.');
  process.exit(1);
}
if (!accessToken) {
  console.error('SQUARE_ACCESS_TOKEN is not set (see .env.example).');
  process.exit(1);
}

const client = new SquareClient({ token: accessToken, environment: SquareEnvironment.Sandbox });

const EUR = (cents: number): Square.Money => ({ amount: BigInt(cents), currency: 'EUR' });

// ── Modifier lists ───────────────────────────────────────────────────────────

function modifier(listSlug: string, name: string, cents: number): Square.CatalogObject {
  return {
    type: 'MODIFIER',
    id: `#mod-${listSlug}-${slug(name)}`,
    presentAtAllLocations: true,
    modifierData: { name, priceMoney: EUR(cents) },
  };
}

function modifierList(
  name: string,
  slugName: string,
  selectionType: 'SINGLE' | 'MULTIPLE',
  modifiers: Array<[string, number]>,
): Square.CatalogObject {
  return {
    type: 'MODIFIER_LIST',
    id: `#modlist-${slugName}`,
    presentAtAllLocations: true,
    modifierListData: {
      name,
      selectionType,
      modifiers: modifiers.map(([modName, cents]) => modifier(slugName, modName, cents)),
    },
  };
}

const MODIFIER_LISTS = [
  modifierList('Milk', 'milk', 'SINGLE', [
    ['Semi-skimmed', 0],
    ['Oat', 0],
    ['Gluten-free oat', 0],
    ['Almond', 0],
    ['Coconut', 0],
    ['Lactose-free', 0],
  ]),
  modifierList('Syrups', 'syrup', 'MULTIPLE', [
    ['Caramel', 50],
    ['Salted caramel', 50],
    ['Vanilla', 50],
    ['Hazelnut', 50],
  ]),
  modifierList('Purées', 'puree', 'MULTIPLE', [
    ['Mango', 100],
    ['Strawberry', 100],
  ]),
  modifierList('Extras', 'extra', 'MULTIPLE', [
    ['Extra espresso shot', 50],
    ['Cold foam', 100],
  ]),
  modifierList('Grind', 'grind', 'SINGLE', [
    ['Whole bean', 0],
    ['Ground for espresso', 0],
    ['Ground for filter', 0],
    ['Ground for cafetière', 0],
  ]),
];

const DRINK_MODIFIERS: Square.CatalogItemModifierListInfo[] = [
  { modifierListId: '#modlist-milk', enabled: true, minSelectedModifiers: 0, maxSelectedModifiers: 1 },
  { modifierListId: '#modlist-syrup', enabled: true },
  { modifierListId: '#modlist-puree', enabled: true },
  { modifierListId: '#modlist-extra', enabled: true },
];

/** Beans must be sold ground or whole — the choice is required, not optional. */
const GRIND_MODIFIERS: Square.CatalogItemModifierListInfo[] = [
  { modifierListId: '#modlist-grind', enabled: true, minSelectedModifiers: 1, maxSelectedModifiers: 1 },
];

// ── Categories & items ───────────────────────────────────────────────────────

interface SeedItem {
  name: string;
  description?: string;
  /** [variationName, cents] */
  variations: Array<[string, number]>;
  withDrinkModifiers?: boolean;
  withGrind?: boolean;
}

const CATEGORIES: Array<{ name: string; slug: string; items: SeedItem[] }> = [
  {
    name: 'The Classics',
    slug: 'classics',
    items: [
      { name: 'Espresso', variations: [['Single', 240]], withDrinkModifiers: true },
      { name: 'Americano', variations: [['Hot', 280], ['Iced', 380]], withDrinkModifiers: true },
      { name: 'Cortado', variations: [['Hot', 300], ['Iced', 400]], withDrinkModifiers: true },
      { name: 'Double Cortado', variations: [['Hot', 350], ['Iced', 450]], withDrinkModifiers: true },
      { name: 'Cappuccino', variations: [['Hot', 350], ['Iced', 450]], withDrinkModifiers: true },
      { name: 'Flat White', variations: [['Hot', 380], ['Iced', 480]], withDrinkModifiers: true },
      { name: 'Latte', variations: [['Hot', 400], ['Iced', 500]], withDrinkModifiers: true },
      { name: 'Mocha', variations: [['Hot', 450]], withDrinkModifiers: true },
      { name: 'Hot Chocolate', variations: [['Hot', 400]], withDrinkModifiers: true },
      { name: 'Irish Tea', description: 'Classic brewed tea.', variations: [['Regular', 300]] },
    ],
  },
  {
    name: 'Specialty',
    slug: 'specialty',
    items: [
      { name: 'Matcha Latte', description: 'Ceremonial grade.', variations: [['Hot', 550], ['Iced', 650]], withDrinkModifiers: true },
      { name: 'Chai Latte', description: 'Brewed spice by spice.', variations: [['Hot', 450], ['Iced', 550]], withDrinkModifiers: true },
      { name: 'Pink Chai Latte', variations: [['Hot', 550], ['Iced', 650]], withDrinkModifiers: true },
      { name: 'Ube Latte', description: 'A purple yam, not a syrup.', variations: [['Hot', 590], ['Iced', 690]], withDrinkModifiers: true },
      { name: 'Ube Matcha Latte', variations: [['Iced', 790]], withDrinkModifiers: true },
      { name: 'Cold Brew', description: 'Slow-steeped, clean and strong.', variations: [['Iced', 470]], withDrinkModifiers: true },
    ],
  },
  {
    name: 'Smoothies',
    slug: 'smoothies',
    items: [
      { name: 'Strawberry Sunrise', description: 'Strawberries and banana.', variations: [['Regular', 650]] },
      { name: 'Tropical', description: 'Mango, pineapple, orange, Greek yoghurt.', variations: [['Regular', 650]] },
      { name: 'Gym Nut', description: 'Peanut butter, banana and oats. Contains nuts.', variations: [['Regular', 650]] },
      { name: 'Berry Blast', variations: [['Regular', 650]] },
    ],
  },
  {
    name: 'Bakery',
    slug: 'bakery',
    items: [
      { name: 'Butter Croissant', variations: [['Regular', 270]] },
      { name: 'Pain au Chocolat', variations: [['Regular', 250]] },
      { name: 'Cinnamon Swirl', variations: [['Regular', 330]] },
      { name: 'Raisin Butter Swirl', variations: [['Regular', 330]] },
      { name: 'Gluten-free Brownie', variations: [['Regular', 380]] },
      { name: 'Pistachio Cheesecake', variations: [['Slice', 640]] },
    ],
  },
  {
    name: 'Food',
    slug: 'food',
    items: [
      { name: 'Toast, Olive Oil & Tomato', variations: [['Regular', 350]] },
      { name: 'Toast, Butter & Jam', variations: [['Regular', 300]] },
      { name: 'Ham & Cheese Croissant', variations: [['Regular', 420]] },
      { name: 'Bacon Sandwich', variations: [['Regular', 550]] },
      { name: 'Eggs & Toast', description: 'Fried or scrambled.', variations: [['Regular', 600]] },
      { name: 'Açaí Bowl', description: 'Whole fruit, nothing sweetening it.', variations: [['Regular', 1100]] },
    ],
  },
  {
    name: 'Cans',
    slug: 'cans',
    items: [
      { name: 'Mango Chia Pudding', variations: [['Can', 450]] },
      { name: 'Strawberry Chia Pudding', variations: [['Can', 450]] },
      { name: 'Biscoff Cheesecake Can', variations: [['Can', 450]] },
      { name: 'Fruit Can', variations: [['Can', 500]] },
    ],
  },
  {
    name: 'Cold Drinks',
    slug: 'cold-drinks',
    items: [
      { name: 'Fresh Orange Juice', variations: [['Regular', 380]] },
      { name: 'Water', variations: [['Still', 250], ['Sparkling', 300]] },
      { name: 'Coca-Cola', variations: [['Regular', 250], ['Zero', 250]] },
      { name: 'Fanta', variations: [['Orange', 250], ['Lemon', 250]] },
      { name: 'Sprite', variations: [['Regular', 250]] },
      { name: 'Iced Tea', variations: [['Regular', 250]] },
    ],
  },

  // ── Shop stock ─────────────────────────────────────────────────────────────
  // Category names here must match src/features/shop/retail.ts, which is what
  // routes an item to /shop rather than /menu. Rename one and it moves.
  {
    name: 'Coffee beans',
    slug: 'beans',
    items: [
      {
        name: 'Oro Fino · Dark roast',
        description:
          'Caramel, nuts and chocolate — balanced and sweet. Mogiana, São Paulo, hand-roasted in micro-batches in Temple Bar, Dublin. Deeper and rounder: our espresso base.',
        variations: [['250 g', 1200], ['1 kg', 4000]],
        withGrind: true,
      },
      {
        name: 'Brasil Bottrel · Light roast',
        description:
          'Hazelnut cream, chocolate and brown sugar. Catuaí, natural process, Estate Primavera, Alto Mogiana. Roasted locally by Santa Roaster, Málaga — brighter and sweeter, for filter and iced.',
        variations: [['250 g', 1200], ['1 kg', 4000]],
        withGrind: true,
      },
    ],
  },
  {
    name: 'Matcha & chai',
    slug: 'matcha-chai',
    items: [
      {
        name: 'Ceremonial matcha',
        description:
          'Stone-ground, whisked to order, never pre-mixed. The same tin we work from behind the counter. Around thirty servings.',
        variations: [['30 g tin', 2400]],
      },
      {
        name: 'House chai blend',
        description:
          'Brewed here, spice by spice. It takes longer. It is worth it. Loose blend, roughly twenty cups.',
        variations: [['200 g', 1400]],
      },
    ],
  },
  {
    name: 'Gift sets',
    slug: 'gift-sets',
    items: [
      {
        name: 'Both roasts box',
        description:
          'Dublin dark and Málaga light, 250 g of each, in one box. For people who cannot decide, and for people buying for someone else.',
        variations: [['Box', 2200]],
      },
      {
        name: 'The morning set',
        description:
          'A bag of the light roast, a tin of ceremonial matcha, and a can glass so the layers read the way they do in the café.',
        variations: [['Box', 4200]],
      },
    ],
  },
];

function buildObjects(): Square.CatalogObject[] {
  const objects: Square.CatalogObject[] = [...MODIFIER_LISTS];

  for (const category of CATEGORIES) {
    objects.push({
      type: 'CATEGORY',
      id: `#cat-${category.slug}`,
      presentAtAllLocations: true,
      categoryData: { name: category.name },
    });

    for (const item of category.items) {
      const itemId = `#item-${category.slug}-${slug(item.name)}`;
      objects.push({
        type: 'ITEM',
        id: itemId,
        presentAtAllLocations: true,
        itemData: {
          name: item.name,
          description: item.description,
          categories: [{ id: `#cat-${category.slug}` }],
          modifierListInfo: item.withDrinkModifiers
            ? DRINK_MODIFIERS
            : item.withGrind
              ? GRIND_MODIFIERS
              : undefined,
          variations: item.variations.map(([variationName, cents]) => ({
            type: 'ITEM_VARIATION',
            id: `${itemId}-${slug(variationName)}`,
            presentAtAllLocations: true,
            itemVariationData: {
              itemId,
              name: variationName,
              pricingType: 'FIXED_PRICING',
              priceMoney: EUR(cents),
            },
          })),
        },
      });
    }
  }

  return objects;
}

async function main() {
  const objects = buildObjects();
  console.log(`Upserting ${objects.length} catalog objects to Square sandbox…`);

  const response = await client.catalog.batchUpsert({
    idempotencyKey: randomUUID(),
    batches: [{ objects }],
  });

  const created = response.idMappings?.length ?? 0;
  if (response.errors?.length) {
    console.error('Square returned errors:', JSON.stringify(response.errors, null, 2));
    process.exit(1);
  }
  console.log(`Done. ${created} object ids mapped. Check Dashboard → Items.`);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function loadEnvFiles(files: string[]): void {
  for (const file of files) {
    try {
      const content = readFileSync(path.resolve(process.cwd(), file), 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (match && process.env[match[1]] === undefined) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // File absent — fine.
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
