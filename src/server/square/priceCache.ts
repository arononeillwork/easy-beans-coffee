import 'server-only';
import { applyAgentMenu } from '@/features/menu/agentMenu';
import { cafeDay, toPriceBook, EMPTY_PRICE_BOOK, type PriceBook } from '@/features/menu/priceBook';
import { getAgentMenu } from '../businessAgent/menuFeed';
import { getCafeTimezone } from '../env';
import { fetchAndNormalizeCatalog } from './catalog';

/**
 * The menu's price snapshot, and what the Business Agent lists.
 *
 * Two reads, kept apart. The Business Agent says which items are on the menu
 * (server/businessAgent/menuFeed, kept five minutes); Square says what each
 * one costs and gives the ids an order is placed with. The agent reads its own
 * prices from Square, so the two agree; see features/menu/agentMenu for what
 * happens when they briefly don't.
 *
 * Square is read at most every fifteen minutes. It used to be once a café day,
 * when the board was fixed and only a price could change; now an item added or
 * taken off in the agent should reach the site within minutes, and an item the
 * agent lists can only be ordered once Square's snapshot has it.
 *
 * This is a browse-time cache only. {@link getCatalogForCheckout} still reads
 * near-live prices when money changes hands, so a price changed since the last
 * snapshot is honoured at the till.
 */

/** How long one Square snapshot serves; a new café day also turns it over. */
const MAX_AGE_MS = 15 * 60 * 1000;

/**
 * Next's data cache window for the underlying Square fetch. An uncached fetch
 * inside a statically generated route strips that route's `revalidate`, so this
 * is load-bearing for prerendering as well as for the cache itself — see the
 * same note in ./catalogCache.
 */
const REVALIDATE_SECONDS = 15 * 60;

let cached: { book: PriceBook; fetchedAtMs: number } | null = null;
let inflight: Promise<PriceBook> | null = null;
let reported = false;

function isFresh(entry: { book: PriceBook; fetchedAtMs: number }, nowMs: number, day: string) {
  return entry.book.day === day && nowMs - entry.fetchedAtMs <= MAX_AGE_MS;
}

/**
 * Today's prices from Square, cut to what the Business Agent lists.
 *
 * Neither read failing fails the page. Without the agent the board is the
 * site's own; without Square the board follows the agent with the prices
 * withheld.
 */
export async function getPriceBook(): Promise<PriceBook> {
  const [book, menu] = await Promise.all([getSquarePriceBook(), getAgentMenu()]);
  const { book: listed, disagreements } = applyAgentMenu(book, menu);
  reportDisagreements(disagreements);
  return listed;
}

const reportedDisagreements = new Set<string>();

/** Once per difference per instance: the agent reads Square hourly, so most heal by themselves. */
function reportDisagreements(lines: string[]) {
  const fresh = lines.filter((line) => !reportedDisagreements.has(line));
  if (!fresh.length) return;
  for (const line of fresh) reportedDisagreements.add(line);
  console.warn(
    `Business Agent and Square disagree on ${fresh.length} price(s); the site shows Square's, which is what is charged:`,
    fresh.join('; '),
  );
}

/**
 * Square's prices, read at most every fifteen minutes.
 *
 * On failure the last good snapshot is served with `stale: true` rather than an
 * error — a menu with older prices is a working menu, and the checkout path
 * re-validates against live Square anyway. Only a cold instance that has never
 * reached Square returns an empty book, and the studio renders that with the
 * prices withheld.
 */
async function getSquarePriceBook(): Promise<PriceBook> {
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
