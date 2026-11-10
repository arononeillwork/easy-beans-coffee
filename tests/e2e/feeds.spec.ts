import { expect, test, type Page } from '@playwright/test';
import { priceBookFixture } from './builders/menuBuilder';
import { HomePage, OrderPage } from './builders/pages';
import { FIXTURE } from './mockFeedsFixture.mjs';

/**
 * The site reads its facts from other systems instead of hardcoding them:
 * Google Maps (rating, review count, opening hours), Instagram (the post grid)
 * and, through the same hours, when online ordering is open. These specs run
 * the whole path against a local stand-in (tests/e2e/mockFeeds.mjs) whose
 * values differ from the café's real ones, so a pass proves the page is showing
 * the feed — not a built-in fallback that happens to match.
 *
 * Markup can change freely; these specs hold on to `data-testid` hooks, which
 * any redesign must keep on the same pieces of data.
 */

test.describe('automatic data feeds', () => {
  test('Google rating and review count come from Google Places', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    await expect(page.getByTestId('google-rating').first()).toHaveText(FIXTURE.rating.toFixed(1));
    await expect(page.getByTestId('google-review-count').first()).toContainText(String(FIXTURE.total));
  });

  test('opening hours come from Google Maps, not the built-in week', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const hours = page.getByTestId('opening-hours').first();
    await expect(hours).toHaveAttribute('data-source', 'google');
    await expect(hours).toContainText('7:45 – 16:15');
    await expect(hours).toContainText('10:00 – 14:00');
  });

  test('the social grid shows live Instagram posts linking to each post', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const posts = page.getByTestId('social-post');
    await expect(posts.first()).toHaveAttribute('data-live', 'true');
    for (const post of FIXTURE.posts) {
      await expect(page.locator(`[data-testid="social-post"][href="${post.permalink}"]`)).toHaveCount(1);
    }
  });

  test('the café TV keeps the cake + coffee post, not the newest Instagram post', async ({ page }) => {
    await page.goto('/display-menu');
    const shown = page.getByTestId('screen-picture');
    await expect(shown).toHaveAttribute('src', '/media/display/cake-coffee-offer.jpg');
    await expect(shown).toHaveAttribute('alt', /Cake \+ coffee for just €7/);
    await expect(page.getByText('@easy.beans.coffee')).toBeVisible();
    // The picture actually arrives, not just its address.
    await expect.poll(() => shown.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    // Newer posts on Instagram don't take its place while the switch is off.
    for (const post of FIXTURE.posts) {
      await expect(page.locator(`img[src="/media/display/instagram-${post.id}.jpg"]`)).toHaveCount(0);
    }
  });

  test('a post\'s picture for the TV comes through the site\'s own picture address', async ({ request }) => {
    // What the TV shows when it follows the newest post (SHOW_NEWEST_POST on the /display-menu page).
    const picture = `/media/display/instagram-${FIXTURE.posts[0].id}.jpg`;
    const res = await request.get(picture);
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toMatch(/^image\//);
    expect(res.headers()['cache-control']).toContain('immutable');
    // Only the café's own posts, and only by their id.
    expect((await request.get('/media/display/instagram-123.jpg')).status()).toBe(404);
    expect((await request.get('/media/display/instagram-abc.jpg')).status()).toBe(404);
    // The posters beside it are still plain files.
    expect((await request.get('/media/display/chia-parfait-offer-en-upright.jpg')).ok()).toBe(true);
  });

  test('the ordering-hours endpoint serves the Google schedule with a 30-minute cutoff', async ({
    request,
  }) => {
    const res = await request.get('/api/ordering-hours');
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      source: string;
      cutoffMinutes: number;
      hours: { day: number; ranges: { open: number; close: number | null }[] }[];
    };
    expect(body.source).toBe('google');
    expect(body.cutoffMinutes).toBe(30);
    const monday = body.hours.find((d) => d.day === 1);
    expect(monday?.ranges).toEqual([{ open: 7 * 60 + 45, close: 16 * 60 + 15 }]);
    expect(body.hours.find((d) => d.day === 0)?.ranges).toEqual([]);
  });
});

/**
 * Online ordering follows the same Google hours and stops 30 minutes before
 * closing. The browser clock is pinned; times are Madrid local (CEST, UTC+2).
 */
test.describe('online ordering follows the live hours', () => {
  async function cartAt(page: Page, madridLocal: string) {
    await page.clock.setFixedTime(new Date(`${madridLocal}+02:00`));
    const order = new OrderPage(page);
    await order.withPopupDismissed();
    await order.withPrices(priceBookFixture());
    await order.open();
    await order.railEntry('Latte').click();
    await order.addButton().click();
    // The cart starts from the built-in week and swaps in the live schedule
    // when it arrives; assert only once it has.
    const hours = page.waitForResponse((res) => res.url().includes('/api/ordering-hours'));
    await order.openCart();
    await hours;
    return page.getByTestId('ordering-state');
  }

  test('open at 7:50 on a weekday — Google says 7:45, the built-in week says 8:00', async ({ page }) => {
    const state = await cartAt(page, '2026-10-21T07:50:00');
    await expect(state).toHaveAttribute('data-open', 'true');
  });

  test('closed from 30 minutes before closing, and says when it reopens', async ({ page }) => {
    const state = await cartAt(page, '2026-10-21T15:50:00');
    await expect(state).toHaveAttribute('data-open', 'false');
    await expect(state).toContainText('7:45');
  });

  test('Saturday cutoff follows Saturday hours; Sunday stays shut until Monday', async ({ page }) => {
    const state = await cartAt(page, '2026-10-24T13:40:00');
    await expect(state).toHaveAttribute('data-open', 'false');
    await expect(state).toContainText(/lunes|monday/i);
  });
});
