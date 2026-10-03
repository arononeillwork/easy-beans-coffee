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
