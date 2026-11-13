import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { isAccountAuthConfigured } from '@/server/env';
import { getAccountIdentity, deleteAuthUser } from '@/server/account/identity';
import { getSupabaseAuthServer } from '@/server/auth/supabaseSession';
import { deleteLeadByEmail } from '@/server/leads/leadRepo';
import { sendUnsubscribeToAgent } from '@/server/businessAgent/newsletter';
import { eraseAccountInAgent, syncAccountToAgent } from '@/server/businessAgent/account';
import { deleteCustomer, updateCustomer, type CustomerProfile, type CustomerProfileInput } from '@/server/square/customers';
import type { AccountIdentity } from '@/server/account/identity';

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

/**
 * They're a customer in the Business Agent too (the café's back office), with
 * what we know here: on each visit to the account page (so the first sign-in
 * adds them) and after each edit. It only fills what the café hasn't got, and
 * runs after the answer, so it never slows the page. Only for a confirmed email.
 */
function syncToAgent(identity: AccountIdentity, profile: CustomerProfile = identity.customer) {
  if (!identity.emailVerified) return;
  after(async () => {
    await syncAccountToAgent({
      email: identity.email,
      name: [profile.givenName, profile.familyName].filter(Boolean).join(' ') || null,
      phone: profile.phoneNumber,
      squareCustomerId: profile.id,
    });
  });
}

export async function GET() {
  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: 'accounts_unavailable' }, { status: 503 });
  }
  try {
    const identity = await getAccountIdentity();
    if (!identity) return unauthorised();
    syncToAgent(identity);
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
    syncToAgent(identity, profile);
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

    // Erasure covers every store: the Business Agent's customer record, the
    // Square profile, our newsletter rows and the Supabase Auth user. Paid
    // orders stay — accounting, not marketing.
    // The agent erases them (or blanks them where its rewards ledger has to
    // stay, and unsubscribes them). If it can't just then, at least their yes
    // to marketing goes, and the log says so for the café to erase them there.
    // Only a confirmed email is erased there: it's taken as theirs.
    const erased = identity.emailVerified ? await eraseAccountInAgent(identity.email) : null;
    if (!erased) {
      if (identity.emailVerified) console.error('Business Agent erase did not happen: unsubscribed only; erase them on its Customers page');
      await sendUnsubscribeToAgent(identity.email);
    }
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
