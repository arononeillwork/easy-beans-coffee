import type { PublicOrderStatus } from '@/features/order/types';

/**
 * Maps stored Square-derived states to the customer-facing status.
 * payment_status: PENDING | PAID | FAILED | CANCELED
 * fulfillment_status: NEW | PROPOSED | RESERVED | PREPARED | COMPLETED | CANCELED
 */
export function derivePublicStatus(
  paymentStatus: string,
  fulfillmentStatus: string,
): PublicOrderStatus {
  if (paymentStatus === 'FAILED') return 'failed';
  if (paymentStatus === 'CANCELED' || fulfillmentStatus === 'CANCELED') return 'cancelled';
  if (paymentStatus !== 'PAID') return 'awaiting_payment';

  switch (fulfillmentStatus) {
    case 'PREPARED':
      return 'ready';
    case 'COMPLETED':
      return 'collected';
    case 'RESERVED':
      return 'preparing';
    default:
      return 'confirmed';
  }
}

/** Past this, an unfinished order is history — stop asking Square about it. */
export const LIVE_SYNC_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Whether the status endpoint should re-read Square: while the order can still
 * change — awaiting payment, or paid and not yet collected/cancelled. This is
 * what moves the customer's page to "ready" the moment staff mark it on the
 * till, with or without the Square webhook configured.
 */
export function shouldSyncFromSquare(
  paymentStatus: string,
  fulfillmentStatus: string,
  createdAt: string,
  nowMs: number,
): boolean {
  if (nowMs - Date.parse(createdAt) > LIVE_SYNC_WINDOW_MS) return false;
  if (paymentStatus === 'PENDING') return true;
  if (paymentStatus !== 'PAID') return false;
  return fulfillmentStatus !== 'COMPLETED' && fulfillmentStatus !== 'CANCELED';
}
