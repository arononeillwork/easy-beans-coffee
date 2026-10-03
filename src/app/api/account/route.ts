import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAccountAuthConfigured } from '@/server/env';
import { getAccountIdentity, deleteAuthUser } from '@/server/account/identity';
import { getSupabaseAuthServer } from '@/server/auth/supabaseSession';
import { deleteLeadByEmail } from '@/server/leads/leadRepo';
import { deleteCustomer, updateCustomer, type CustomerProfileInput } from '@/server/square/customers';

/**
 * The signed-in customer's own profile — the GDPR self-service surface.
 * GET is access, PUT is rectification, DELETE is erasure. Who is signed in
 * comes from Supabase Auth; what we know about them lives in the Square
 * Customer Directory (plus its seller-defined custom fields) — there is no
 * second profile store.
 *
 * The email is the Supabase login key and is not editable here: changing it
 * safely means a verified re-confirmation flow, not a profile PUT.
 */

const PHONE_RE = /^\+?[\d\s()-]{6,20}$/;

/** Empty string means "clear this field"; it becomes null before Square. */
const emptyable = (schema: z.ZodType<string>) => schema.or(z.literal('')).optional();

const updateSchema = z.object({
  givenName: emptyable(z.string().trim().max(100)),
  familyName: emptyable(z.string().trim().max(100)),
  phoneNumber: emptyable(z.string().trim().regex(PHONE_RE)),
  birthday: emptyable(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  address: z
    .object({
      addressLine1: z.string().trim().max(200),
      addressLine2: z.string().trim().max(200).optional(),
      locality: z.string().trim().max(100).optional(),
      postalCode: z.string().trim().max(20).optional(),
    })
    .nullable()
    .optional(),
});

function unauthorised() {
  return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
}

export async function GET() {
  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: 'accounts_unavailable' }, { status: 503 });
  }
  try {
    const identity = await getAccountIdentity();
    if (!identity) return unauthorised();
    return NextResponse.json({ profile: identity.customer });
  } catch (err) {
    console.error('account read failed', err);
    return NextResponse.json({ error: 'request_failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: 'accounts_unavailable' }, { status: 503 });
  }

  let parsed: z.infer<typeof updateSchema>;
  try {
    parsed = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const identity = await getAccountIdentity();
    if (!identity) return unauthorised();
    const customerId = identity.customer.id;

    const input: CustomerProfileInput = {
      givenName: parsed.givenName === undefined ? undefined : parsed.givenName || null,
      familyName: parsed.familyName === undefined ? undefined : parsed.familyName || null,
      phoneNumber: parsed.phoneNumber === undefined ? undefined : parsed.phoneNumber || null,
      birthday: parsed.birthday === undefined ? undefined : parsed.birthday || null,
      address:
        parsed.address === undefined
          ? undefined
          : parsed.address && parsed.address.addressLine1
            ? {
                addressLine1: parsed.address.addressLine1,
                addressLine2: parsed.address.addressLine2 || null,
                locality: parsed.address.locality || null,
                postalCode: parsed.address.postalCode || null,
              }
            : null,
    };

    const profile = await updateCustomer(customerId, input);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error('account update failed', err);
    return NextResponse.json({ error: 'request_failed' }, { status: 500 });
  }
}

export async function DELETE() {
  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: 'accounts_unavailable' }, { status: 503 });
  }
  try {
    const identity = await getAccountIdentity();
    if (!identity) return unauthorised();

    // Erasure covers every store: the Square profile, our newsletter rows and
    // the Supabase Auth user. Paid orders stay — accounting, not marketing.
    await deleteCustomer(identity.customer.id);
    await deleteLeadByEmail(identity.email);
    await deleteAuthUser(identity.userId);

    // The cookies still hold tokens for a user that no longer exists; clear
    // them so the browser does not keep presenting a dead session.
    const supabase = await getSupabaseAuthServer();
    await supabase.auth.signOut().catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('account deletion failed', err);
    return NextResponse.json({ error: 'request_failed' }, { status: 500 });
  }
}
