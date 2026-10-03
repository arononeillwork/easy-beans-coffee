import type {
  MenuCategory,
  MenuItem,
  MenuModifierGroup,
  MenuResponse,
  MenuVariation,
} from '@/features/order/types';
import { retailSlugForCategory, slugify } from '@/features/shop/retail';
import { toPriceBook, type PriceBook } from '@/features/menu/priceBook';

/**
 * Builder-pattern test data factories. Each builder returns `this` for
 * chaining and produces plain MenuResponse payloads used to mock /api/menu,
 * so e2e tests never depend on live Square data.
 */

export class MenuItemBuilder {
  private item: MenuItem;

  constructor(name = 'Latte') {
    const id = `item-${name.toLowerCase().replace(/\s+/g, '-')}`;
    this.item = {
      id,
      name,
      soldOut: false,
      variations: [],
      modifierGroups: [],
      kind: 'drink',
    };
  }

  /** Marks the item as shop stock. Categories set this too — see MenuBuilder. */
  retail(): this {
    this.item.kind = 'retail';
    this.item.slug = slugify(this.item.name);
    return this;
  }

  withBadge(badge: NonNullable<MenuItem['badge']>): this {
    this.item.badge = badge;
    return this;
  }

  withCompareAt(cents: number): this {
    this.item.compareAtCents = cents;
    return this;
  }

  withDescription(description: string): this {
    this.item.description = description;
    return this;
  }

  withVariation(name: string, priceCents: number): this {
    const variation: MenuVariation = {
      id: `${this.item.id}-${name.toLowerCase()}`,
      name,
      priceCents,
      currency: 'EUR',
    };
    this.item.variations.push(variation);
    return this;
  }

  withModifierGroup(
    name: string,
    modifiers: Array<[string, number]>,
    options: { required?: boolean; max?: number } = {},
  ): this {
    const groupId = `group-${name.toLowerCase().replace(/\s+/g, '-')}`;
    const group: MenuModifierGroup = {
      id: groupId,
      name,
      required: options.required ?? false,
      minSelected: options.required ? 1 : 0,
      maxSelected: options.max ?? (options.required ? 1 : 99),
      modifiers: modifiers.map(([modName, priceCents]) => ({
        id: `${groupId}-${modName.toLowerCase().replace(/\s+/g, '-')}`,
        name: modName,
        priceCents,
      })),
    };
    this.item.modifierGroups.push(group);
    return this;
  }

  soldOut(): this {
    this.item.soldOut = true;
    return this;
  }

  build(): MenuItem {
    if (this.item.variations.length === 0) {
      this.withVariation('Regular', 400);
    }
    return { ...this.item };
  }
}

export class MenuBuilder {
  private categories: MenuCategory[] = [];

  /**
   * Retail vs drink is derived from the category name using the same mapping
   * production uses, so fixtures cannot drift from the real classification.
   */
  withCategory(name: string, items: MenuItem[]): this {
    const retailSlug = retailSlugForCategory(name);
    this.categories.push({
      id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      sortOrder: this.categories.length,
      kind: retailSlug ? 'retail' : 'drink',
      retailSlug,
      items: items.map((item) =>
        retailSlug ? { ...item, kind: 'retail', slug: item.slug ?? slugify(item.name) } : item,
      ),
    });
    return this;
  }

  build(): MenuResponse {
    return {
      categories: this.categories,
      locationId: 'TEST_LOCATION',
      currency: 'EUR',
      fetchedAt: new Date().toISOString(),
    };
  }
}

