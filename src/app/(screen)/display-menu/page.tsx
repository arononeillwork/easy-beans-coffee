import { DisplayBoard } from '@/features/menu/display/DisplayBoard';
import { getOrderingHours } from '@/server/places/orderingHours';
import { getDisplayPriceBook } from '@/server/square/displayPrices';
import { getCafeTimezone } from '@/server/env';

/**
 * The in-café menu board (portrait TV / monitor). Open
 * easybeanscoffee.com/display-menu on the display's browser and leave it:
 * the page cycles through the board's sections and keeps its own prices and
 * opening hours current — see DisplayBoard for the cadence.
 */
export const revalidate = 3600;

export default async function DisplayMenuPage() {
  const [book, { hours }] = await Promise.all([getDisplayPriceBook(), getOrderingHours()]);
  return <DisplayBoard initialBook={book} initialHours={hours} timezone={getCafeTimezone()} />;
}
