import { NextResponse } from 'next/server';
import { getDisplayPriceBook } from '@/server/square/displayPrices';

export const dynamic = 'force-dynamic';

/**
 * Hourly price snapshot for the in-café display board.
 *
 * The screen at /display-menu asks for this once an hour while the café is
 * open; the server module behind it holds Square to one read per hour however
 * many screens are on the wall. Never fails — an empty book renders the board
 * with prices withheld rather than a dead screen.
 */
export async function GET() {
  const book = await getDisplayPriceBook();
  return NextResponse.json(book, {
    headers: {
      // Short CDN hold: the hourly cadence is the client's, and a screen that
      // asks at 11:00 should not be handed the 10:05 edge copy of 09:59 prices.
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
