import 'server-only';
import { cafeDay, toPriceBook, EMPTY_PRICE_BOOK, type PriceBook } from '@/features/menu/priceBook';
import { getCafeTimezone } from '../env';
import { getCatalog } from './catalogCache';

/**
 * Prices for the in-café display, read from Square at most once an hour.
 *
 * The customer-facing menu quotes one number all day (see ./priceCache); the
 * display behind the counter is the café's own board and follows the till more
 * closely — a price corrected in Square mid-morning is on the wall within the
 * hour. The screen itself asks only during opening hours, so a closed café
 * costs Square nothing overnight.
 *
 * Never throws: an unreachable Square serves the last good snapshot, and only
 * a cold instance that has never reached Square shows the board with prices
 * withheld — same contract as the menu.
 */
const MAX_AGE_MS = 60 * 60 * 1000;

export async function getDisplayPriceBook(): Promise<PriceBook> {
  const day = cafeDay(Date.now(), getCafeTimezone());
  try {
    const menu = await getCatalog({
      maxAgeMs: MAX_AGE_MS,
      revalidateSeconds: MAX_AGE_MS / 1000,
    });
    return toPriceBook(menu, day);
  } catch {
    return EMPTY_PRICE_BOOK;
  }
}
