/** Formats integer cents as a localized euro amount, e.g. 450 → "4,50 €". */
export function formatEuros(cents: number, lang: 'en' | 'es' = 'es'): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/**
 * Menu-board style: symbol first and no trailing zeros, so a wall of prices
 * reads as "€4 / €5" rather than "4,00 € / 5,00 €". Only the browse-only menu
 * uses this — carts, totals and receipts stay on {@link formatEuros}, which
 * follows the locale's own currency convention.
 */
export function formatMenuPrice(cents: number, lang: 'en' | 'es' = 'es'): string {
  // Whole euros lose the decimals entirely (€4, not €4,00); anything else keeps
  // both of them, so 240 is €2,40 and never €2,4.
  const digits = cents % 100 === 0 ? 0 : 2;
  const amount = new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-IE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100);
  return `€${amount}`;
}

/** Price range for an item across its variations, collapsed when uniform. */
export function formatPriceRange(prices: number[], lang: 'en' | 'es' = 'es'): string {
  if (prices.length === 0) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? formatEuros(min, lang)
    : `${formatEuros(min, lang)} – ${formatEuros(max, lang)}`;
}
