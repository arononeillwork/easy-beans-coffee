import { NextResponse } from 'next/server';
import { getPriceBookOrEmpty } from '@/server/square/priceCache';

export const dynamic = 'force-dynamic';

/**
 * Today's prices, for the client fallback path.
 *
 * The menu is prerendered with a snapshot already in the HTML, so this is only
 * reached when a page was built while Square was unreachable and the browser
 * has to fill the numbers in itself. It never fails: an empty book means the
 * board renders without prices rather than not at all.
 *
 * The CDN is told to hold it for an hour and serve it stale for a day, which
 * matches the server cache's own once-a-day contract.
 */
export async function GET() {
  const book = await getPriceBookOrEmpty();
  return NextResponse.json(book, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
