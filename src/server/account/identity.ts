import 'server-only';
import { getSupabaseAdmin } from '../supabaseAdmin';
import { getAuthUser } from '../auth/supabaseSession';
import {
  findCustomerByEmail,
  findOrCreateCustomerByEmail,
  getCustomerById,
  type CustomerProfile,
} from '../square/customers';
import { seedNewCustomerFields } from '../square/customerAttributes';

/**
 * The bridge between the two systems: Supabase Auth says WHO is signed in,
 * Square's Customer Directory holds WHAT we know about them. The link — a
 * Square customer id in the user's app_metadata — is made lazily on the first
 * authenticated request and self-heals if the profile is deleted or merged
 * away in the Square Dashboard.
 */

export interface AccountIdentity {
  userId: string;
  email: string;
  customer: CustomerProfile;
}

async function linkSquareCustomer(userId: string, customerId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, {
    app_metadata: { square_customer_id: customerId },
  });
  // Non-fatal: the link is a cache; the next request redoes the email lookup.
  if (error) console.error('square customer link failed', { message: error.message });
}

/** The signed-in visitor with their Square profile, or null when signed out. */
export async function getAccountIdentity(): Promise<AccountIdentity | null> {
  const user = await getAuthUser();
  if (!user) return null;

  if (user.squareCustomerId) {
    const linked = await getCustomerById(user.squareCustomerId);
    if (linked) return { userId: user.id, email: user.email, customer: linked };
    // Profile gone (deleted or merged in the Dashboard) — fall through, relink.
  }

  const existing = await findCustomerByEmail(user.email);
  if (existing) {
    await linkSquareCustomer(user.id, existing.id);
    return { userId: user.id, email: user.email, customer: existing };
  }

  // A genuinely new customer: create the profile, then stamp the directory's
  // custom fields (Lead Source = Website, Created On = today).
  const created = await findOrCreateCustomerByEmail(user.email);
  await seedNewCustomerFields(created.id);
  await linkSquareCustomer(user.id, created.id);
  return { userId: user.id, email: user.email, customer: created };
}

/** GDPR erasure of the sign-in itself; Square/lead cleanup happens beside it. */
export async function deleteAuthUser(userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);
  if (error) throw new Error(`auth user deletion failed: ${error.message}`);
}
