import test from 'node:test';
import assert from 'node:assert/strict';
import type { Square } from 'square';
import { normalizeCatalog } from '@/server/square/catalog';
import { applyAgentMenu, boardDrinks, parseAgentMenu, type AgentMenu, type AgentMenuItem } from '@/features/menu/agentMenu';
import { buildDisplayBoard } from '@/features/menu/display/boardData';
import { composePrice, initialChoice } from '@/features/menu/compose';
import { EMPTY_PRICE_BOOK, indexPriceBook, toPriceBook } from '@/features/menu/priceBook';
import { DRINKS } from '@/features/menu/drinks';

/**
 * The Business Agent decides what is on the menu; Square still prices and
 * sells it. What must never break:
 *   - without the agent, the board is the site's own (every drink in drinks.ts)
 *   - an item the agent does not list leaves the board, the home page run and
 *     the in-café board
 *   - an item the agent lists that the site has no copy for appears, in the
 *     right section, and can be ordered with Square's ids
 *   - the join is Square's item id first, so a name changed in the agent
 *     doesn't lose the item; then the name
 *   - the price shown is Square's (what is charged); a different agent price
 *     is reported, never shown
 *   - Square down: the board still follows the agent, without prices
 */

const LOCATION = 'LKGQR7QKGC2S0';

function variation(id: string, name: string, cents: number): Square.CatalogObject {
  return {
    type: 'ITEM_VARIATION',
    id,
    itemVariationData: { name, priceMoney: { amount: BigInt(cents), currency: 'EUR' } },
  } as Square.CatalogObject;
}

function item(id: string, name: string, variations: Square.CatalogObject[]): Square.CatalogObject {
  return { type: 'ITEM', id, itemData: { name, variations } } as Square.CatalogObject;
}

function squareBook() {
  return toPriceBook(
    normalizeCatalog(
      [
        item('SQ-FW', 'Flat White', [variation('fw-hot', 'Hot', 380), variation('fw-iced', 'Iced', 480)]),
        item('SQ-LATTE', 'Latte', [variation('l-hot', 'Hot', 400), variation('l-iced', 'Iced', 500)]),
        item('SQ-SOFT', 'Soft Drinks', [variation('cola', 'Coca Cola', 250), variation('sprite', 'Sprite', 250)]),
        item('SQ-BABY', 'Babyccino', [variation('baby-hot', 'Hot', 150)]),
        item('SQ-EXTRAS', 'EXTRAS', [variation('sausages', 'Sausages', 150), variation('eggs', 'Eggs', 150)]),
        // Counter-only: the site's own Square filter keeps it off, whatever the agent says.
        item('SQ-CCL', 'Cafe con Leche', [variation('ccl-hot', 'Hot', 300)]),
        item('SQ-CAKE', 'Blueberry Cheesecake', [variation('bc', 'Regular', 400)]),
        item('SQ-PROMO', 'PROMO ( Croissant + Cafe)', [variation('p', 'Regular', 600)]),
      ],
      LOCATION,
    ),
    '2026-11-05',
  );
}

const entry = (name: string, more: Partial<AgentMenuItem> = {}): AgentMenuItem => ({
  id: `agent-${name}`,
  name,
  description: null,
  photo_url: null,
  featured: false,
  price: null,
  price_label: null,
  variants: [],
  square_id: null,
  ...more,
});

function agentMenu(sections: AgentMenu['sections']): AgentMenu {
  return {
    version: 1,
    business: { id: 1, name: 'Easy Beans Coffee', currency: 'EUR' },
    source: 'square',
    generated_at: '2026-11-05T12:00:00Z',
    sections,
  };
}

/** The live shape: the agent reads Square, so ids and prices match. */
const LIVE = agentMenu([
  {
    name: 'Classics',
    extras: false,
    items: [
      entry('Flat White', { square_id: 'SQ-FW', price: 3.8, price_label: 'Hot', variants: [{ name: 'Iced', price: 4.8 }] }),
      entry('Babyccino', { square_id: 'SQ-BABY', price: 1.5, price_label: 'Hot', description: 'Warm milk foam for the little ones.' }),
      entry('Cafe con Leche', { square_id: 'SQ-CCL', price: 3, price_label: 'Hot' }),
    ],
  },
  {
    name: 'Cold Drinks',
    extras: false,
    items: [entry('Soft Drinks', { square_id: 'SQ-SOFT', price: 2.5, price_label: 'Coca Cola', variants: [{ name: 'Sprite', price: 2.5 }] })],
  },
  { name: 'Food', extras: false, items: [entry('Blueberry Cheesecake', { square_id: 'SQ-CAKE', price: 4 })] },
  // Square's modifier lists: options, never items on the board.
  { name: 'Extras', extras: true, items: [entry('Latte', { price: 0.5 })] },
]);

test('without the agent the board is the site’s own', () => {
  const book = squareBook();
  const { book: same, disagreements } = applyAgentMenu(book, null);
  assert.equal(same, book);
  assert.deepEqual(disagreements, []);
  assert.equal(boardDrinks(same), DRINKS);
});

test('an item the agent does not list leaves the board', () => {
  const { book } = applyAgentMenu(squareBook(), LIVE);
  const ids = boardDrinks(book).map((drink) => drink.id);
  assert.ok(ids.includes('flat-white'));
  assert.ok(ids.includes('soft-drinks'));
  // On Square, not on the agent's menu (the extras section doesn't count).
  assert.ok(!ids.includes('latte'));
  assert.ok(!book.items.some((i) => i.name === 'Latte'));
  assert.ok(!book.items.some((i) => i.name.startsWith('PROMO')));
  // Every drink the site knows but the agent doesn't list is gone too.
  assert.ok(!ids.includes('matcha-latte'));
});

