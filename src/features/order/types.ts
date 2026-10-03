/**
 * Shared types for the ordering module. The Square catalog is the single
 * source of truth — these are the normalized shapes served by GET /api/menu.
 * All money values are integer cents (EUR); client-held prices are display
 * snapshots only and the server re-validates everything at checkout.
 */

export interface MenuModifier {
  id: string;
  name: string;
  priceCents: number;
}

export interface MenuModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelected: number;
  /** 0 or negative means "no upper limit" in Square; normalized to Infinity-safe 99. */
  maxSelected: number;
  modifiers: MenuModifier[];
}

export interface MenuVariation {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
}

/**
 * Drinks are made to order at the counter; retail is packaged goods taken
 * home. Both are Square catalog items and both check out through the same
 * PICKUP flow — the split only drives which surface shows them and whether
 * drink prep time gates the collection slot.
 */
export type ItemKind = 'drink' | 'retail';

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  soldOut: boolean;
  variations: MenuVariation[];
  modifierGroups: MenuModifierGroup[];
  kind: ItemKind;
  /** URL-safe name, used for /shop/[handle]. Retail items only. */
  slug?: string;
  /** Optional merchandising tag from the Square custom attribute `ebc_badge`. */
  badge?: 'new' | 'limited' | 'pick';
  /** Was-price for bundles, from the Square custom attribute `ebc_compare_at`. */
  compareAtCents?: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
  kind: ItemKind;
  /** Stable slug for retail collections, used for /shop/[category]. */
  retailSlug?: RetailCollectionSlug;
}

/** The three retail collections the shop is built around. */
export type RetailCollectionSlug = 'beans' | 'matcha-chai' | 'gift-sets';

export interface MenuResponse {
  categories: MenuCategory[];
  locationId: string;
  currency: string;
  fetchedAt: string;
}

export interface CartLine {
  /** Client-generated UUID for list identity. */
  lineId: string;
  itemId: string;
  itemName: string;
  variationId: string;
  variationName: string;
  modifierIds: string[];
  modifierNames: string[];
  quantity: number;
  /** Display snapshot; server recomputes from live catalog. */
  unitPriceCents: number;
  /** Absent on carts stored before the shop existed — treat as 'drink'. */
  kind?: ItemKind;
  /**
   * What the counter needs told that the Square line cannot say on its own —
   * currently the vessel ("takeaway cup", "in a can"), which is a real choice
   * on the menu but not a priced variation for most drinks. Reaches Square as
   * the line item's own note, so it prints on the ticket next to the drink.
   */
  note?: string;
  /** Square photo for the cart thumbnail; absent for items with no shot. */
  imageUrl?: string;
}

export type PickupType = 'ASAP' | 'SCHEDULED';

export interface CheckoutRequestBody {
  lines: Array<{
    variationId: string;
    quantity: number;
    modifierIds: string[];
    note?: string;
  }>;
  pickup: {
    type: PickupType;
    /** ISO datetime, required when type === 'SCHEDULED'. */
    at?: string;
  };
  customer: {
    name: string;
    email?: string;
    note?: string;
  };
  lang: 'en' | 'es';
}

export interface CheckoutResponseBody {
  checkoutUrl: string;
  token: string;
}

export type PublicOrderStatus =
  | 'awaiting_payment'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'collected'
  | 'cancelled'
  | 'failed';

export interface OrderStatusResponse {
  status: PublicOrderStatus;
  orderNumber: string | null;
  customerName: string;
  totalCents: number;
  currency: string;
  estimatedPickupAt: string | null;
  updatedAt: string;
}
