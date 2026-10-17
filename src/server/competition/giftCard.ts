import 'server-only';
import { getLocationId, getSquareClient } from '../square/client';

/** Prize value in cents (default €10). */
export function prizeCents(): number {
  const n = Number(process.env.COMPETITION_PRIZE_CENTS);
  return Number.isInteger(n) && n > 0 ? n : 1000;
}

/** How long a prize card can be used for (default 6 months). */
export function cardValidMonths(): number {
  const n = Number(process.env.COMPETITION_CARD_VALID_MONTHS);
  return Number.isInteger(n) && n > 0 ? n : 6;
}

/** End of the validity day, `cardValidMonths()` after `from` (Madrid evening ≈ 22:00 UTC). */
export function cardExpiry(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + cardValidMonths());
  d.setUTCHours(21, 59, 0, 0);
  return d;
}

/**
 * Square gift cards have no expiry of their own, so an expired prize card is
 * closed by clearing whatever is left on it. Returns the cents cleared.
 */
export async function clearPrizeCard(giftCardId: string): Promise<number> {
  const client = getSquareClient();
  const { giftCard } = await client.giftCards.get({ id: giftCardId });
  const left = Number(giftCard?.balanceMoney?.amount ?? 0);
  if (left <= 0) return 0;
  await client.giftCards.activities.create({
    idempotencyKey: `ebc-comp-clear-${giftCardId}`,
    giftCardActivity: {
      type: 'CLEAR_BALANCE',
      locationId: getLocationId(),
      giftCardId,
      clearBalanceActivityDetails: { reason: 'UNKNOWN_REASON' },
    },
  });
  return left;
}

export interface IssuedCard {
  id: string;
  gan: string;
}

/**
 * Creates a Square digital gift card and loads it with the prize. Square
 * itself sends nothing when a card is made through the API — the card number
 * goes to the winner in our own email.
 *
 * Idempotent per draw: the keys are derived from the draw and the winning
 * entry, so a retry after a timeout reuses the same card rather than minting a
 * second one. `existingId` resumes a card that was created but not activated.
 */
export async function issuePrizeCard(drawMonth: string, entryId: string, existing?: IssuedCard | null): Promise<IssuedCard> {
  const client = getSquareClient();
  const locationId = getLocationId();
  const key = `ebc-comp-${drawMonth}-${entryId}`;

  let card = existing ?? null;
  if (!card) {
    const created = await client.giftCards.create({
      idempotencyKey: key,
      locationId,
      giftCard: { type: 'DIGITAL' },
    });
    const gc = created.giftCard;
    if (!gc?.id || !gc.gan) throw new Error('Square returned no gift card');
    card = { id: gc.id, gan: gc.gan };
    // Already active (a retried request that had activated before): done.
    if (gc.state === 'ACTIVE') return card;
  }

  await client.giftCards.activities.create({
    idempotencyKey: `${key}-activate`,
    giftCardActivity: {
      type: 'ACTIVATE',
      locationId,
      giftCardId: card.id,
      activateActivityDetails: {
        amountMoney: { amount: BigInt(prizeCents()), currency: 'EUR' },
        referenceId: `competition-${drawMonth}`,
        // No real payment is behind a prize card; Square accepts a custom
        // marker here for cards loaded outside a sale.
        buyerPaymentInstrumentIds: ['competition-prize'],
      },
    },
  });
  return card;
}
