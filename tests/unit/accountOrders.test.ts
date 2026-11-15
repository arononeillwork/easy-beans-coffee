import test from 'node:test';
import assert from 'node:assert/strict';
import { toAccountOrder } from '@/server/orders/accountOrders';
import type { OrderRow } from '@/server/orders/orderRepo';

/** An order row as checkout stores it; override what a test is about. */
function orderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'row-1',
    public_status_token: 'a'.repeat(32),
    square_order_id: 'sq_order_9zx81k',
    square_payment_id: null,
    square_payment_link_id: null,
    square_location_id: 'LOC',
    customer_name: 'Ana',
    customer_email: 'ana@example.com',
    customer_note: 'No sugar please',
    pickup_type: 'ASAP',
    requested_pickup_at: null,
    estimated_pickup_at: null,
    payment_status: 'PAID',
    fulfillment_status: 'NEW',
    currency: 'EUR',
    total_amount: 940,
    order_snapshot: {
      lines: [
        { itemName: 'Flat white', variationName: 'Regular', modifierNames: [], quantity: 2, unitPriceCents: 320 },
        { itemName: 'Croissant', variationName: 'Regular', modifierNames: [], quantity: 1, unitPriceCents: 300 },
      ],
      subtotalCents: 940,
      discountPercentage: 0,
      totalCents: 940,
    },
    offer_code: null,
    lang: 'es',
    auth_user_id: 'user-1',
    square_customer_id: 'CUST',
    created_at: '2026-11-15T10:00:00.000Z',
    updated_at: '2026-11-15T10:05:00.000Z',
    ...overrides,
  };
}

test('an order lists as the counter calls it: number, lines, total', () => {
  const order = toAccountOrder(orderRow());
  assert.equal(order.token, 'a'.repeat(32));
  assert.equal(order.orderNumber, '9ZX81K');
  assert.deepEqual(order.items, ['2 × Flat white', 'Croissant']);
  assert.equal(order.totalCents, 940);
  assert.equal(order.status, 'confirmed');
});

test('status is the customer-facing one, same as the status page', () => {
  assert.equal(toAccountOrder(orderRow({ payment_status: 'PENDING' })).status, 'awaiting_payment');
  assert.equal(toAccountOrder(orderRow({ fulfillment_status: 'PREPARED' })).status, 'ready');
  assert.equal(toAccountOrder(orderRow({ fulfillment_status: 'COMPLETED' })).status, 'collected');
});

test('nothing private leaves the row: no email, note or payment ids', () => {
  const serialised = JSON.stringify(toAccountOrder(orderRow({ square_payment_id: 'PAY-SECRET' })));
  assert.ok(!serialised.includes('ana@example.com'));
  assert.ok(!serialised.includes('No sugar'));
  assert.ok(!serialised.includes('PAY-SECRET'));
});

test('a damaged snapshot lists no lines instead of failing', () => {
  assert.deepEqual(toAccountOrder(orderRow({ order_snapshot: null })).items, []);
  assert.deepEqual(toAccountOrder(orderRow({ order_snapshot: { lines: [{ itemName: 7 }] } })).items, []);
});
