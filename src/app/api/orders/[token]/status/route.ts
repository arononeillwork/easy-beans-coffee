import { NextResponse } from 'next/server';
import type { OrderStatusResponse } from '@/features/order/types';
import { getOrderByToken } from '@/server/orders/orderRepo';
import { derivePublicStatus } from '@/server/orders/statusMapping';
import { syncOrderFromSquare } from '@/server/orders/orderSync';

export const dynamic = 'force-dynamic';

/** Past this, an unfinished order is history — stop asking Square about it. */
const LIVE_SYNC_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Re-read Square while the order can still change: awaiting payment, or paid
 * and not yet collected/cancelled. This is what moves the customer's page to
 * "ready" the moment staff mark it on the till, with or without the Square
 * webhook configured (the webhook, when set up, just gets there first).
 */
function shouldSyncFromSquare(paymentStatus: string, fulfillmentStatus: string, createdAt: string): boolean {
  if (Date.now() - Date.parse(createdAt) > LIVE_SYNC_WINDOW_MS) return false;
  if (paymentStatus === 'PENDING') return true;
  if (paymentStatus !== 'PAID') return false;
  return fulfillmentStatus !== 'COMPLETED' && fulfillmentStatus !== 'CANCELED';
}

/**
 * Public order status, keyed only by the unguessable token. While the order is
 * still live it re-checks Square directly (see shouldSyncFromSquare), so the
 * page tracks payment, "ready" and "collected" without depending on the
 * redirect or on a webhook.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const order = await getOrderByToken(token).catch(() => null);
  if (!order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let paymentStatus = order.payment_status;
  let fulfillmentStatus = order.fulfillment_status;

  if (shouldSyncFromSquare(paymentStatus, fulfillmentStatus, order.created_at) && order.square_order_id) {
    try {
      const synced = await syncOrderFromSquare(order.square_order_id);
      paymentStatus = synced.paymentStatus;
      fulfillmentStatus = synced.fulfillmentStatus;
    } catch (err) {
      console.warn('status sync failed', (err as Error).message);
    }
  }

  const body: OrderStatusResponse = {
    status: derivePublicStatus(paymentStatus, fulfillmentStatus),
    orderNumber: order.square_order_id ? order.square_order_id.slice(-6).toUpperCase() : null,
    customerName: order.customer_name,
    totalCents: order.total_amount,
    currency: order.currency,
    estimatedPickupAt: order.estimated_pickup_at,
    updatedAt: order.updated_at,
  };

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
