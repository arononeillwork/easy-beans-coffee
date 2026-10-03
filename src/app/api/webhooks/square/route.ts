import { NextResponse } from 'next/server';
import { verifySquareSignature } from '@/server/square/webhookVerify';
import { getSupabaseAdmin } from '@/server/supabaseAdmin';
import { syncOrderFromSquare } from '@/server/orders/orderSync';

export const dynamic = 'force-dynamic';

interface SquareWebhookEvent {
  event_id?: string;
  type?: string;
  data?: {
    object?: {
      payment?: { order_id?: string; status?: string };
      order_updated?: { order_id?: string };
      order_fulfillment_updated?: { order_id?: string };
      order?: { id?: string };
    };
  };
}

/**
 * Square webhook receiver. Reads the RAW body first (the signature covers
 * it byte-for-byte), verifies, dedupes on event_id, then refreshes order
 * state from Square's authoritative API rather than trusting the payload.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-square-hmacsha256-signature');

  if (!(await verifySquareSignature(rawBody, signature))) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let event: SquareWebhookEvent;
  try {
    event = JSON.parse(rawBody) as SquareWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  if (!event.event_id || !event.type) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Idempotency: primary-key insert makes replayed deliveries no-ops.
  const { data: inserted, error: insertError } = await supabase
    .from('webhook_events')
    .insert({ event_id: event.event_id, event_type: event.type, payload: event })
    .select('event_id');

  if (insertError && insertError.code === '23505') {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (insertError) {
    console.error('webhook event store failed', insertError.message);
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
  if (!inserted?.length) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const orderId =
    event.data?.object?.payment?.order_id ??
    event.data?.object?.order_updated?.order_id ??
    event.data?.object?.order_fulfillment_updated?.order_id ??
    event.data?.object?.order?.id;

  if (orderId) {
    try {
      await syncOrderFromSquare(orderId);
    } catch (err) {
      // Order may belong to POS activity unrelated to the website — log only.
      console.warn('webhook order sync skipped', { orderId, err: (err as Error).message });
    }
  }

  await supabase
    .from('webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('event_id', event.event_id);

  return NextResponse.json({ ok: true });
}
