import { NextResponse } from 'next/server';
import { getDisplayPriceBook } from '@/server/square/displayPrices';

export const dynamic = 'force-dynamic';

/**
 * The items-and-prices snapshot for the in-café display board.
 *
 * The screen at /display-menu asks for this once per café day, an hour after
 * opening; the catalog cache behind it keeps the answer within minutes of
 * the till however many screens are on the wall. Never fails — an empty book
 * renders the board with prices withheld rather than a dead screen.
 */
export async function GET() {
  const book = await getDisplayPriceBook();
  return NextResponse.json(book, {
    headers: {
      // Barely held: the read happens once a day and exists to catch the
      // morning's price edits, so serving it minutes stale defeats it.
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=3600',
    },
  });
}
