import { NextResponse } from 'next/server';
import type { OrderStatusResponse } from '@/features/order/types';
import { getOrderByToken } from '@/server/orders/orderRepo';
import { derivePublicStatus } from '@/server/orders/statusMapping';
import { syncOrderFromSquare } from '@/server/orders/orderSync';

export const dynamic = 'force-dynamic';

/**
 * Public order status, keyed only by the unguessable token. While payment is
 * pending it re-checks Square directly, so the confirmation page never
 * depends on the redirect (or a delayed webhook) to learn about payment.
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

  if (paymentStatus === 'PENDING' && order.square_order_id) {
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
