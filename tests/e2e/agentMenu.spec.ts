import { expect, test } from '@playwright/test';
import { applyAgentMenu, type AgentMenu, type AgentMenuItem } from '@/features/menu/agentMenu';
import { toPriceBook } from '@/features/menu/priceBook';
import { MenuBuilder, MenuItemBuilder } from './builders/menuBuilder';
import { OrderPage } from './builders/pages';

/**
 * The drink studio following the Business Agent: the agent says what is on the
 * menu, Square what it costs. The server joins the two (server/square/
 * priceCache); these specs hand the studio the joined book, as GET /api/prices
 * serves it, and check what a customer sees.
 */

const listed = (name: string): AgentMenuItem => ({
  id: `agent-${name}`,
  name,
  description: name === 'Babyccino' ? 'Warm milk foam for the little ones.' : null,
  photo_url: null,
  featured: false,
  price: null,
  price_label: null,
  variants: [],
  square_id: null,
});

/** On Square: a latte and an açaí bowl the agent has taken off the menu, and a babyccino the site has no copy for. */
function agentBook() {
  const square = new MenuBuilder()
    .withCategory('Classics', [
      new MenuItemBuilder('Flat White').withVariation('Hot', 380).withVariation('Iced', 480).build(),
      new MenuItemBuilder('Latte').withVariation('Hot', 400).withVariation('Iced', 500).build(),
      new MenuItemBuilder('Babyccino').withVariation('Hot', 150).build(),
    ])
    .withCategory('Bakery', [new MenuItemBuilder('Croissant').withVariation('Regular', 270).build()])
    .withCategory('Food', [new MenuItemBuilder('Acai Bowl').withVariation('Regular', 850).build()])
    .build();
  const menu: AgentMenu = {
    version: 1,
    business: { id: 1, name: 'Easy Beans Coffee', currency: 'EUR' },
    source: 'square',
    generated_at: '2026-11-05T12:00:00Z',
    sections: [
      { name: 'Classics', extras: false, items: [listed('Flat White'), listed('Babyccino')] },
      { name: 'Bakery', extras: false, items: [listed('Croissant')] },
    ],
  };
  return applyAgentMenu(toPriceBook(square, '2026-11-05'), menu).book;
}

async function openStudio(page: import('@playwright/test').Page) {
  const order = new OrderPage(page);
  await order.withPopupDismissed();
  // An empty prerendered book makes the studio ask /api/prices, which this mocks.
  await order.withPrices(agentBook());
  await order.open();
  return order;
}

test.describe('drink studio following the Business Agent', () => {
  test('lists only what the agent lists', async ({ page }) => {
    const order = await openStudio(page);

    await expect(order.drinkName()).toHaveText('Flat White');
    await expect(order.railEntry('Flat White')).toBeVisible();
    await expect(order.railEntry('Babyccino')).toBeVisible();
    // On Square, off the agent's menu.
    await expect(order.railEntry('Latte')).toHaveCount(0);
    await expect(order.railEntry('Cortado')).toHaveCount(0);
  });

  test('shows an item the site has no copy for, and takes it to the order', async ({ page }) => {
    const order = await openStudio(page);
    await order.railEntry('Babyccino').click();

    await expect(order.drinkName()).toHaveText('Babyccino');
    await expect(page.getByText('Warm milk foam for the little ones.')).toBeVisible();
    await expect(order.price()).toContainText('€1,50');
    await expect(page.getByText('Foto muy pronto').first()).toBeVisible();

    await order.addButton().click();
    await expect(order.cartBadge()).toHaveText('1');
  });

  test('leaves out a part of the menu the agent has emptied', async ({ page }) => {
    const order = await openStudio(page);
    await order.menuGroup('Comida').click();

    await expect(order.drinkName()).toHaveText('Croissant');
    await expect(order.section('Bollería')).toBeVisible();
    // The açaí bowl was the only food, and the agent took it off.
    await expect(order.section('Comida')).toHaveCount(0);
  });
});
