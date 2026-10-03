import { NextResponse } from 'next/server';
import { checkoutRequestSchema } from '@/server/validation/checkoutSchema';
import { getCatalogForCheckout } from '@/server/square/catalogCache';
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
    validatePickup(parsed.data, Date.now(), prepMinutesFor(lines));
    const result = await createCheckout(parsed.data, lines);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CheckoutError) {
      const status = err.code === 'pickup_invalid' ? 422 : 409;
      return NextResponse.json({ error: err.code }, { status });
    }
    console.error('checkout failed', err);
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 });
  }
}
