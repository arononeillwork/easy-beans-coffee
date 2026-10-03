import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Square } from 'square';
import { camelizeKeys } from '@/server/square/catalogHttp';
import { normalizeCatalog } from '@/server/square/catalog';

/**
 * The catalog is fetched over plain HTTP rather than through the Square SDK, so
 * this file guards the seam that swap introduced: Square's REST API answers in
 * snake_case where the SDK answered in camelCase, and `normalizeCatalog` — which
 * produces every price on the site — was written against the camelCase shape.
 *
 * The e2e specs mock at the MenuResponse level and would not catch a fault here.
 *
 * Run with `npm run test:unit`. The `--conditions=react-server` flag in that
 * script is what lets `server-only` modules be imported outside Next.
 */

test('camelizeKeys converts snake_case field names', () => {
  assert.deepEqual(
    camelizeKeys({
      item_data: {
        name: 'Latte',
        price_money: { amount: 400, currency: 'EUR' },
        modifier_list_info: [{ modifier_list_id: 'abc', min_selected_modifiers: 1 }],
      },
    }),
    {
      itemData: {
        name: 'Latte',
        priceMoney: { amount: 400, currency: 'EUR' },
        modifierListInfo: [{ modifierListId: 'abc', minSelectedModifiers: 1 }],
      },
    },
  );
});

test('camelizeKeys walks arrays and leaves primitives alone', () => {
  assert.deepEqual(camelizeKeys({ a_b: [1, 'two', null, { c_d: true }] }), {
    aB: [1, 'two', null, { cD: true }],
  });
});

// The one case the live catalog does not exercise, and the one most likely to
// break silently: Square keys custom attributes as `<app_id>:<key>`, and those
// keys are merchant data. Camelizing `ebc_badge` to `ebcBadge` would make every
// badge and compare-at price vanish with no error anywhere.
test('camelizeKeys preserves custom attribute keys but converts their values', () => {
  const result = camelizeKeys({
    custom_attribute_values: {
      'APPID123:ebc_badge': { string_value: 'pick', selection_uid_values: ['x'] },
      ebc_compare_at: { string_value: '24.00' },
    },
  }) as Record<string, Record<string, unknown>>;

  const attrs = result.customAttributeValues;
  assert.deepEqual(Object.keys(attrs).sort(), ['APPID123:ebc_badge', 'ebc_compare_at']);
  assert.deepEqual(attrs['APPID123:ebc_badge'], {
    stringValue: 'pick',
    selectionUidValues: ['x'],
  });
});

test('badges and compare-at survive the conversion end to end', () => {
  const raw = {
    objects: [
      { type: 'CATEGORY', id: 'cat1', category_data: { name: 'Coffee beans' } },
      {
        type: 'ITEM',
        id: 'item1',
        present_at_all_locations: true,
        custom_attribute_values: {
          'APPID123:ebc_badge': { string_value: 'pick' },
          'APPID123:ebc_compare_at': { string_value: '24.00' },
        },
        item_data: {
          name: 'Oro Fino',
          categories: [{ id: 'cat1' }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: 'var1',
              present_at_all_locations: true,
              item_variation_data: { name: '250 g', price_money: { amount: 1200, currency: 'EUR' } },
            },
          ],
        },
      },
    ],
  };

  const { objects } = camelizeKeys(raw) as { objects: Square.CatalogObject[] };
  const menu = normalizeCatalog(objects, 'LOC1');
  const item = menu.categories.flatMap((c) => c.items).find((i) => i.name === 'Oro Fino');

  assert.ok(item, 'item should survive normalization');
  assert.equal(item.badge, 'pick');
  assert.equal(item.compareAtCents, 2400);
  assert.equal(item.variations[0].priceCents, 1200);
  assert.equal(item.kind, 'retail');
});

test('sold-out state is read from the location override', () => {
  const raw = {
    objects: [
      { type: 'CATEGORY', id: 'cat1', category_data: { name: 'Coffee' } },
      {
        type: 'ITEM',
        id: 'item1',
        present_at_all_locations: true,
        item_data: {
          name: 'Mocha',
          categories: [{ id: 'cat1' }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: 'var1',
              present_at_all_locations: true,
              item_variation_data: {
                name: 'Hot',
                price_money: { amount: 450, currency: 'EUR' },
                location_overrides: [{ location_id: 'LOC1', sold_out: true }],
              },
            },
          ],
        },
      },
    ],
  };

  const { objects } = camelizeKeys(raw) as { objects: Square.CatalogObject[] };
  const item = normalizeCatalog(objects, 'LOC1').categories.flatMap((c) => c.items)[0];
  assert.equal(item.soldOut, true);
});

// Captured from the live catalog via the SDK/REST comparison; regenerate by
// re-running that check if the menu changes shape.
test('the captured live catalog normalizes to a sane menu', () => {
  const fixturePath = path.resolve(process.cwd(), 'tests/unit/fixtures/square-catalog.json');
  const objects = JSON.parse(readFileSync(fixturePath, 'utf8')) as Square.CatalogObject[];
  const menu = normalizeCatalog(objects, 'LKGQR7QKGC2S0');

  const items = menu.categories.flatMap((c) => c.items);
  assert.ok(menu.categories.length > 0, 'expected at least one category');
  assert.ok(items.length > 0, 'expected at least one item');
  // Every item must carry a name and at least one priced variation, or the
  // conversion has dropped something the menu depends on.
  for (const item of items) {
    assert.ok(item.name.length > 0, `item ${item.id} has no name`);
    assert.ok(item.variations.length > 0, `item ${item.name} has no variations`);
  }
});
