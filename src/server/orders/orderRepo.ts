import 'server-only';
import { getSupabaseAdmin } from '../supabaseAdmin';

export interface OrderRow {
  id: string;
  public_status_token: string;
  square_order_id: string | null;
  square_payment_id: string | null;
  square_payment_link_id: string | null;
  square_location_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_note: string | null;
  pickup_type: 'ASAP' | 'SCHEDULED';
  requested_pickup_at: string | null;
  estimated_pickup_at: string | null;
  payment_status: string;
  fulfillment_status: string;
  currency: string;
  total_amount: number;
  order_snapshot: unknown;
  offer_code: string | null;
  lang: string;
  created_at: string;
  updated_at: string;
}

const TABLE = 'orders';

export async function insertOrder(
  row: Omit<OrderRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<void> {
  const { error } = await getSupabaseAdmin().from(TABLE).insert(row);
  if (error) throw new Error(`order insert failed: ${error.message}`);
}

export async function getOrderByToken(token: string): Promise<OrderRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('public_status_token', token)
    .maybeSingle();
  if (error) throw new Error(`order lookup failed: ${error.message}`);
  return data as OrderRow | null;
}

export async function getOrderBySquareOrderId(squareOrderId: string): Promise<OrderRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('square_order_id', squareOrderId)
    .maybeSingle();
  if (error) throw new Error(`order lookup failed: ${error.message}`);
  return data as OrderRow | null;
}

export async function updateOrderByToken(
  token: string,
  updates: Partial<Pick<OrderRow, 'payment_status' | 'fulfillment_status' | 'square_payment_id' | 'estimated_pickup_at'>>,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update(updates)
    .eq('public_status_token', token);
  if (error) throw new Error(`order update failed: ${error.message}`);
}

export async function updateOrderBySquareOrderId(
  squareOrderId: string,
  updates: Partial<Pick<OrderRow, 'payment_status' | 'fulfillment_status' | 'square_payment_id' | 'estimated_pickup_at'>>,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update(updates)
    .eq('square_order_id', squareOrderId);
  if (error) throw new Error(`order update failed: ${error.message}`);
}
