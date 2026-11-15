import { expect, test, type Page } from '@playwright/test';
import { priceBookFixture } from './builders/menuBuilder';
import { HomePage, OrderPage } from './builders/pages';
import { FIXTURE } from './mockFeedsFixture.mjs';

/**
 * The site reads its facts from the Business Agent instead of hardcoding them:
 * the Google rating and review count and the Instagram posts (which the agent
 * reads from Google and Instagram), the opening hours, closures and contacts,
 * and, through the same hours, when online ordering is open. These specs run
 * the whole path against a local stand-in (tests/e2e/mockFeeds.mjs) whose
 * values differ from the café's real ones, so a pass proves the page is showing
 * the feed — not a built-in fallback that happens to match.
 *
 * Markup can change freely; these specs hold on to `data-testid` hooks, which
 * any redesign must keep on the same pieces of data.
 */

test.describe('automatic data feeds', () => {
  test('Google rating, review count and the way to leave a review come from the Business Agent', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    await expect(page.getByTestId('google-rating').first()).toHaveText(FIXTURE.rating.toFixed(1));
    await expect(page.getByTestId('google-review-count').first()).toContainText(String(FIXTURE.total));
    const card = page.getByTestId('rating-card');
    await expect(card.locator(`a[href="${FIXTURE.agent.writeReviewUrl}"]`)).toHaveCount(1);
  });

  test('opening hours, closures, address and contacts come from the Business Agent, not the built-in ones', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const hours = page.getByTestId('opening-hours').first();
    await expect(hours).toHaveAttribute('data-source', 'agent');
    await expect(hours).toContainText('7:45 – 16:15');
    await expect(hours).toContainText('10:00 – 14:00');
    // A closure on the agent's Calendar in the next two weeks is said under the hours.
    await expect(page.getByTestId('closure').first()).toContainText(FIXTURE.agent.closureReason);

    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: FIXTURE.agent.address })).toBeVisible();
    await expect(footer.locator(`a[href="${FIXTURE.agent.whatsappUrl}"]`)).toHaveCount(1);
    await expect(footer.locator(`a[href="mailto:${FIXTURE.agent.email}"]`)).toHaveCount(1);

    const visit = page.locator('#visit');
    await expect(visit.getByRole('heading', { level: 2 })).toHaveText(FIXTURE.agent.street);
    await expect(visit).toContainText(FIXTURE.agent.town);
    await expect(visit.locator(`a[href="${FIXTURE.agent.whatsappUrl}"]`)).toHaveCount(1);
  });

  test('the social grid shows the Instagram posts the Business Agent reads, linking to each post', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const posts = page.getByTestId('social-post');
    await expect(posts.first()).toHaveAttribute('data-live', 'true');
    for (const post of FIXTURE.posts) {
      await expect(page.locator(`[data-testid="social-post"][href="${post.permalink}"]`)).toHaveCount(1);
    }
    // Under the account the agent has connected.
    await expect(page.getByRole('link', { name: `@${FIXTURE.agent.instagramHandle}` })).toHaveAttribute(
      'href',
      `https://www.instagram.com/${FIXTURE.agent.instagramHandle}`,
    );
  });

  test('the café TV shows its screen from the Business Agent, the same way round as its poster was', async ({ page }) => {
    // Shown to the TV, not loaded here: the Business Agent is tested in its own repository.
    await page.route('https://businesssagent.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>The screen</p>' }));
    await page.goto('/display-menu');
    const frame = page.getByTestId('screen-frame');
    await expect(frame).toHaveAttribute('src', 'https://businesssagent.com/display-menu');
    await expect(page.getByTestId('screen-picture')).toHaveCount(0);
    // A TV whose poster was flipped keeps that way round.
    await page.evaluate(() => localStorage.setItem('eb-display-flip-2', '1'));
    await page.reload();
    await expect(frame).toHaveAttribute('src', 'https://businesssagent.com/display-menu?turn=left');
    // A TV still on the poster finds a new picture name in the page, and reloads onto the screen.
    const html = await (await page.request.get('/display-menu')).text();
    expect(html.match(/\/media\/display\/[\w.-]+\.(?:jpe?g|png|webp)/)?.[0]).toBe('/media/display/screens-page.jpg');
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

  test('the ordering-hours endpoint serves the Business Agent’s week with a 30-minute cutoff', async ({
    request,
  }) => {
    const res = await request.get('/api/ordering-hours');
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      source: string;
      cutoffMinutes: number;
      hours: { day: number; ranges: { open: number; close: number | null }[] }[];
    };
    expect(body.source).toBe('agent');
    expect(body.cutoffMinutes).toBe(30);
    const monday = body.hours.find((d) => d.day === 1);
    expect(monday?.ranges).toEqual([{ open: 7 * 60 + 45, close: 16 * 60 + 15 }]);
    expect(body.hours.find((d) => d.day === 0)?.ranges).toEqual([]);
  });
});

/**
 * Online ordering follows the Business Agent's hours and stops 30 minutes
 * before closing. The browser clock is pinned; times are Madrid local (CEST, UTC+2).
 */
test.describe('online ordering follows the live hours', () => {
  // The browser runs in Madrid time, like the café's customers. Playwright's
  // pinned clock replaces `Date`, and a class that extends it (@date-fns/tz's
  // TZDate, which the cart uses to read café time) then gets back a plain Date:
  // in a browser in another zone (a UTC test machine) it would read that zone's
  // time, 7:50 in Madrid as 5:50. Real browsers have no fake clock, so TZDate
  // works anywhere; tests/unit/pickupTimes.test.ts proves café time is read
  // right from another zone.
  test.use({ timezoneId: 'Europe/Madrid' });

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

  test('open at 7:50 on a weekday — the agent says 7:45, the built-in week says 8:00', async ({ page }) => {
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
