import { expect, test } from '@playwright/test';

/**
 * Production smoke test for everything the site reads by itself. A failure
 * here means a feed has stopped — usually an expired token or a removed
 * environment variable — while the site carries on showing its fallbacks.
 */

test('Square: today’s prices are loaded', async ({ request }) => {
  const res = await request.get('/api/prices');
  expect(res.ok()).toBe(true);
  const book = (await res.json()) as { items: { variations: { cents: number }[] }[]; stale: boolean };
  expect(book.items.length, 'no items — Square unreachable or token wrong').toBeGreaterThan(10);
  expect(book.stale, 'serving old prices — Square unreachable').toBe(false);
  expect(book.items.some((i) => i.variations.some((v) => v.cents > 0))).toBe(true);
});

test('Google: ordering hours come from Google Maps with a 30-minute cutoff', async ({ request }) => {
  const res = await request.get('/api/ordering-hours');
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { source: string; cutoffMinutes: number };
  expect(body.source, 'using built-in hours — Google Places key or place id missing').toBe('google');
  expect(body.cutoffMinutes).toBe(30);
});

test('Google: rating, review count and footer hours are live', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ebc:popup-seen', new Date().toISOString()));
  await page.goto('/es');
  await expect(page.getByTestId('google-rating').first()).toHaveText(/^[1-5]\.\d$/);
  await expect(page.getByTestId('google-review-count').first()).toContainText(/\d/);
  await expect(page.getByTestId('opening-hours').first()).toHaveAttribute('data-source', 'google');
});

test('Instagram: the grid shows real posts', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ebc:popup-seen', new Date().toISOString()));
  await page.goto('/es');
  const first = page.getByTestId('social-post').first();
  await expect(first, 'showing our own photos — Instagram token missing or expired').toHaveAttribute(
    'data-live',
    'true',
  );
  await expect(first).toHaveAttribute('href', /instagram\.com\/(p|reel)\//);
});
