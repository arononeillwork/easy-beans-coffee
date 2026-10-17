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
    // (No takeaway shot of a hot flat white yet, so it falls back to the cup.)
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
      '/media/drinks/latte/iced-takeaway.webp',
    );
    await expect(order.price()).toContainText('€5');
  });

  test('takeaway is the first option and the default; sit in swaps the photo', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Latte').click();
    await order.temperature('Con hielo').click();

    const serve = page.getByRole('radiogroup', { name: 'Cómo la tomas' });
    await expect(serve.getByRole('radio').first()).toHaveAccessibleName('Para llevar');
    await expect(serve.getByRole('radio', { name: 'Para llevar' })).toHaveAttribute('aria-checked', 'true');
    await expect(order.photo('latte')).toHaveAttribute('src', '/media/drinks/latte/iced-takeaway.webp');

    await serve.getByRole('radio', { name: 'Para aquí' }).click();
    await expect(order.photo('latte')).toHaveAttribute('src', '/media/drinks/latte/iced-sit-in.webp');
  });

  test('shows the açaí granola as standard and gluten free, side by side', async ({ page }) => {
    const order = await openStudio(page);
    await order.menuGroup('Comida').click();
    await order.section('Comida').click();

    await expect(order.drinkName()).toHaveText('Bowl de Açaí');
    const granola = page.getByRole('radiogroup', { name: 'Granola' });
    const standard = granola.getByRole('radio', { name: 'Normal' });
    const glutenFree = granola.getByRole('radio', { name: 'Sin gluten' });
    await expect(standard).toHaveAttribute('aria-checked', 'true');
    // Beside each other: same row on screen.
    const [a, b] = [await standard.boundingBox(), await glutenFree.boundingBox()];
    expect(a && b && Math.abs(a.y - b.y) < 4 && b.x > a.x).toBe(true);

    await glutenFree.click();
    await order.addButton().click();
    await order.openCart();
    await expect(page.getByRole('dialog')).toContainText('Gluten Free Granola');
  });

  test('the menu has no allergen table at the bottom', async ({ page }) => {
    await openStudio(page);
    await expect(page.getByRole('heading', { name: 'Alérgenos' })).toHaveCount(0);
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
      '/media/drinks/caramel-latte/iced-takeaway.webp',
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
      '/media/drinks/strawberry-matcha/iced-takeaway.webp',
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
