'use client';

import { useCallback, useEffect, useState } from 'react';
import { EMPTY_PRICE_BOOK, type PriceBook } from '../priceBook';

/**
 * The day's prices, with a client fallback.
 *
 * The menu is prerendered with a snapshot already in it, so this normally does
 * nothing at all — `initial` is served straight back and no request is made.
 * The fetch exists for the one case the prerender cannot cover: a build that
 * ran while Square was unreachable or unconfigured, which ships an empty book
 * rather than failing. The board is local, so that page still renders every
 * drink and every photograph; only the numbers are missing, and this fills
 * them in.
 */
export function usePriceBook(initial: PriceBook | null): PriceBook {
  const [book, setBook] = useState<PriceBook>(initial ?? EMPTY_PRICE_BOOK);

  const needsFetch = !initial || initial.items.length === 0;

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch('/api/prices', { signal });
      if (!response.ok) return;
      const next = (await response.json()) as PriceBook;
      if (Array.isArray(next.items)) setBook(next);
    } catch {
      // A menu with no prices beside it is still a menu. Leave it as it is.
    }
  }, []);

  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [needsFetch, load]);

  return book;
}
