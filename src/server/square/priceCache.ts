import 'server-only';
import { cafeDay, toPriceBook, EMPTY_PRICE_BOOK, type PriceBook } from '@/features/menu/priceBook';
import { getCafeTimezone } from '../env';
import { fetchAndNormalizeCatalog } from './catalog';

/**
 * The menu's daily price snapshot.
 *
 * The drinks board is now local — names, photography, option copy and layout
 * all ship with the site — so the only reason to call Square when someone opens
 * the menu is to find out what things cost. Prices at a café change on the
 * order of a few times a year, so re-reading them per visit, or even every five
 * minutes as the old catalog cache did, buys nothing and puts a third-party
 * round trip in front of the page.
 *
 * So: one read per café day. The snapshot turns over when Madrid does, not on a
 * rolling 24h timer, because that is when a price change would actually be made
 * — and it means every customer on a given day is quoted the same number.
 *
 * This is a browse-time cache only. {@link getCatalogForCheckout} still reads
 * near-live prices when money changes hands, so a mid-day price change is
 * honoured at the till even while the board shows the morning's snapshot.
 */

/**
 * Hard ceiling under the day rule, for the long-running instance that would
 * otherwise sit on one snapshot through a deploy-free week. Belt and braces:
 * the day check below is the one that normally fires.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Next's data cache window for the underlying Square fetch. An uncached fetch
 * inside a statically generated route strips that route's `revalidate`, so this
 * is load-bearing for prerendering as well as for the cache itself — see the
 * same note in ./catalogCache.
 */
const REVALIDATE_SECONDS = 60 * 60;

let cached: { book: PriceBook; fetchedAtMs: number } | null = null;
let inflight: Promise<PriceBook> | null = null;
let reported = false;

function isFresh(entry: { book: PriceBook; fetchedAtMs: number }, nowMs: number, day: string) {
  return entry.book.day === day && nowMs - entry.fetchedAtMs <= MAX_AGE_MS;
}

/**
 * Today's prices, read from Square at most once per café day.
 *
 * On failure the last good snapshot is served with `stale: true` rather than an
 * error — a menu with yesterday's prices is a working menu, and the checkout
 * path re-validates against live Square anyway. Only a cold instance that has
 * never reached Square returns an empty book, and the studio renders that with
 * the prices withheld.
 */
export async function getPriceBook(): Promise<PriceBook> {
  const nowMs = Date.now();
  const day = cafeDay(nowMs, getCafeTimezone());

  if (cached && isFresh(cached, nowMs, day)) return cached.book;

  if (!inflight) {
    inflight = fetchAndNormalizeCatalog({ revalidateSeconds: REVALIDATE_SECONDS })
      .then((menu) => {
        const book = toPriceBook(menu, day);
        cached = { book, fetchedAtMs: Date.now() };
        return book;
      })
      .finally(() => {
        inflight = null;
      });
  }

  try {
    return await inflight;
  } catch (err) {
    if (cached) return { ...cached.book, stale: true };
    // Once per process, not once per request: an unconfigured Square is a
    // normal state in development and under test, and the board renders anyway.
    if (!reported) {
      reported = true;
      console.warn(
        'Square prices unavailable — the menu will render without them.',
        err instanceof Error ? err.message : err,
      );
    }
    return EMPTY_PRICE_BOOK;
  }
}

/**
 * Price book for pages that must prerender whether or not Square is configured.
 * Never throws — an unreachable Square yields an empty book and the page ships
 * with the board intact and the numbers absent.
 */
export async function getPriceBookOrEmpty(): Promise<PriceBook> {
  try {
    return await getPriceBook();
  } catch {
    return EMPTY_PRICE_BOOK;
  }
}

export function invalidatePriceBook(): void {
  cached = null;
  reported = false;
}
