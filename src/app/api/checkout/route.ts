import { NextResponse } from 'next/server';
import { SquareError } from 'square';
import { ZodError } from 'zod';
import { checkoutRequestSchema } from '@/server/validation/checkoutSchema';
import { getCatalogForCheckout } from '@/server/square/catalogCache';
import { getOrderingHours } from '@/server/places/orderingHours';
import {
  CheckoutError,
  createCheckout,
  prepMinutesFor,
  validateLines,
  validatePickup,
} from '@/server/square/checkout';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const parsed = checkoutRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    // Lines are validated first: whether the cart is retail-only decides how
    // much prep buffer the collection slot has to clear.
    const menu = await getCatalogForCheckout();
    const lines = validateLines(parsed.data, menu);
    const { hours } = await getOrderingHours();
    validatePickup(parsed.data, Date.now(), prepMinutesFor(lines), hours);
    const result = await createCheckout(parsed.data, lines);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CheckoutError) {
      const status = err.code === 'pickup_invalid' ? 422 : 409;
      return NextResponse.json({ error: err.code }, { status });
    }
    console.error('checkout failed', err);
    return NextResponse.json({ error: 'checkout_failed', reason: failureReason(err) }, { status: 500 });
  }
}

/**
 * A short, secret-free label for why checkout failed, returned alongside the
 * generic error so a failure can be diagnosed from the browser's network tab
 * without server-log access. Square error codes and field names only — never
 * messages that could echo tokens or customer data.
 */
function failureReason(err: unknown): string {
  if (err instanceof SquareError) {
    const first = err.errors?.[0];
    const parts = ['square', String(err.statusCode ?? ''), first?.code ?? '', first?.field ?? ''];
    return parts.filter(Boolean).join(':');
  }
  if (err instanceof ZodError) {
    return `config:${err.issues.map((issue) => issue.path.join('.') || issue.message).join(',')}`;
  }
  if (err instanceof Error && err.message.startsWith('order insert failed')) return 'database:order_insert';
  if (err instanceof Error && /SUPABASE/.test(err.message)) return 'config:supabase';
  return 'unknown';
}
