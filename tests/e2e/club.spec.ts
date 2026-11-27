import { expect, test, type APIRequestContext, type Page, type Route } from '@playwright/test';
import { SitePage } from './builders/pages';
import { FIXTURE } from './mockFeedsFixture.mjs';

/**
 * Selling the coffee club: the offer on /club and the home page comes from the
 * Business Agent's club feed (stood in by tests/e2e/mockFeeds.mjs, with its own
 * name and price), and the join button signs people in, sends them to checkout,
 * and welcomes them back. The site's own account routes are answered here, in
 * the browser: no spec signs anyone in.
 */

const MOCK_PORT = Number(process.env.MOCK_FEEDS_PORT ?? Number(process.env.PW_PORT ?? 3000) + 89);

async function setClub(request: APIRequestContext, mode: 'open' | 'closed' | 'none') {
  const res = await request.post(`http://localhost:${MOCK_PORT}/control/club?mode=${mode}`);
  expect(res.ok()).toBe(true);
}

async function open(page: Page, path: string) {
  await new SitePage(page).withPopupDismissed();
  await page.goto(path);
}

/** Answers the join route as the site would, and keeps what it was asked. */
async function answerJoin(page: Page, status: number, body: Record<string, unknown>) {
  const asked: unknown[] = [];
  await page.route('**/api/account/club/join', (route: Route) => {
    asked.push(route.request().postDataJSON());
    return route.fulfill({ status, json: body });
  });
  return asked;
}

// One stand-in club for all of these, switched per test: never two at once.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page, request }) => {
  await setClub(request, 'open');
  // The dev server keeps a feed for a minute; this has it read the stand-in afresh.
  await page.setExtraHTTPHeaders({ 'cache-control': 'no-cache' });
});

test.afterAll(async ({ request }) => {
  await setClub(request, 'open');
});

test.describe('the club page', () => {
  test('shows the offer from the Business Agent, how it works, the limit and cancelling', async ({ page }) => {
    await open(page, '/en/club');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(FIXTURE.club.name);
    const offer = page.getByTestId('club-offer');
    await expect(offer).toContainText('1 coffee a week for €12 a month');
    await expect(offer).toContainText('Up to €4.50 a drink');
    await expect(offer).toContainText('Cancel any time');
    await expect(page.getByTestId('club-step')).toHaveCount(3);
    await expect(page.getByTestId('club-join')).toHaveText('Join the club');
    await expect(page.getByTestId('club-closed')).toHaveCount(0);
  });

  test('is in Spanish too, linked from the home page section and the footer', async ({ page }) => {
    await open(page, '/es');

    const band = page.getByTestId('club-band');
    await expect(band).toContainText(FIXTURE.club.name);
    await expect(band).toContainText(/1 café a la semana por 12\s€ al mes/);
    await expect(page.locator('footer').getByRole('link', { name: 'Club de café' })).toHaveAttribute('href', '/es/club');

    await band.getByRole('link').click();
    await expect(page).toHaveURL(/\/es\/club$/, { timeout: 30_000 });
    await expect(page.getByTestId('club-offer')).toContainText(/Hasta 4,50\s€ por bebida/);
    await expect(page.getByTestId('club-join')).toHaveText('Únete al club');
  });

  test('while the café isn’t taking members, says so instead of the button', async ({ page, request }) => {
    await setClub(request, 'closed');
    await open(page, '/en/club');

    await expect(page.getByTestId('club-offer')).toContainText('1 coffee a week');
    await expect(page.getByTestId('club-closed')).toHaveText('Not taking new members right now.');
    await expect(page.getByTestId('club-join')).toHaveCount(0);
  });

  test('with no club (404), the home page leaves the section out and the page says so', async ({ page, request }) => {
    await setClub(request, 'none');

    await open(page, '/es');
    await expect(page.locator('#visit')).toBeVisible();
    await expect(page.getByTestId('club-band')).toHaveCount(0);

    await page.goto('/en/club');
    await expect(page.getByTestId('club-unavailable')).toContainText('The coffee club isn’t available right now.');
    await expect(page.getByTestId('club-join')).toHaveCount(0);
  });
});

