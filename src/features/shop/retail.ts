import type {
  MenuCategory,
  MenuItem,
  MenuResponse,
  RetailCollectionSlug,
} from '@/features/order/types';
import { MOCK_RETAIL_CATEGORIES } from './mockCatalog';

/**
 * Which Square categories are shop stock rather than counter drinks.
 *
 * Square has no notion of a retail flag, so the category *name* is the
 * contract: rename a category in Square and it moves between /menu and /shop.
 * Matching is accent- and case-insensitive so "Café en grano" and "Coffee
 * beans" both land on `beans`.
 */
const RETAIL_CATEGORY_NAMES: Record<RetailCollectionSlug, string[]> = {
  beans: ['coffee beans', 'beans', 'cafe en grano', 'café en grano', 'grano'],
  'matcha-chai': ['matcha & chai', 'matcha and chai', 'matcha y chai', 'matcha', 'chai'],
  'gift-sets': ['gift sets', 'gift set', 'bundles', 'sets de regalo', 'regalo'],
};

/** Display order of the collections on /shop. */
export const RETAIL_COLLECTIONS: RetailCollectionSlug[] = ['beans', 'matcha-chai', 'gift-sets'];

/** Case-, accent- and whitespace-insensitive form used for all name matching. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Resolves a Square category name to a retail collection, or undefined for drinks. */
export function retailSlugForCategory(name: string): RetailCollectionSlug | undefined {
  const needle = normalizeName(name);
  for (const slug of RETAIL_COLLECTIONS) {
    if (RETAIL_CATEGORY_NAMES[slug].some((candidate) => normalizeName(candidate) === needle)) {
      return slug;
    }
  }
  return undefined;
}

/** URL-safe handle derived from an item name, e.g. "Oro Fino · Dark" → "oro-fino-dark". */
export function slugify(name: string): string {
  return (
    normalizeName(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

/**
 * The collections the shop should render, and whether they are real.
 *
 * Square stays the single source of truth: if the catalog contains any retail
 * category, that is what ships and placeholders are never consulted.
 *
 * Placeholders cover the two states where there is nothing real to show — the
 * catalog has no retail items yet, or it could not be reached at all (no
 * credentials configured, Square down). Both are flagged in the UI as a
 * preview with ordering disabled, so an empty shop is never mistaken for a
 * shop that is genuinely open for business.
 */
export function shopCollections(menu: MenuResponse | null): {
  categories: MenuCategory[];
  isPlaceholder: boolean;
} {
  const live = menu ? retailCategories(menu) : [];
  if (live.length > 0) return { categories: live, isPlaceholder: false };
  return { categories: MOCK_RETAIL_CATEGORIES, isPlaceholder: true };
}

export function retailCategories(menu: MenuResponse): MenuCategory[] {
  const bySlug = new Map<RetailCollectionSlug, MenuCategory>();
  for (const category of menu.categories) {
    if (category.kind !== 'retail' || !category.retailSlug) continue;
    // Two Square categories can map to one collection (e.g. Matcha and Chai
    // kept separate in the POS); merge rather than showing duplicates.
    const existing = bySlug.get(category.retailSlug);
    if (existing) {
      existing.items = [...existing.items, ...category.items];
    } else {
      bySlug.set(category.retailSlug, { ...category, items: [...category.items] });
    }
  }
  return RETAIL_COLLECTIONS.flatMap((slug) => {
    const category = bySlug.get(slug);
    return category ? [category] : [];
  });
}

export function drinkCategories(menu: MenuResponse): MenuCategory[] {
  return menu.categories.filter((category) => category.kind === 'drink');
}

export function allRetailItems(menu: MenuResponse): MenuItem[] {
  return retailCategories(menu).flatMap((category) => category.items);
}

export function findRetailItem(menu: MenuResponse, slug: string): MenuItem | undefined {
  return allRetailItems(menu).find((item) => item.slug === slug);
}

/** Lowest variation price, for the "from €x" line on a product card. */
export function lowestPriceCents(item: MenuItem): number {
  return item.variations.reduce(
    (min, variation) => Math.min(min, variation.priceCents),
    Number.POSITIVE_INFINITY,
  );
}
