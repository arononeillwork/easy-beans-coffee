import 'server-only';
import { randomUUID, randomBytes } from 'node:crypto';
import type { Square } from 'square';
import type { ItemKind, MenuResponse } from '@/features/order/types';
import type { CheckoutRequest } from '../validation/checkoutSchema';
import { getCafeTimezone, getOfferConfig, getSiteUrl } from '../env';
import { findRedeemableOffer } from '../leads/leadRepo';
import { normaliseOfferCode } from '../leads/offerCode';
import {
  isOpenForAsap,
  validatePickupTime,
  PREP_TIME_MIN,
  RETAIL_PREP_TIME_MIN,
} from '@/features/order/lib/pickupTimes';
import { getLocationId, getSquareClient } from './client';
import { insertOrder } from '../orders/orderRepo';

export class CheckoutError extends Error {
  constructor(public code: 'catalog_mismatch' | 'pickup_invalid' | 'sold_out') {
    super(code);
  }
}

interface ValidatedLine {
  variationId: string;
  quantity: number;
  modifierIds: string[];
  itemName: string;
  variationName: string;
  modifierNames: string[];
  unitPriceCents: number;
  kind: ItemKind;
  /** Passed through untouched: it affects the ticket, never the price. */
  note?: string;
}

/**
 * A cart of packaged goods has nothing to prepare, so it is not held to the
 * drinks prep buffer. One drink in the cart puts the whole order back on the
 * normal timing — the counter makes it to order like any other.
 */
export function prepMinutesFor(lines: ValidatedLine[]): number {
  return lines.every((line) => line.kind === 'retail') ? RETAIL_PREP_TIME_MIN : PREP_TIME_MIN;
}

/**
 * Server-authoritative validation: every id must exist in the live catalog,
 * items must be available, modifier-group min/max must hold, and all prices
 * are recomputed here — client totals are never trusted.
 */
export function validateLines(request: CheckoutRequest, menu: MenuResponse): ValidatedLine[] {
  const byVariation = new Map<
    string,
    { item: MenuResponse['categories'][0]['items'][0]; variation: { id: string; name: string; priceCents: number } }
  >();
  for (const category of menu.categories) {
    for (const item of category.items) {
      for (const variation of item.variations) {
        byVariation.set(variation.id, { item, variation });
      }
    }
  }

  return request.lines.map((line) => {
    const hit = byVariation.get(line.variationId);
    if (!hit) throw new CheckoutError('catalog_mismatch');
    const { item, variation } = hit;
    if (item.soldOut) throw new CheckoutError('sold_out');

    let unitPriceCents = variation.priceCents;
    const modifierNames: string[] = [];
    const countsPerGroup = new Map<string, number>();

    for (const modifierId of line.modifierIds) {
      const group = item.modifierGroups.find((g) => g.modifiers.some((m) => m.id === modifierId));
      if (!group) throw new CheckoutError('catalog_mismatch');
      const modifier = group.modifiers.find((m) => m.id === modifierId);
      if (!modifier) throw new CheckoutError('catalog_mismatch');
      unitPriceCents += modifier.priceCents;
      modifierNames.push(modifier.name);
      countsPerGroup.set(group.id, (countsPerGroup.get(group.id) ?? 0) + 1);
    }

    for (const group of item.modifierGroups) {
      const count = countsPerGroup.get(group.id) ?? 0;
      if (count < group.minSelected || count > group.maxSelected) {
        throw new CheckoutError('catalog_mismatch');
      }
    }

    return {
      variationId: line.variationId,
      quantity: line.quantity,
      modifierIds: line.modifierIds,
      itemName: item.name,
      variationName: variation.name,
      modifierNames,
      unitPriceCents,
      kind: item.kind,
      note: line.note,
    };
  });
}

export function validatePickup(
  request: CheckoutRequest,
  nowMs: number,
  prepMinutes: number = PREP_TIME_MIN,
): void {
  const timezone = getCafeTimezone();
  if (request.pickup.type === 'ASAP') {
    if (!isOpenForAsap(nowMs, timezone, prepMinutes)) throw new CheckoutError('pickup_invalid');
    return;
  }
  if (
    !request.pickup.at ||
    validatePickupTime(request.pickup.at, nowMs, timezone, prepMinutes) !== 'ok'
  ) {
    throw new CheckoutError('pickup_invalid');
  }
}

/**
 * Resolves a subscriber code to a discount, or null.
 *
 * Silent on failure by design: a wrong or expired code drops the discount and
 * the order still goes through, rather than dead-ending someone at checkout
 * over a marketing perk. The code is reusable for its 6-month window; the
 * first use is only recorded once Square confirms payment — see
 * markOfferRedeemed.
 */
