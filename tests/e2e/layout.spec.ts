import { expect, test } from '@playwright/test';
import { HomePage, OrderPage } from './builders/pages';
import { priceBookFixture } from './builders/menuBuilder';

/**
 * The site shell and home-page details the café asked for in October 2026:
 * the phone menu, the pinned offer banner, flags for language, arrows on the
 * home menu, no TikTok link, and "All" in the newsletter popup.
 */

test.describe('phone menu', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('sits top right and lists every page with its icon, account included', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const button = page.getByRole('button', { name: 'Menu', exact: true });
    const box = await button.boundingBox();
    expect(box && box.x + box.width).toBeGreaterThan(390 - 40);

    await button.click();
    for (const [key, name] of [
      ['menu', 'Menú'],
      ['shop', 'Tienda'],
      ['story', 'Sobre nosotros'],
      ['findUs', 'Visítanos'],
      ['account', 'Mi cuenta'],
    ] as const) {
      const item = page.getByTestId(`drawer-${key}`);
      await expect(item).toContainText(name);
      await expect(item.locator('svg')).toHaveCount(1);
    }
    // Language, as flags with names, inside the menu.
    await expect(page.getByRole('link', { name: 'English' }).last()).toBeVisible();

    await expect(page.getByTestId('drawer-account')).toHaveAttribute('href', '/es/account');
    await page.getByTestId('drawer-account').click();
    // The dev server compiles /account on first visit, so allow it time.
    await expect(page).toHaveURL(/\/es\/account$/, { timeout: 30_000 });
  });
});

test.describe('site shell', () => {
  test('the offer banner stays at the top while scrolling', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    await page.locator('#visit').scrollIntoViewIfNeeded();
    const banner = page.getByRole('button', { name: /suscríbete/i });
    await expect(banner).toBeInViewport();
    const box = await banner.boundingBox();
    expect(box?.y ?? 999).toBeLessThan(10);
  });

  test('language switch shows flags, not EN/ES', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const english = page.getByRole('link', { name: 'English' }).first();
    await expect(english.locator('svg')).toHaveCount(1);
    await expect(page.locator('header')).not.toContainText(/\bEN\b|\bES\b/);
  });

  test('nav words survive browser translation (Menú, not Carta)', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    await expect(page.locator('header nav').first()).toContainText('Menú');
    await expect(page.locator('body')).not.toContainText('Carta');
  });
});

test.describe('home page sections', () => {
  test('the menu slideshow has arrows that scroll it', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const next = page.getByTestId('board-arrow-right');
    const back = page.getByTestId('board-arrow-left');
    await next.scrollIntoViewIfNeeded();
    await expect(next).toHaveCSS('opacity', '1');
    await expect(back).toHaveCSS('opacity', '0');

    await next.click();
    await expect(back).toHaveCSS('opacity', '1');
  });

  test('no TikTok link beside the Instagram section', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const social = page.locator('section[aria-labelledby="social-title"]');
    await expect(social.getByRole('link', { name: /tiktok/i })).toHaveCount(0);
  });

  test('the visit section shows the rating on the photo and the open state', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const visit = page.locator('#visit');
    await expect(visit.getByTestId('google-rating')).toBeVisible();
    await expect(visit.getByTestId('open-now')).toBeVisible();
    await expect(visit.getByTestId('amenities')).toContainText('Perros bienvenidos');
  });
});

test.describe('newsletter popup', () => {
  test('"Todo" selects every topic, and clears them again', async ({ page }) => {
    const home = new HomePage(page);
    await home.open();

    const popup = home.popup();
    await expect(popup).toBeVisible();
    const all = popup.getByTestId('interests-all');
    const topics = popup.locator('.MuiChip-root:not([data-testid="interests-all"])');

    await all.click();
    await expect(all).toHaveAttribute('aria-pressed', 'true');
    for (const chip of await topics.all()) await expect(chip).toHaveAttribute('aria-pressed', 'true');

    await all.click();
    for (const chip of await topics.all()) await expect(chip).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('menu page header offset', () => {
  test('the order page still opens on the studio under the pinned header', async ({ page }) => {
    const order = new OrderPage(page);
    await order.withPopupDismissed();
    await order.withPrices(priceBookFixture());
    await order.open();
    await expect(order.drinkName()).toBeInViewport();
  });
});
