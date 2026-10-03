import { expect, test, type Page } from '@playwright/test';
import { priceBookFixture } from './builders/menuBuilder';
import { OrderPage } from './builders/pages';

/** Ordering from the studio: what reaches the cart, and what cannot. */
async function openStudio(page: Page): Promise<OrderPage> {
  const order = new OrderPage(page);
  await order.withPopupDismissed();
  await order.withPrices(priceBookFixture());
  await order.open();
  return order;
}

test.describe('ordering', () => {
  test('is orderable straight away, with the required milk already chosen', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Latte').click();

    // Square marks Milk as required. The studio picks the first one so a price
    // can be quoted immediately, rather than disabling the button until asked.
    await expect(order.optionChip('Leche', 'Whole')).toHaveAttribute('aria-checked', 'true');
    await expect(order.addButton()).toBeEnabled();

    await order.addButton().click();

    await expect(order.cartBadge()).toHaveText('1');
  });

  test('carries the vessel and the extras into the cart line', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Latte').click();
    await order.temperature('Con hielo').click();
    await page.getByRole('radio', { name: 'Para llevar', exact: true }).click();
    await order.optionChip('Leche', 'Oat').click();

    await order.addButton().click();
    await order.openCart();

    const cart = page.getByRole('dialog');
    await expect(cart).toContainText('Latte');
    await expect(cart).toContainText('Oat');
    // The vessel is not a Square variation for a coffee, so it travels as a
    // note — and the customer should still see it on their own order.
    await expect(cart).toContainText('para llevar');
  });

  test('adds the quantity asked for', async ({ page }) => {
    const order = await openStudio(page);

    await page.getByRole('button', { name: '+', exact: true }).click();
    await page.getByRole('button', { name: '+', exact: true }).click();
    await order.addButton().click();

    await expect(order.cartBadge()).toHaveText('3');
  });

  test('cart survives a page reload', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Espresso').click();

    await order.addButton().click();
    await expect(order.cartBadge()).toHaveText('1');

    await page.reload();
    await expect(order.cartBadge()).toHaveText('1');
  });

  test('a sold-out drink cannot be ordered', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Mocha').click();

    await expect(order.addButton()).toBeDisabled();
    await expect(order.addButton()).toContainText('Agotado');
  });

  test('a drink Square has no price for cannot be ordered', async ({ page }) => {
    const order = new OrderPage(page);
    await order.withPopupDismissed();
    await order.withPrices({
      items: [],
      currency: 'EUR',
      fetchedAt: '2026-08-19T08:00:00.000Z',
      day: '2026-08-19',
      stale: true,
    });
    await order.open();

    // Nothing to send Square, so nothing goes in the basket — the board is
    // still browsable, which is the point of keeping it local.
    await expect(order.addButton()).toBeDisabled();
  });
});
