import type { RetailCollectionSlug } from '@/features/order/types';

/**
 * Collection photography.
 *
 * These stand in for per-product packaging shots, which do not exist yet —
 * once a product has its own image in Square, that wins automatically (see
 * ProductImage). `undefined` is a valid answer: it means we have no *honest*
 * photo for that collection, and the brand-tint panel is used instead of
 * pretending a drink shot is a bag of beans.
 *
 * Approved shots live in Drive under Content/Images/New. To light one of these
 * up: drop the master into `media-src/`, run `npm run optimize:media`, then
 * point the entry below at the generated `.webp`. Masters stay out of
 * `public/` so the multi-megabyte originals are never served.
 *   coffee_beans.jpg              -> media-src/coffee-beans.jpg
 *   coffee_station.jpg            -> media-src/coffee-station.jpg
 *   coffee_machine_barista_facing -> media-src/coffee-machine-barista.jpg
 *   coffee_with_milk_pouring.jpg  -> media-src/coffee-with-milk-pouring.jpg
 *   Syrups                        -> media-src/syrups.jpg
 *   Ube Mixing                    -> media-src/ube-mixing.jpg
 */
/**
 * Product-card fallback. Deliberately empty until packaging shots exist: a
 * card is a claim about the product, and a photo of a drink on a chai pouch
 * is a lie. The brand panel is used instead.
 */
export const COLLECTION_PHOTO: Record<RetailCollectionSlug, string | undefined> = {
  beans: undefined,
  'matcha-chai': undefined,
  'gift-sets': undefined,
};

/**
 * Collection tile and header art. These are mood, not product claims, so a
 * café shot is fair — but it still has to be the right drink for the
 * collection it sits above.
 */
export const COLLECTION_HERO: Record<RetailCollectionSlug, string | undefined> = {
  beans: undefined,
  'matcha-chai': '/media/strawberry-matcha-can.webp',
  'gift-sets': '/media/iced-can-hand.webp',
};