/** A small ready-made menu most specs can share. */
export function defaultTestMenu(): MenuResponse {
  return new MenuBuilder()
    .withCategory('The Classics', [
      new MenuItemBuilder('Latte')
        .withDescription('Espresso with steamed milk.')
        .withVariation('Hot', 400)
        .withVariation('Iced', 500)
        .withModifierGroup('Milk', [['Oat', 0], ['Almond', 0]], { required: true, max: 1 })
        .withModifierGroup('Syrups', [['Caramel', 50], ['Vanilla', 50]])
        .build(),
      new MenuItemBuilder('Espresso').withVariation('Single', 240).build(),
      new MenuItemBuilder('Mocha').withVariation('Hot', 450).soldOut().build(),
    ])
    .withCategory('Specialty', [
      new MenuItemBuilder('Matcha Latte')
        .withVariation('Hot', 550)
        .withVariation('Iced', 650)
        .build(),
    ])
    .build();
}

/** Drinks plus shop stock, for specs that exercise /shop. */
export function testMenuWithShop(): MenuResponse {
  return new MenuBuilder()
    .withCategory('The Classics', [
      new MenuItemBuilder('Latte').withVariation('Hot', 400).build(),
    ])
    .withCategory('Coffee beans', [
      new MenuItemBuilder('Oro Fino')
        .withDescription('Caramel, nuts and chocolate. Hand-roasted in Dublin.')
        .withVariation('250 g', 1200)
        .withBadge('pick')
        .build(),
      new MenuItemBuilder('Brasil Bottrel')
        .withDescription('Hazelnut cream, chocolate, brown sugar. Roasted in Málaga.')
        .withVariation('250 g', 1200)
        .withVariation('1 kg', 4000)
        .build(),
    ])
    .withCategory('Gift sets', [
      new MenuItemBuilder('Both Roasts Box')
        .withVariation('Box', 2200)
        .withCompareAt(2400)
        .build(),
    ])
    .build();
}

/**
 * Prices for the drink studio, in the shape GET /api/prices serves.
 *
 * The board itself is no longer test data — what the café sells, and every
 * photograph of it, ships in features/menu/drinks. So a fixture's only job now
 * is to answer "what does this cost", and the item names below are the join
 * key: they must match the `square` field of the real catalog entries or the
 * drink renders with its price withheld, which is exactly what production does.
 */
export function priceBookFixture(): PriceBook {
  const menu = new MenuBuilder()
    .withCategory('Classics', [
      new MenuItemBuilder('Flat White')
        .withVariation('Hot', 380)
        .withVariation('Iced', 480)
        .withModifierGroup('Milk', [['Whole', 0], ['Oat', 0]], { required: true, max: 1 })
        .build(),
      new MenuItemBuilder('Latte')
        .withVariation('Hot', 400)
        .withVariation('Iced', 500)
        .withModifierGroup('Milk', [['Whole', 0], ['Oat', 0], ['Almond', 0]], {
          required: true,
          max: 1,
        })
        .withModifierGroup('Syrup', [['Caramel', 50], ['Vanilla', 50]], { max: 3 })
        .build(),
      new MenuItemBuilder('Cortado').withVariation('Hot', 300).withVariation('Iced', 400).build(),
      new MenuItemBuilder('Espresso').withVariation('Regular', 200).build(),
      new MenuItemBuilder('Mocha').withVariation('Hot', 450).soldOut().build(),
    ])
    .withCategory('Speciality', [
      new MenuItemBuilder('Matcha Latte')
        .withVariation('Hot', 550)
        .withVariation('Iced', 650)
        .withModifierGroup('Milk', [['Whole', 0], ['Oat', 0]], { required: true, max: 1 })
        .withModifierGroup('Puree', [['Strawberry', 100], ['Mango', 100]], { max: 2 })
        .build(),
    ])
    .withCategory('Smoothies', [
      new MenuItemBuilder('Tropical')
        .withVariation('Sit In', 650)
        .withVariation('Takeaway', 650)
        .build(),
    ])
    .withCategory('Cold Drinks', [
      new MenuItemBuilder('Water').withVariation('Still', 200).withVariation('Sparkling', 200).build(),
    ])
    .withCategory('Bakery', [new MenuItemBuilder('Croissant').withVariation('Regular', 270).build()])
    .build();

  return toPriceBook(menu, '2026-08-19');
}
