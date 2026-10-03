import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_REVIEWS,
  formatReviewDate,
  rankLatestTopRated,
  relativeReviewTime,
} from '@/server/places/reviewFormat';

/**
 * The rule deciding which reviews reach the home page. Two different APIs feed
 * it — Places and the café's own Business Profile — so a regression here shows
 * up as the wrong reviews on the site rather than as a crash.
 *
 * Run with `npm run test:unit`.
 */

const DAY = 86_400_000;

/** `n` days before now, so the fixtures stay relative to the run. */
function daysAgo(n: number): number {
  return Date.now() - n * DAY;
}

test('keeps only well-rated reviews when there are enough of them', () => {
  const ranked = rankLatestTopRated([
    { rating: 5, publishedAt: daysAgo(1) },
    { rating: 2, publishedAt: daysAgo(2) },
    { rating: 4, publishedAt: daysAgo(3) },
    { rating: 1, publishedAt: daysAgo(4) },
    { rating: 5, publishedAt: daysAgo(5) },
  ]);

  assert.equal(ranked.length, 3);
  assert.ok(
    ranked.every((review) => review.rating >= 4),
    'a poor review survived a field with three good ones',
  );
});

test('orders the good ones newest first', () => {
  const ranked = rankLatestTopRated([
    { rating: 4, publishedAt: daysAgo(10) },
    { rating: 5, publishedAt: daysAgo(1) },
    { rating: 5, publishedAt: daysAgo(5) },
  ]);

  assert.deepEqual(
    ranked.map((review) => review.publishedAt),
    [daysAgo(1), daysAgo(5), daysAgo(10)].map((t) => t),
  );
});

test('falls back to everything, best first, rather than showing a short row', () => {
  const ranked = rankLatestTopRated([
    { rating: 5, publishedAt: daysAgo(1) },
    { rating: 3, publishedAt: daysAgo(2) },
    { rating: 2, publishedAt: daysAgo(3) },
  ]);

  // Only one review clears 4 stars, which is below the threshold for filtering,
  // so all three show — highest rating first.
  assert.deepEqual(
    ranked.map((review) => review.rating),
    [5, 3, 2],
  );
});

test('caps the row so the band never asks for a page of images', () => {
  const many = Array.from({ length: 20 }, (_unused, i) => ({
    rating: 5,
    publishedAt: daysAgo(i),
  }));
  assert.equal(rankLatestTopRated(many).length, MAX_REVIEWS);
});

test('a missing timestamp sorts last instead of jumping the queue', () => {
  const ranked = rankLatestTopRated([
    { rating: 5, publishedAt: 0 },
    { rating: 5, publishedAt: daysAgo(3) },
    { rating: 5, publishedAt: daysAgo(1) },
  ]);
  assert.equal(ranked.at(-1)?.publishedAt, 0);
});

test('an empty field stays empty rather than throwing', () => {
  assert.deepEqual(rankLatestTopRated([]), []);
});

test('dates are formatted for the active locale', () => {
  const iso = '2026-03-12T10:00:00Z';
  assert.match(formatReviewDate(iso, 'en'), /12 Mar 2026/);
  // Spanish abbreviates the month differently and lowercases it.
  assert.match(formatReviewDate(iso, 'es'), /12 mar 2026/);
});

test('unusable dates degrade to an empty string, not "Invalid Date"', () => {
  assert.equal(formatReviewDate(undefined, 'en'), '');
  assert.equal(formatReviewDate('not a date', 'en'), '');
  assert.equal(relativeReviewTime(undefined, 'en'), '');
  assert.equal(relativeReviewTime('not a date', 'en'), '');
});

test('relative phrasing scales from days to months to years', () => {
  const iso = (ms: number) => new Date(ms).toISOString();
  assert.match(relativeReviewTime(iso(daysAgo(3)), 'en'), /3 days ago/);
  assert.match(relativeReviewTime(iso(daysAgo(70)), 'en'), /months ago/);
  assert.match(relativeReviewTime(iso(daysAgo(800)), 'en'), /years ago/);
});
