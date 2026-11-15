import type { AccountOrder } from '@/features/account/types';
import type { OrderRow } from './orderRepo';
import { derivePublicStatus } from './statusMapping';

interface SnapshotLine {
  itemName?: unknown;
  quantity?: unknown;
}

/**
 * An order row as the account page lists it: status in the customer's terms,
 * the counter's order number, and the lines as short "2 × Flat white" labels
 * from the snapshot taken at checkout (the menu may have changed since).
 * Nothing about payment ids or the note.
 */
export function toAccountOrder(row: OrderRow): AccountOrder {
  const snapshot = row.order_snapshot as { lines?: SnapshotLine[] } | null;
  const items = (snapshot?.lines ?? [])
    .filter((line): line is { itemName: string; quantity: number } =>
      typeof line.itemName === 'string' && typeof line.quantity === 'number',
    )
    .map((line) => (line.quantity > 1 ? `${line.quantity} × ${line.itemName}` : line.itemName));

  return {
    token: row.public_status_token,
    orderNumber: row.square_order_id ? row.square_order_id.slice(-6).toUpperCase() : null,
    createdAt: row.created_at,
    status: derivePublicStatus(row.payment_status, row.fulfillment_status),
    totalCents: row.total_amount,
    currency: row.currency,
    items,
  };
}
