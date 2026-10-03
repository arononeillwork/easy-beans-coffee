import type { Lang } from '@/i18n/config';

/**
 * One rule for *which* reviews the band shows, and how their dates read.
 *
 * Two sources feed that band — the public Places API and the café's own
 * Business Profile (see `businessProfile.ts`) — and they disagree about almost
 * everything: Places caps at five and offers no sort, Business Profile returns
 * up to fifty and sorts on request. Keeping the choice here means the site
 * shows the same reviews either way, and the docs only have one rule to state.
 *
 * Pure functions, no I/O, no `server-only` — the ranking is unit-tested.
 */

/**
 * How many cards the band renders at most.
 *
 * Every card carries a photo, so this is the loading-speed dial rather than a
 * layout one: the carousel shows three at a time, and six gives a full second
 * page without asking the browser for seventeen images.
 */
export const MAX_REVIEWS = 6;

const MIN_GOOD_RATING = 4;
/** Below this, a wall of 4- and 5-star cards looks thinner than showing everything. */
const MIN_GOOD_COUNT = 3;

export type Rankable = {
  rating: number;
  /** Epoch ms. `0` when the source gave no usable timestamp — sorts last. */
  publishedAt: number;
};

/**
 * Well-rated first, newest among those, capped. Falls back to "everything, best
 * first" when there are too few good ones to fill the row — a café with two
 * 5-star reviews and a 3-star one is better served showing all three than
 * showing a short row and a gap.
 */
export function rankLatestTopRated<T extends Rankable>(items: T[]): T[] {
  const byNewest = (a: T, b: T) => b.publishedAt - a.publishedAt;

  const good = items.filter((item) => item.rating >= MIN_GOOD_RATING).sort(byNewest);
  const chosen =
    good.length >= MIN_GOOD_COUNT
      ? good
      : [...items].sort((a, b) => b.rating - a.rating || byNewest(a, b));

  return chosen.slice(0, MAX_REVIEWS);
}

function locale(lang: Lang): string {
  return lang === 'en' ? 'en-GB' : 'es-ES';
}

/** Absolute date for the card's second line, e.g. "12 Mar 2026". */
export function formatReviewDate(iso: string | undefined, lang: Lang): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

/**
 * "2 months ago", localised.
 *
 * Places hands this phrasing over ready-made; Business Profile does not, so it
 * is derived here. Months are approximated at 30 days — the card is telling a
 * customer roughly how fresh a review is, not doing calendar arithmetic.
 */
export function relativeReviewTime(iso: string | undefined, lang: Lang): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const format = new Intl.RelativeTimeFormat(locale(lang), { numeric: 'auto' });
  const days = Math.round((then - Date.now()) / 86_400_000);
  if (Math.abs(days) < 30) return format.format(days, 'day');

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return format.format(months, 'month');

  return format.format(Math.round(days / 365), 'year');
}
