import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Square } from 'square';
import { normalizeCatalog } from '@/server/square/catalog';
import { buildDisplayBoard } from '@/features/menu/display/boardData';
import { EMPTY_PRICE_BOOK, toPriceBook } from '@/features/menu/priceBook';
import { DRINKS, SECTIONS } from '@/features/menu/drinks';

/**
 * The display board's data builder. The joins (hot/iced pairs, pick shelves)
 * are asserted against a small synthetic catalog in today's POS shape; the
 * recorded fixture — an older snapshot with the pre-rename item names — then
 * stands in for the real-world case where Square and the local board disagree.
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

/** Just enough of the live catalog to exercise every price shape. */
function syntheticBook() {
  const objects: Square.CatalogObject[] = [
    item('flat-white', 'Flat White', [
      variation('fw-hot', 'Hot', 380),
      variation('fw-iced', 'Iced', 480),
    ]),
    item('soft-drinks', 'Soft Drinks', [
      variation('cola', 'Coca Cola', 250),
      variation('sprite', 'Sprite', 250),
    ]),
    item('berry-blast', 'Berry Blast', [
      variation('bb-sit', 'Sit In', 650),
      variation('bb-take', 'Takeaway', 650),
    ]),
    // As the live POS actually names them — not the "Regular" the board expects.
    item('corona', 'Corona', [
      variation('corona-cero', 'Corona Cero', 350),
      variation('corona-std', 'Corona', 350),
    ]),
  ];
  return toPriceBook(normalizeCatalog(objects, LOCATION), '2026-10-17');
}

function fixtureBook() {
  const objects = JSON.parse(
    readFileSync(new URL('./fixtures/square-catalog.json', import.meta.url), 'utf8'),
  ) as Square.CatalogObject[];
  return toPriceBook(normalizeCatalog(objects, LOCATION), '2026-10-17');
}

test('every section with drinks becomes a section, in board order', () => {
  const board = buildDisplayBoard(fixtureBook());
  const expected = SECTIONS.map((s) => s.id).filter((id) =>
    DRINKS.some((drink) => drink.section === id),
  );
  assert.deepEqual(board.map((section) => section.id), expected);
});

test('temp-priced drinks carry the hot/iced pair from Square', () => {
  const board = buildDisplayBoard(syntheticBook());
  const coffee = board.find((section) => section.id === 'coffee');
  const flatWhite = coffee?.rows.find((row) => row.id === 'flat-white');
  assert.ok(flatWhite);
  assert.ok(flatWhite.price.hot !== undefined && flatWhite.price.hot > 0);
  assert.ok(flatWhite.price.iced !== undefined && flatWhite.price.iced > flatWhite.price.hot);
  assert.equal(coffee?.hasTempPair, true);
});

test('serve-priced items collapse to one number', () => {
  const board = buildDisplayBoard(syntheticBook());
  const smoothie = board
    .find((section) => section.id === 'smoothies')
    ?.rows.find((row) => row.id === 'berry-blast');
  assert.deepEqual(smoothie?.price, { one: 650 });
});

test('a pick shelf stays one line, options spelled out, at its shared price', () => {
  const board = buildDisplayBoard(syntheticBook());
  const cold = board.find((section) => section.id === 'cold');
  const shelf = cold?.rows.find((row) => row.id === 'soft-drinks');
  assert.ok(shelf);
  assert.deepEqual(shelf.price, { one: 250 });
  assert.ok(shelf.options?.en.includes('Coca-Cola'));
  assert.ok(shelf.options?.en.includes('Iced Tea'));
  assert.ok(shelf.options?.es.includes('Té Frío'));
  // No per-bottle rows: the shelf is a single line with its options as text.
  assert.ok(!cold?.rows.some((row) => row.id.startsWith('soft-drinks:')));
});

test('a renamed variation falls back to the cheapest price instead of a gap', () => {
  const board = buildDisplayBoard(syntheticBook());
  const corona = board
    .find((section) => section.id === 'cold')
    ?.rows.find((row) => row.id === 'corona');
  assert.deepEqual(corona?.price, { one: 350 });
});

test('an empty book still builds the whole board, prices withheld', () => {
  const board = buildDisplayBoard(EMPTY_PRICE_BOOK);
  assert.ok(board.length >= 5);
  for (const section of board) {
    assert.ok(section.rows.length > 0);
    for (const row of section.rows) {
      assert.equal(row.price.hot ?? row.price.iced ?? row.price.one, undefined);
      assert.equal(row.soldOut, false);
    }
  }
});

test('every drink on the local board appears exactly once, whatever Square carries', () => {
  const board = buildDisplayBoard(fixtureBook());
  const all = board.flatMap((section) => section.rows.map((row) => row.id));
  for (const drink of DRINKS) {
    assert.equal(all.filter((id) => id === drink.id).length, 1, `${drink.id} missing or duplicated`);
  }
});
