import 'server-only';
import { getSquareClient } from '../square/client';
import { markOfferRedeemed } from '../leads/leadRepo';
import { getOrderBySquareOrderId, updateOrderBySquareOrderId } from './orderRepo';

export interface SyncedState {
  paymentStatus: string;
  fulfillmentStatus: string;
  squarePaymentId: string | null;
}

/**
 * Records the subscriber code's first use, and only once money has actually
 * moved — an abandoned checkout is not a use. The code itself stays good for
 * its 6-month window. Safe to re-run: markOfferRedeemed only matches a row
 * with no first use recorded, so later orders and replayed webhooks are
 * no-ops. Never throws; a bookkeeping failure must not roll back a paid
 * order's status.
 */
async function burnOfferCode(squareOrderId: string): Promise<void> {
  try {
    const order = await getOrderBySquareOrderId(squareOrderId);
    if (!order?.offer_code) return;
    await markOfferRedeemed(order.offer_code, order.id);
  } catch (err) {
    console.error('offer redemption bookkeeping failed', { squareOrderId, err });
  }
}

/**
 * Fetches the authoritative order from Square and persists derived state.
 * Used by the webhook handler and as the status-endpoint fallback so a
 * missed/late webhook can never strand an order in "awaiting payment".
 */
export async function syncOrderFromSquare(squareOrderId: string): Promise<SyncedState> {
  const client = getSquareClient();
  const response = await client.orders.get({ orderId: squareOrderId });
  const order = response.order;
  if (!order) throw new Error(`Square order ${squareOrderId} not found`);

  const tender = order.tenders?.[0];
  let paymentStatus = 'PENDING';
  if (order.state === 'CANCELED') {
    paymentStatus = 'CANCELED';
  } else if (tender) {
    paymentStatus = 'PAID';
  }

  const fulfillment = order.fulfillments?.[0];
  const fulfillmentStatus = fulfillment?.state ?? 'NEW';

  const squarePaymentId = tender?.paymentId ?? tender?.id ?? null;

  await updateOrderBySquareOrderId(squareOrderId, {
    payment_status: paymentStatus,
    fulfillment_status: fulfillmentStatus,
    square_payment_id: squarePaymentId,
  });

  if (paymentStatus === 'PAID') {
    await burnOfferCode(squareOrderId);
  }

  return { paymentStatus, fulfillmentStatus, squarePaymentId };
}
