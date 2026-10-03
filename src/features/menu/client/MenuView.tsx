'use client';

import { usePriceBook } from '../hooks/usePriceBook';
import type { PriceBook } from '../priceBook';
import { MenuStudio } from './MenuStudio';

/**
 * The /order page: the drink studio.
 *
 * The menu and the ordering flow are still one page — that has not changed —
 * but the page no longer waits on Square to render. The board and its
 * photography are local, so the only thing the price book gates is the numbers.
 *
 * There is no floating cart button here any more. The studio's own order bar is
 * pinned to the bottom of a phone screen, and the site header — which is sticky
 * on every page — already carries the basket with its count; a third control
 * for the same thing only had the overlap of the option rails to show for it.
 */
export function MenuView({ initialPrices }: { initialPrices: PriceBook | null }) {
  const priceBook = usePriceBook(initialPrices);
  return <MenuStudio priceBook={priceBook} />;
}