test.describe('joining', () => {
  test('signed in: asks for their checkout and goes there', async ({ page, baseURL }) => {
    const asked = await answerJoin(page, 200, { url: `${baseURL}/en/about?checkout=e2e` });
    await open(page, '/en/club');

    await page.getByTestId('club-join').click();
    await expect(page).toHaveURL(/checkout=e2e/, { timeout: 30_000 });
    expect(asked).toEqual([{ lang: 'en' }]);
  });

  test('signed out: to sign in, with the way back to carry on joining', async ({ page }) => {
    await answerJoin(page, 401, { error: 'not_signed_in' });
    await page.route('**/api/account', (route) => route.fulfill({ status: 401, json: { error: 'not_signed_in' } }));
    await open(page, '/es/club');

    await page.getByTestId('club-join').click();
    await expect(page).toHaveURL(/\/es\/account\?next=%2Fes%2Fclub%3Fjoin%3D1$/, { timeout: 30_000 });
    await expect(page.getByTestId('club-sign-in-hint')).toBeVisible();
    await expect(page.getByTestId('order-sign-in-hint')).toHaveCount(0);
  });

  test('back from signing in, the join starts by itself, once', async ({ page, baseURL }) => {
    const asked = await answerJoin(page, 200, { url: `${baseURL}/es/about?checkout=resumed` });
    await open(page, '/es/club?join=1');

    await expect(page).toHaveURL(/checkout=resumed/, { timeout: 30_000 });
    expect(asked).toHaveLength(1);
    // "Back" lands on the plain club page, which doesn't send them off again.
    await page.goBack();
    await expect(page).toHaveURL(/\/es\/club$/);
    await expect(page.getByTestId('club-join')).toBeEnabled();
    expect(asked).toHaveLength(1);
  });

  test('back still signed out, it stays put rather than loop to sign-in', async ({ page }) => {
    const asked = await answerJoin(page, 401, { error: 'not_signed_in' });
    await open(page, '/es/club?join=1');

    await expect.poll(() => asked.length).toBe(1);
    await expect(page.getByTestId('club-join')).toBeEnabled();
    await expect(page).toHaveURL(/\/es\/club$/);
  });

  test('already a member: a link to their pass', async ({ page }) => {
    await answerJoin(page, 409, { error: 'already_a_member' });
    await open(page, '/en/club');

    await page.getByTestId('club-join').click();
    await expect(page.getByText('You’re already a member.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'See your pass' })).toHaveAttribute('href', '/en/account');
  });

  test('when the checkout can’t be opened, says so and lets them try again', async ({ page }) => {
    await answerJoin(page, 503, { error: 'unavailable' });
    await open(page, '/en/club');

    await page.getByTestId('club-join').click();
    await expect(page.getByTestId('club-offer').getByRole('alert')).toContainText('couldn’t open the checkout');
    await expect(page.getByTestId('club-join')).toBeEnabled();
  });
});

test.describe('the account page', () => {
  const profile = {
    id: 'E2E', emailAddress: 'e2e@easybeans.example', givenName: 'Eva', familyName: 'Prueba',
    phoneNumber: null, birthday: null, address: null,
  };
  const offer = { name: 'E2E Coffee Club', price: 12, currency: 'EUR', coffees_per_week: 1 };
  const notYet = { ...offer, join_url: 'https://square.link/u/generic', pass: null };
  const member = {
    ...offer,
    join_url: null,
    pass: {
      standing: 'active', used_this_week: 0, left_this_week: 1, week_start: '2026-11-23',
      started_on: '2026-11-26', ends_on: null, card_code: '7Q2K9XMB',
    },
  };

  /** Signed in, with the club answering `clubs` in turn (the last one from then on). */
  async function signedIn(page: Page, clubs: unknown[]) {
    await page.route('**/api/account', (route) => route.fulfill({ json: { profile } }));
    await page.route('**/api/account/orders', (route) => route.fulfill({ json: { orders: [] } }));
    const reads = { count: 0 };
    await page.route('**/api/account/club', (route) => {
      const club = clubs[Math.min(reads.count, clubs.length - 1)];
      reads.count += 1;
      return route.fulfill({ json: { club } });
    });
    return reads;
  }

  test('shows no loyalty points or rewards', async ({ page }) => {
    await signedIn(page, [notYet]);
    await open(page, '/en/account');

    await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /rewards/i })).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText(/rewards|redeem/i);
  });

  test('a non-member’s join button opens their own checkout, not the generic one', async ({ page, baseURL }) => {
    await signedIn(page, [notYet]);
    const asked = await answerJoin(page, 200, { url: `${baseURL}/en/about?checkout=account` });
    await open(page, '/en/account');

    await page.getByTestId('club-join').click();
    await expect(page).toHaveURL(/checkout=account/, { timeout: 30_000 });
    expect(asked).toEqual([{ lang: 'en' }]);
  });

  test('back from the checkout: welcomed, and re-read until the pass arrives', async ({ page }) => {
    await page.clock.install();
    const reads = await signedIn(page, [notYet, notYet, member]);
    await open(page, '/en/account?club=joined');

    const welcome = page.getByTestId('club-welcome');
    await expect(welcome).toContainText('Welcome to the club');
    await expect(welcome).toContainText('Setting up your membership…');
    // No second payment while the first catches up.
    await expect(page.getByTestId('club-join')).toHaveCount(0);

    await expect(async () => {
      await page.clock.runFor(15_000);
      await expect(page.getByText('This week’s coffee is ready.')).toBeVisible({ timeout: 500 });
    }).toPass();

    await expect(welcome).not.toContainText('Setting up');
    await expect(page).toHaveURL(/\/en\/account$/);
    // Once the pass is here, no more asking.
    const done = reads.count;
    await page.clock.runFor(60_000);
    expect(reads.count).toBe(done);
  });

  test('after three minutes without a pass, stops asking and says what to do', async ({ page }) => {
    await page.clock.install();
    const reads = await signedIn(page, [notYet]);
    await open(page, '/en/account?club=joined');
    const welcome = page.getByTestId('club-welcome');
    await expect(welcome).toContainText('Setting up your membership…');

    await expect(async () => {
      await page.clock.runFor(15_000);
      await expect(welcome).toContainText('taking longer than usual', { timeout: 500 });
    }).toPass({ timeout: 40_000 });

    // The first read, then one every 15 s for 3 minutes. (The dev server's
    // strict mode runs the first one twice.)
    const done = reads.count;
    expect(done).toBeGreaterThanOrEqual(13);
    expect(done).toBeLessThanOrEqual(14);
    await page.clock.runFor(60_000);
    expect(reads.count).toBe(done);
    await expect(page.getByTestId('club-join')).toHaveCount(0);
  });
});
