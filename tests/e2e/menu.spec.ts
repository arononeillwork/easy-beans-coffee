import { expect, test, type Page } from '@playwright/test';
import { priceBookFixture } from './builders/menuBuilder';
import { OrderPage } from './builders/pages';

/**
 * The drink studio at /order.
 *
 * What is on the board is no longer test data — it ships in
 * features/menu/drinks, with its photography under public/media/drinks — so
 * these specs assert on the real menu and mock only what Square is still asked
 * for: the prices. See builders/menuBuilder's priceBookFixture.
 */
async function openStudio(page: Page): Promise<OrderPage> {
  const order = new OrderPage(page);
  await order.withPopupDismissed();
  await order.withPrices(priceBookFixture());
  await order.open();
  return order;
}

test.describe('drink studio', () => {
  test('opens on a coffee, with its photograph and today’s price', async ({ page }) => {
    const order = await openStudio(page);

    await expect(order.drinkName()).toHaveText('Flat White');
    // Local photography, served from our own origin — never a Square URL.
    await expect(order.photo('flat-white')).toHaveAttribute(
      'src',
      '/media/drinks/flat-white/hot-sit-in.webp',
    );
    await expect(order.price()).toContainText('€3,80');
  });

  test('changes the price and the cup when you switch hot to iced', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Latte').click();

    await expect(order.photo('latte')).toHaveAttribute(
      'src',
      '/media/drinks/latte/hot-sit-in.webp',
    );
    await expect(order.price()).toContainText('€4');

    await order.temperature('Con hielo').click();

    await expect(order.photo('latte')).toHaveAttribute(
      'src',
      '/media/drinks/latte/iced-sit-in.webp',
    );
    await expect(order.price()).toContainText('€5');
  });

  test('changes the vessel without changing the price', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Latte').click();
    await order.temperature('Con hielo').click();

    await page.getByRole('radio', { name: 'En lata', exact: true }).click();

    await expect(order.photo('latte')).toHaveAttribute(
      'src',
      '/media/drinks/latte/iced-can.webp',
    );
    // A can is the same drink poured differently, so the price does not move.
    await expect(order.price()).toContainText('€5');
  });

  test('turns the cup into the caramel latte when caramel is chosen', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Latte').click();
    await order.temperature('Con hielo').click();

    await order.optionChip('Sirope', 'Caramel').click();

    // The café shoots a caramel latte as its own drink; picking the syrup shows it.
    await expect(order.drinkName()).toHaveText('Latte de Caramelo');
    await expect(order.photo('latte')).toHaveAttribute(
      'src',
      '/media/drinks/caramel-latte/iced-sit-in.webp',
    );
    // 5,00 € + 0,50 € for the syrup, straight from Square's modifier price.
    await expect(order.price()).toContainText('€5,50');
  });

  test('steps to the next drink with the stage arrows', async ({ page }) => {
    const order = await openStudio(page);

    await expect(order.drinkName()).toHaveText('Flat White');
    // First drink: nothing before it to step back to.
    await expect(order.prevArrow()).toBeDisabled();

    await order.nextArrow().click();

    await expect(order.drinkName()).toHaveText('Latte');
    await expect(order.prevArrow()).toBeEnabled();
  });

  test('lists cold foam as coming soon, not as a choice', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Latte').click();

    // The rail names it and says when — and offers nothing to press, so it
    // cannot reach an order even though Square still carries the list.
    const foam = page.getByRole('heading', { name: 'Espuma fría' });
    await expect(foam).toBeVisible();
    await expect(foam.locator('..')).toContainText('Muy pronto');
  });

  test('moves between parts of the board', async ({ page }) => {
    const order = await openStudio(page);

    await order.section('Especialidades').click();

    await expect(order.drinkName()).toHaveText('Matcha Latte');
    await expect(order.stagePanel('flat-white')).toHaveCount(0);
  });

  test('shows a purée-flavoured matcha as the drink it becomes', async ({ page }) => {
    const order = await openStudio(page);
    await order.section('Especialidades').click();
    await order.temperature('Con hielo').click();

    await order.optionChip('Puré', 'Strawberry').click();

    await expect(order.drinkName()).toHaveText('Matcha con Fresa');
    await expect(order.photo('matcha-latte')).toHaveAttribute(
      'src',
      '/media/drinks/strawberry-matcha/iced-sit-in.webp',
    );
  });

  test('prices smoothies by the vessel, because Square does', async ({ page }) => {
    const order = await openStudio(page);
    await order.section('Batidos').click();
    await order.railEntry('Tropical').click();

    // Sit In and Takeaway are the Square variations here, so there is no
    // temperature switch at all — just the vessel.
    await expect(page.getByRole('radio', { name: 'Caliente' })).toHaveCount(0);
    await expect(order.price()).toContainText('€6,50');
  });

  test('stands in for anything not photographed yet', async ({ page }) => {
    const order = await openStudio(page);
    await order.menuGroup('Comida').click();
    await order.section('Bollería').click();

    await expect(order.drinkName()).toHaveText('Croissant');
    await expect(order.photo('croissant')).toHaveCount(0);
    await expect(page.getByText('Foto muy pronto').first()).toBeVisible();
  });

  test('withholds the price rather than guessing when Square has none', async ({ page }) => {
    const order = new OrderPage(page);
    await order.withPopupDismissed();
    // An empty book is what a page prerendered against an unreachable Square
    // ships with. The board must still be a board.
    await order.withPrices({
      items: [],
      currency: 'EUR',
      fetchedAt: '2026-08-19T08:00:00.000Z',
      day: '2026-08-19',
      stale: true,
    });
    await order.open();

    await expect(order.drinkName()).toHaveText('Flat White');
    await expect(order.photo('flat-white')).toBeVisible();
    await expect(order.price()).toContainText('Pregunta en barra');
  });

  test('/menu redirects to the one page', async ({ page }) => {
    const order = new OrderPage(page);
    await order.withPopupDismissed();
    await order.withPrices(priceBookFixture());

    await page.goto('/es/menu');

    await expect(page).toHaveURL(/\/es\/order$/);
    await expect(order.drinkName()).toHaveText('Flat White');
  });
});
