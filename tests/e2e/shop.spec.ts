import { expect, test, type Page } from '@playwright/test';
import { ShopPage } from './builders/pages';
import { defaultTestMenu, testMenuWithShop } from './builders/menuBuilder';

/** English tree, so these specs can assert on English copy. */
async function englishShop(page: Page): Promise<ShopPage> {
  const shop = new ShopPage(page);
  await shop.withLanguage('en');
  return shop;
}

test.describe('shop', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('ebc:popup-seen', new Date().toISOString());
    });
  });

  test('lists retail products from the Square catalog, not drinks', async ({ page }) => {
    const shop = await englishShop(page);
    await shop.withMenu(testMenuWithShop());
    await shop.open('beans');

    await expect(page.getByText('Oro Fino')).toBeVisible();
    await expect(page.getByText('Brasil Bottrel')).toBeVisible();
    // A drink category must never leak into the shop.
    await expect(page.getByText('Latte', { exact: true })).toHaveCount(0);
  });

  test('drinks menu excludes shop stock', async ({ page }) => {
    const shop = await englishShop(page);
    await shop.withMenu(testMenuWithShop());
    await shop.openMenu();

    // The menu is a local board of drinks now (features/menu/drinks), so a bag
    // of beans cannot reach it however Square is categorised — this guards the
    // separation from the other direction.

    await expect(page.getByText('Latte', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Oro Fino')).toHaveCount(0);
  });

  test('quick-add puts a single-variation product in the shared cart', async ({ page }) => {
    const shop = await englishShop(page);
    await shop.withMenu(testMenuWithShop());
    await shop.open('gift-sets');

    await shop.addToCartButtons().first().click();
    await expect(shop.cartBadge()).toHaveText('1');
  });

  test('a product with choices routes to its page instead of quick-adding', async ({ page }) => {
    const shop = await englishShop(page);
    await shop.withMenu(testMenuWithShop());
    await shop.openProduct('beans', 'brasil-bottrel');

    // Two sizes, so the size selector must be offered before adding.
    await expect(page.getByRole('radio', { name: /250 g/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /1 kg/ })).toBeVisible();
  });

  test('shows placeholder stock and blocks ordering when Square has no retail items', async ({
    page,
  }) => {
    const shop = await englishShop(page);
    // defaultTestMenu is drinks only — the placeholder path.
    await shop.withMenu(defaultTestMenu());
    await shop.open();

    await expect(shop.placeholderNotice()).toBeVisible();
    await expect(shop.placeholderNotice()).toContainText(/sample products/i);
  });

  test('unknown collection is a 404', async ({ page }) => {
    const shop = await englishShop(page);
    await shop.withMenu(testMenuWithShop());
    await shop.open('not-a-collection');

    await expect(page.getByText(/could not be found|404/i).first()).toBeVisible();
  });
});
