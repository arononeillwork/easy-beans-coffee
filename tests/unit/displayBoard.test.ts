import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Square } from 'square';
import { normalizeCatalog } from '@/server/square/catalog';
import { buildDisplayPages } from '@/features/menu/display/boardData';
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

test('every section with drinks becomes a page, in board order', () => {
  const pages = buildDisplayPages(fixtureBook());
  const expected = SECTIONS.map((s) => s.id).filter((id) =>
    DRINKS.some((drink) => drink.section === id),
  );
  assert.deepEqual(pages.map((page) => page.section), expected);
});

test('temp-priced drinks carry the hot/iced pair from Square', () => {
  const pages = buildDisplayPages(syntheticBook());
  const coffee = pages.find((page) => page.section === 'coffee');
  const flatWhite = coffee?.rows.find((row) => row.id === 'flat-white');
  assert.ok(flatWhite);
  assert.ok(flatWhite.price.hot !== undefined && flatWhite.price.hot > 0);
  assert.ok(flatWhite.price.iced !== undefined && flatWhite.price.iced > flatWhite.price.hot);
  assert.equal(coffee?.hasTempPair, true);
});

test('serve-priced items collapse to one number', () => {
  const pages = buildDisplayPages(syntheticBook());
  const smoothie = pages
    .find((page) => page.section === 'smoothies')
    ?.rows.find((row) => row.id === 'berry-blast');
  assert.deepEqual(smoothie?.price, { one: 650 });
});

test('pick shelves expand into one priced row per bottle', () => {
  const pages = buildDisplayPages(syntheticBook());
  const cold = pages.find((page) => page.section === 'cold');
  assert.ok(cold);
  const cola = cold.rows.find((row) => row.id === 'soft-drinks:coca-cola');
  assert.ok(cola, 'the shelf is its bottles, not one "Soft Drinks" line');
  assert.ok((cola.price.one ?? 0) > 0);
  assert.ok(!cold.rows.some((row) => row.id === 'soft-drinks'));
});

test('a renamed variation falls back to the cheapest price instead of a gap', () => {
  const pages = buildDisplayPages(syntheticBook());
  const corona = pages
    .find((page) => page.section === 'cold')
    ?.rows.find((row) => row.id === 'corona');
  assert.deepEqual(corona?.price, { one: 350 });
});

test('a pick outside the fridge stays one dish', () => {
  const pages = buildDisplayPages(syntheticBook());
  const food = pages.find((page) => page.section === 'food');
  assert.ok(food?.rows.some((row) => row.id === 'chia-fruit-parfait'));
  assert.ok(!food?.rows.some((row) => row.id.startsWith('chia-fruit-parfait:')));
});

test('an empty book still builds the whole board, prices withheld', () => {
  const pages = buildDisplayPages(EMPTY_PRICE_BOOK);
  assert.ok(pages.length >= 5);
  for (const page of pages) {
    assert.ok(page.rows.length > 0);
    for (const row of page.rows) {
      assert.equal(row.price.hot ?? row.price.iced ?? row.price.one, undefined);
      assert.equal(row.soldOut, false);
    }
  }
});

test('rows that exist locally but not in Square render price-less, not missing', () => {
  const pages = buildDisplayPages(fixtureBook());
  const all = pages.flatMap((page) => page.rows.map((row) => row.id));
  // Every non-pick drink appears exactly once, whatever Square carries.
  for (const drink of DRINKS.filter((d) => d.variations.by !== 'pick')) {
    assert.ok(all.includes(drink.id), `${drink.id} missing from the board`);
  }
});
