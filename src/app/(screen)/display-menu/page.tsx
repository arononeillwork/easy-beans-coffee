import { DisplayBoard } from '@/features/menu/display/DisplayBoard';
import { getOrderingHours } from '@/server/places/orderingHours';
import { getDisplayPriceBook } from '@/server/square/displayPrices';
import { getCafeTimezone } from '@/server/env';

/**
 * The in-café menu board (portrait TV / monitor). Open
 * easybeanscoffee.com/display-menu on the display's browser and leave it:
 * one screen carrying the whole board, keeping its own prices and opening
 * hours current — see DisplayBoard for the cadence.
 *
 * Rendered per request, not prerendered: a screen switched on in the morning
 * must start from today's prices, and this page is asked for roughly once per
 * screen per day. The catalog cache keeps Square to a handful of reads.
 */
export const dynamic = 'force-dynamic';

export default async function DisplayMenuPage() {
  const [book, { hours }] = await Promise.all([getDisplayPriceBook(), getOrderingHours()]);
  return <DisplayBoard initialBook={book} initialHours={hours} timezone={getCafeTimezone()} />;
}
