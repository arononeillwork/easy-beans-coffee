import 'server-only';
import { cafeDay, toPriceBook, EMPTY_PRICE_BOOK, type PriceBook } from '@/features/menu/priceBook';
import { getCafeTimezone } from '../env';
import { getCatalog } from './catalogCache';

/**
 * Items and prices for the in-café display, read from Square.
 *
 * The screen asks only once per café day — an hour after opening, when the
 * morning's price edits in Square have actually been made (see
 * features/menu/display/refreshSchedule) — so the snapshot it is handed must
 * be near-live, not an hour stale. The catalog cache's five-minute browse
 * window (shared with /order) is exactly that: the daily read lands within
 * minutes of the till, and Square still sees at most a handful of reads a
 * day.
 *
 * Never throws: an unreachable Square serves the last good snapshot, and only
 * a cold instance that has never reached Square shows the board with prices
 * withheld — same contract as the menu.
 */
const REVALIDATE_SECONDS = 5 * 60;

export async function getDisplayPriceBook(): Promise<PriceBook> {
  const day = cafeDay(Date.now(), getCafeTimezone());
  try {
    const menu = await getCatalog({ revalidateSeconds: REVALIDATE_SECONDS });
    return toPriceBook(menu, day);
  } catch {
    return EMPTY_PRICE_BOOK;
  }
}