test('an item the agent lists that the site has no copy for appears, and can be ordered', () => {
  const { book } = applyAgentMenu(squareBook(), LIVE);
  const board = boardDrinks(book);
  const baby = board.find((drink) => drink.square === 'Babyccino');
  assert.ok(baby, 'Babyccino is on the board');
  assert.equal(baby.id, 'menu-babyccino');
  assert.equal(baby.section, 'coffee');
  assert.deepEqual(baby.name, { en: 'Babyccino', es: 'Babyccino' });
  assert.deepEqual(baby.description, { en: 'Warm milk foam for the little ones.', es: 'Warm milk foam for the little ones.' });
  assert.deepEqual(baby.variations, { by: 'temp', hot: 'Hot', iced: undefined });

  const priced = indexPriceBook(book).get('babyccino');
  const price = composePrice(baby, priced, initialChoice(baby, priced));
  assert.equal(price.unitCents, 150);
  assert.equal(price.variationId, 'baby-hot');

  const cake = board.find((drink) => drink.square === 'Blueberry Cheesecake');
  assert.equal(cake?.section, 'food');
  assert.deepEqual(cake?.variations, { by: 'none', name: 'Regular' });
  // The site's own entries come first, then the agent's others in its order.
  assert.deepEqual(
    board.map((drink) => drink.id),
    ['flat-white', 'soft-drinks', 'menu-babyccino', 'menu-blueberry-cheesecake'],
  );
});

test('the site’s own filter still keeps counter-only items off, whatever the agent lists', () => {
  const { book } = applyAgentMenu(squareBook(), LIVE);
  assert.ok(!boardDrinks(book).some((drink) => drink.square === 'Cafe con Leche'));
});

test('joins on Square’s id first, so a renamed item keeps its price', () => {
  const renamed = agentMenu([
    { name: 'Classics', extras: false, items: [entry('Flat White (oat)', { square_id: 'SQ-FW', price: 3.8, price_label: 'Hot' })] },
  ]);
  const { book } = applyAgentMenu(squareBook(), renamed);
  assert.deepEqual(book.items.map((i) => [i.id, i.listing?.name]), [['SQ-FW', 'Flat White (oat)']]);
  // The site's flat white still matches by its Square name.
  assert.ok(boardDrinks(book).some((drink) => drink.id === 'flat-white'));
});

test('joins on the name when the agent has no Square id (a menu kept in the agent)', () => {
  const custom = agentMenu([{ name: 'Classics', extras: false, items: [entry('flat white', { price: 3.8, price_label: 'Hot' })] }]);
  const { book } = applyAgentMenu(squareBook(), custom);
  assert.deepEqual(book.items.map((i) => i.id), ['SQ-FW']);
});

test('shows Square’s price, and reports a different agent price', () => {
  const drifted = agentMenu([
    {
      name: 'Classics',
      extras: false,
      items: [entry('Flat White', { square_id: 'SQ-FW', price: 3.9, price_label: 'Hot', variants: [{ name: 'Iced', price: 4.8 }] })],
    },
  ]);
  const { book, disagreements } = applyAgentMenu(squareBook(), drifted);
  assert.deepEqual(
    book.items[0].variations.map((v) => [v.name, v.cents]),
    [['Hot', 380], ['Iced', 480]],
  );
  assert.deepEqual(disagreements, ['Flat White (Hot): agent 3.90, Square 3.80']);
  // The live shape agrees everywhere.
  assert.deepEqual(applyAgentMenu(squareBook(), LIVE).disagreements, []);
});

test('Square down: the board still follows the agent, without prices', () => {
  const { book } = applyAgentMenu(EMPTY_PRICE_BOOK, LIVE);
  assert.deepEqual(book.items, []);
  const ids = boardDrinks(book).map((drink) => drink.id);
  assert.deepEqual(ids, ['flat-white', 'soft-drinks']);
});

test('the in-café board follows the agent too', () => {
  const { book } = applyAgentMenu(squareBook(), LIVE);
  const rows = buildDisplayBoard(book).flatMap((section) => section.rows.map((row) => row.id));
  assert.ok(rows.includes('flat-white'));
  assert.ok(rows.includes('menu-babyccino'));
  assert.ok(!rows.includes('latte'));
});

test('several ways an item is sold, none of them hot or iced, become a pick', () => {
  const shelf = agentMenu([{ name: 'Food', extras: false, items: [entry('EXTRAS', { square_id: 'SQ-EXTRAS', price: 1.5 })] }]);
  const { book } = applyAgentMenu(squareBook(), shelf);
  const extras = boardDrinks(book).find((drink) => drink.square === 'EXTRAS');
  assert.equal(extras?.section, 'food');
  assert.equal(extras?.id, 'menu-extras');
  assert.equal(extras?.variations.by, 'pick');
  assert.deepEqual(
    extras?.variations.by === 'pick' ? extras.variations.picks.map((pick) => pick.square) : [],
    ['Sausages', 'Eggs'],
  );
});

test('reads only a version 1 menu, and every item named', () => {
  assert.equal(parseAgentMenu(null), null);
  assert.equal(parseAgentMenu({ ...LIVE, version: 2 }), null);
  assert.equal(parseAgentMenu({ ...LIVE, sections: [{ name: 'x', items: [{ name: '' }] }] }), null);
  const parsed = parseAgentMenu(JSON.parse(JSON.stringify({ ...LIVE, extra_field: true })));
  assert.deepEqual(parsed, LIVE);
});
