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

test.describe('ordering needs an account', () => {
  async function cartWithEspresso(order: OrderPage): Promise<void> {
    await order.railEntry('Espresso').click();
    await order.addButton().click();
    await order.openCart();
  }

  test('a signed-out visitor is asked to sign in, and comes back to the cart', async ({ page }) => {
    const order = new OrderPage(page);
    await order.withPopupDismissed();
    await order.withPrices(priceBookFixture());
    await order.withSignedOut();
    await order.open();
    await cartWithEspresso(order);

    const cart = page.getByRole('dialog');
    await expect(cart.getByTestId('cart-sign-in-note')).toBeVisible();
    await expect(cart.getByRole('button', { name: /pagar con square/i })).toHaveCount(0);
    // Sign-in sends them back here with the cart open.
    await expect(cart.getByTestId('cart-sign-in')).toHaveAttribute(
      'href',
      `/es/account?next=${encodeURIComponent('/es/order?cart=open')}`,
    );
  });

  test('a signed-in customer pays, with the receipt going to their account email', async ({ page }) => {
    const order = new OrderPage(page);
    await order.withPopupDismissed();
    await order.withPrices(priceBookFixture());
    await order.withSignedIn('ana@example.com');
    await order.open();
    await cartWithEspresso(order);

    const cart = page.getByRole('dialog');
    await expect(cart.getByTestId('receipt-email')).toContainText('ana@example.com');
    await expect(cart.getByLabel(/nombre para el pedido/i)).toHaveValue('Ana García');
    await expect(cart.getByRole('textbox', { name: /email/i })).toHaveCount(0);
    await expect(cart.getByRole('button', { name: /pagar con square/i })).toBeVisible();
    await expect(cart.getByTestId('cart-sign-in')).toHaveCount(0);
  });

  test('?cart=open opens the cart, then leaves the address clean', async ({ page }) => {
    const order = new OrderPage(page);
    await order.withPopupDismissed();
    await order.withPrices(priceBookFixture());
    await order.withSignedIn();
    await page.goto('/es/order?cart=open');

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/es\/order$/);
  });
});
