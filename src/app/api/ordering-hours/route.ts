import { NextResponse } from 'next/server';
import { getOrderingHours } from '@/server/places/orderingHours';
import { ORDER_CUTOFF_MIN } from '@/features/order/lib/pickupTimes';

/**
 * The weekly schedule the cart uses to show "open / closed for online orders"
 * before anyone types their name. Checkout re-checks the same schedule on the
 * server, so this is a convenience, never the gate.
 */
export const revalidate = 300;

export async function GET() {
  const { hours, source } = await getOrderingHours();
  return NextResponse.json({ hours, cutoffMinutes: ORDER_CUTOFF_MIN, source });
}