async function resolveOffer(
  rawCode: string | undefined,
): Promise<{ code: string; percentage: number } | null> {
  const { redemptionEnabled, percentage } = getOfferConfig();
  if (!rawCode || !redemptionEnabled) return null;

  const offer = await findRedeemableOffer(normaliseOfferCode(rawCode));
  return offer ? { code: offer.code, percentage } : null;
}

/**
 * Creates the itemized Square order + hosted checkout link in one request
 * (Checkout API CreatePaymentLink with a full order — not Quick Pay), stores
 * the local order row, and returns only the hosted checkout URL + token.
 */
export async function createCheckout(
  request: CheckoutRequest,
  lines: ValidatedLine[],
): Promise<{ checkoutUrl: string; token: string }> {
  const client = getSquareClient();
  const locationId = getLocationId();
  const siteUrl = getSiteUrl();

  const token = randomBytes(16).toString('hex');
  const idempotencyKey = randomUUID();
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);

  const offer = await resolveOffer(request.offerCode);
  // Square is the authority on the charged amount; this is our record of it and
  // can differ by a cent on its rounding.
  const totalCents = offer
    ? Math.round((subtotalCents * (100 - offer.percentage)) / 100)
    : subtotalCents;

  const scheduled = request.pickup.type === 'SCHEDULED' && request.pickup.at;
  const pickupDetails: Square.FulfillmentPickupDetails = {
    recipient: {
      displayName: request.customer.name,
      emailAddress: request.customer.email,
    },
    scheduleType: scheduled ? 'SCHEDULED' : 'ASAP',
    ...(scheduled
      ? { pickupAt: request.pickup.at }
      : { prepTimeDuration: `PT${PREP_TIME_MIN}M` }),
    note: request.customer.note,
  };

  const response = await client.checkout.paymentLinks.create({
    idempotencyKey,
    order: {
      locationId,
      referenceId: token.slice(0, 12),
      lineItems: lines.map((line) => ({
        catalogObjectId: line.variationId,
        quantity: String(line.quantity),
        modifiers: line.modifierIds.map((id) => ({ catalogObjectId: id })),
        note: line.note,
      })),
      fulfillments: [{ type: 'PICKUP', pickupDetails }],
      ...(offer
        ? {
            discounts: [
              {
                uid: 'early-customer-offer',
                name: `${offer.percentage}% early customer`,
                percentage: String(offer.percentage),
                scope: 'ORDER' as const,
                type: 'FIXED_PERCENTAGE' as const,
              },
            ],
          }
        : {}),
      metadata: { publicStatusToken: token },
    },
    checkoutOptions: {
      // Locale-prefixed so the customer returns to the language they ordered in.
      redirectUrl: `${siteUrl}/${request.lang}/order/confirmation?token=${token}`,
      askForShippingAddress: false,
      // DELIVERY (coming soon): when enabled, branch fulfillment type here
      // and collect the delivery address before creating the link.
    },
    prePopulatedData: request.customer.email ? { buyerEmail: request.customer.email } : undefined,
  });

  const paymentLink = response.paymentLink;
  if (!paymentLink?.url || !paymentLink.orderId) {
    throw new Error('Square did not return a payment link');
  }

  const estimatedPickupAt = scheduled
    ? request.pickup.at!
    : new Date(Date.now() + PREP_TIME_MIN * 60_000).toISOString();

  await insertOrder({
    public_status_token: token,
    square_order_id: paymentLink.orderId,
    square_payment_id: null,
    square_payment_link_id: paymentLink.id ?? null,
    square_location_id: locationId,
    customer_name: request.customer.name,
    customer_email: request.customer.email ?? null,
    customer_note: request.customer.note ?? null,
    pickup_type: request.pickup.type,
    requested_pickup_at: scheduled ? request.pickup.at! : null,
    estimated_pickup_at: estimatedPickupAt,
    payment_status: 'PENDING',
    fulfillment_status: 'NEW',
    currency: 'EUR',
    total_amount: totalCents,
    order_snapshot: {
      lines: lines.map((l) => ({
        itemName: l.itemName,
        variationName: l.variationName,
        modifierNames: l.modifierNames,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
      })),
      subtotalCents,
      discountPercentage: offer?.percentage ?? 0,
      totalCents,
    },
    offer_code: offer?.code ?? null,
    lang: request.lang,
  });

  return { checkoutUrl: paymentLink.url, token };
}
