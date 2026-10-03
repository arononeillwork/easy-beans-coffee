import { expect, test } from '@playwright/test';
import { HomePage } from './builders/pages';

test.describe('home page', () => {
  test('hero film autoplays and can be paused', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    const video = page.locator('video[src="/media/hero-film.mp4"]');
    await expect(video).toBeVisible();
    // Autoplay is the design; a stuck first frame would gut the hero.
    await expect
      .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime), { timeout: 10_000 })
      .toBeGreaterThan(0.5);

    // An autoplaying loop must be stoppable (and reduced-motion users start
    // paused via the same control path).
    await page.getByRole('button', { name: /pausa|pause/i }).click();
    expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
  });


  test('renders the hero in Spanish by default', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    await expect(home.heroHeadline()).toContainText('Enlatado delante de ti.');
  });

  // The toggle is a link now, not a state change: locale lives in the URL so
  // both trees can be prerendered. "Persists" therefore means the URL sticks.
  test('language toggle switches copy to English and persists', async ({ page }) => {
    const home = new HomePage(page);
    await home.withPopupDismissed();
    await home.open();

    await page.getByRole('link', { name: 'English' }).first().click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(home.heroHeadline()).toContainText('Canned in front of you.');

    await page.reload();
    await expect(home.heroHeadline()).toContainText('Canned in front of you.');
  });

  test('first-visit popup shows once and stores the flag when dismissed', async ({ page }) => {
    const home = new HomePage(page);
    await home.open();

    await expect(home.popup()).toBeVisible();
    await home.popup().getByRole('button', { name: /no, gracias/i }).click();
    await expect(home.popup()).toBeHidden();

    await page.reload();
    await page.waitForTimeout(2500);
    await expect(home.popup()).toBeHidden();
  });
});
