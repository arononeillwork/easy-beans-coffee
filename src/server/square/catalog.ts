import 'server-only';
import type { Square } from 'square';
import type {
  MenuCategory,
  MenuItem,
  MenuModifierGroup,
  MenuResponse,
  MenuVariation,
} from '@/features/order/types';
import { retailSlugForCategory, slugify } from '@/features/shop/retail';
import { getSquareEnv } from '../env';
import { excludeRules, isExcludedName } from './catalogFilters';
import { listCatalogObjects, type ListOptions } from './catalogHttp';

/**
 * Fetches the full Square catalog and normalizes it into the menu shape the
 * frontend consumes. Square is the single source of truth — names, prices,
 * modifiers, categories and sold-out state all come from here. bigint money
 * amounts are converted to number cents at this boundary and nowhere else.
 *
 * The listing goes over plain HTTP rather than the SDK (see ./catalogHttp) so
 * that /menu, which prerenders from this, does not drag an 11 MB dependency
 * into its server graph. `Square` here is a type-only import and compiles away.
 */
export async function fetchAndNormalizeCatalog(
  options: ListOptions = {},
): Promise<MenuResponse> {
  const objects = await listCatalogObjects(options);
  return normalizeCatalog(objects, getSquareEnv().locationId);
}

export function normalizeCatalog(
  objects: Square.CatalogObject[],
  locationId: string,
): MenuResponse {
  const categories = new Map<string, { name: string; sortOrder: number }>();
  const excludedCategoryIds = new Set<string>();
  const images = new Map<string, string>();
  const modifierGroups = new Map<string, MenuModifierGroup>();
  const items: Array<{ categoryId: string | undefined; item: MenuItem }> = [];

  // Names matching these are treated as if they were not in the catalog at all
  // (staff test entries and the like) — see catalogFilters.
  const excluded = excludeRules();

  let categoryIndex = 0;
  for (const obj of objects) {
    if (!obj.id) continue;
    if (obj.type === 'CATEGORY' && obj.categoryData?.name) {
      if (isExcludedName(obj.categoryData.name, excluded)) {
        excludedCategoryIds.add(obj.id);
        continue;
      }
      categories.set(obj.id, { name: obj.categoryData.name, sortOrder: categoryIndex++ });
    } else if (obj.type === 'IMAGE' && obj.imageData?.url) {
      images.set(obj.id, obj.imageData.url);
    } else if (obj.type === 'MODIFIER_LIST' && obj.modifierListData) {
      const data = obj.modifierListData;
      if (isExcludedName(data.name ?? '', excluded)) continue;
      modifierGroups.set(obj.id, {
        id: obj.id,
        name: data.name ?? '',
        // min/max are refined per item below via modifierListInfo.
        required: false,
        minSelected: 0,
        maxSelected: 99,
        modifiers: (data.modifiers ?? []).flatMap((m) => {
          if (m.type !== 'MODIFIER' || m.isDeleted || !m.id || !m.modifierData?.name) return [];
          if (isExcludedName(m.modifierData.name, excluded)) return [];
          return [
            {
              id: m.id,
              name: m.modifierData.name,
              priceCents: moneyToCents(m.modifierData.priceMoney),
            },
          ];
        }),
      });
    }
  }

  for (const obj of objects) {
    if (obj.type !== 'ITEM' || !obj.id || !obj.itemData || obj.isDeleted) continue;
    if (!presentAtLocation(obj, locationId)) continue;
    const data = obj.itemData;
    if (data.isArchived) continue;
    if (isExcludedName(data.name ?? '', excluded)) continue;

    const categoryId = data.categories?.[0]?.id ?? data.reportingCategory?.id ?? undefined;
    // An item in an excluded category goes with it rather than falling through
    // to "Extras", which would put test entries back on the menu.
    if (categoryId && excludedCategoryIds.has(categoryId)) continue;

    const variations: MenuVariation[] = [];
    let allSoldOut = true;
    for (const variation of data.variations ?? []) {
      const vData = variation.type === 'ITEM_VARIATION' ? variation.itemVariationData : undefined;
      if (!vData || !variation.id || variation.isDeleted || !presentAtLocation(variation, locationId)) continue;
      if (isExcludedName(vData.name ?? '', excluded)) continue;
      const soldOut = vData.locationOverrides?.some(
        (o) => o.locationId === locationId && o.soldOut === true,
      );
      if (!soldOut) allSoldOut = false;
      variations.push({
        id: variation.id,
        name: vData.name ?? '',
        priceCents: moneyToCents(vData.priceMoney),
        currency: vData.priceMoney?.currency ?? 'EUR',
      });
    }
    if (variations.length === 0) continue;

    const groups: MenuModifierGroup[] = [];
    for (const info of data.modifierListInfo ?? []) {
      if (info.enabled === false) continue;
      const group = modifierGroups.get(info.modifierListId);
      if (!group || group.modifiers.length === 0) continue;
      const min = info.minSelectedModifiers ?? 0;
      const rawMax = info.maxSelectedModifiers ?? -1;
      groups.push({
        ...group,
        minSelected: Math.max(0, min),
        maxSelected: rawMax > 0 ? rawMax : 99,
        required: min > 0,
      });
    }

    const categoryName = categoryId ? categories.get(categoryId)?.name : undefined;
    const retailSlug = categoryName ? retailSlugForCategory(categoryName) : undefined;
    const name = data.name ?? '';

    items.push({
      categoryId,
      item: {
        id: obj.id,
        name,
        description: data.description ?? undefined,
        imageUrl: data.imageIds?.length ? images.get(data.imageIds[0]) : undefined,
        soldOut: allSoldOut,
        variations,
        modifierGroups: groups,
        kind: retailSlug ? 'retail' : 'drink',
        slug: retailSlug ? slugify(name) : undefined,
        badge: retailSlug ? readBadge(obj) : undefined,
        compareAtCents: retailSlug ? readCompareAt(obj) : undefined,
      },
    });
  }

  const grouped = new Map<string, MenuCategory>();
  const uncategorized: MenuItem[] = [];
  for (const { categoryId, item } of items) {
    const category = categoryId ? categories.get(categoryId) : undefined;
    if (!categoryId || !category) {
      uncategorized.push(item);
      continue;
    }
    const existing = grouped.get(categoryId);
    if (existing) {
      existing.items.push(item);
    } else {
      const retailSlug = retailSlugForCategory(category.name);
      grouped.set(categoryId, {
        id: categoryId,
        name: category.name,
        sortOrder: category.sortOrder,
        items: [item],
        kind: retailSlug ? 'retail' : 'drink',
        retailSlug,
      });
    }
  }

  const result = [...grouped.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  if (uncategorized.length > 0) {
    result.push({
      id: 'other',
      name: 'Extras',
      sortOrder: result.length,
      items: uncategorized,
      kind: 'drink',
    });
  }

  return {
    categories: result,
    locationId,
    currency: 'EUR',
    fetchedAt: new Date().toISOString(),
  };
}

const BADGES = new Set(['new', 'limited', 'pick']);

/**
 * Square keys custom attributes as `<application_id>:<key>`, so match on the
 * suffix. Absent or unrecognised values simply mean "no badge" — merchandising
 * is optional and must never break the catalog.
 */
function readCustomAttribute(obj: Square.CatalogObject, key: string): string | undefined {
  const values = obj.customAttributeValues;
  if (!values) return undefined;
  for (const [attrKey, value] of Object.entries(values)) {
    if (attrKey === key || attrKey.endsWith(`:${key}`)) {
      return value.stringValue ?? value.selectionUidValues?.[0] ?? undefined;
    }
  }
  return undefined;
}

function readBadge(obj: Square.CatalogObject): MenuItem['badge'] {
  const raw = readCustomAttribute(obj, 'ebc_badge')?.toLowerCase().trim();
  return raw && BADGES.has(raw) ? (raw as MenuItem['badge']) : undefined;
}

/** Was-price in euros or cents; anything unparseable is ignored. */
function readCompareAt(obj: Square.CatalogObject): number | undefined {
  const raw = readCustomAttribute(obj, 'ebc_compare_at');
  if (!raw) return undefined;
  const parsed = Number(raw.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  // A value with a decimal point is euros; a whole number is already cents.
  return raw.includes('.') || raw.includes(',') ? Math.round(parsed * 100) : Math.round(parsed);
}

function moneyToCents(money: Square.Money | null | undefined): number {
  if (money?.amount === undefined || money.amount === null) return 0;
  return Number(money.amount);
}

function presentAtLocation(
  obj: { presentAtAllLocations?: boolean | null; presentAtLocationIds?: string[] | null },
  locationId: string,
): boolean {
  if (obj.presentAtAllLocations === false) {
    return obj.presentAtLocationIds?.includes(locationId) ?? false;
  }
  return true;
}
