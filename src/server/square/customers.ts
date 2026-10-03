import 'server-only';
import { createHash } from 'node:crypto';
import { SquareError, type Square } from 'square';
import { getSquareClient } from './client';

/**
 * The site's one door to Square's Customer Directory. Accounts and the
 * newsletter sync both go through here, never through the SDK directly.
 *
 * Email uniqueness: Square does NOT enforce it — the directory happily holds
 * two profiles with the same address (the till can create one, an import
 * another). This module enforces it instead:
 *
 *   • every write goes find-first through an exact-email search, so an
 *     existing profile is updated rather than duplicated;
 *   • creates use an idempotency key derived from the email, so two
 *     concurrent submits collapse into one profile on Square's side;
 *   • if duplicates exist anyway (made outside this site), the OLDEST profile
 *     is treated as canonical everywhere, so the pick is deterministic.
 *
 * Emails are lowercased before they touch Square, which keeps the exact-match
 * search reliable.
 */

/** The Square customer fields the site reads and writes. */
export interface CustomerProfile {
  id: string;
  emailAddress: string | null;
  givenName: string | null;
  familyName: string | null;
  phoneNumber: string | null;
  /** `YYYY-MM-DD`; Square also allows `0000-MM-DD` to withhold the year. */
  birthday: string | null;
  address: CustomerAddress | null;
}

export interface CustomerAddress {
  addressLine1: string | null;
  addressLine2: string | null;
  /** City or town. */
  locality: string | null;
  postalCode: string | null;
}

/** Fields a signed-in customer may change. `null` clears a field on Square. */
export interface CustomerProfileInput {
  givenName?: string | null;
  familyName?: string | null;
  emailAddress?: string;
  phoneNumber?: string | null;
  birthday?: string | null;
  address?: CustomerAddress | null;
}

/** The café is in Spain; the form does not ask, so every address stores as ES. */
const ADDRESS_COUNTRY = 'ES';

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Stable per-email idempotency key. Two concurrent creates for the same
 * address send the same key, and Square folds them into a single profile —
 * the race that a find-then-create on our side alone could not close.
 */
function createIdempotencyKey(email: string): string {
  return createHash('sha256').update(`customer:${normaliseEmail(email)}`).digest('hex');
}

function toProfile(customer: Square.Customer): CustomerProfile {
  return {
    id: customer.id ?? '',
    emailAddress: customer.emailAddress ?? null,
    givenName: customer.givenName ?? null,
    familyName: customer.familyName ?? null,
    phoneNumber: customer.phoneNumber ?? null,
    birthday: customer.birthday ?? null,
    address: customer.address
      ? {
          addressLine1: customer.address.addressLine1 ?? null,
          addressLine2: customer.address.addressLine2 ?? null,
          locality: customer.address.locality ?? null,
          postalCode: customer.address.postalCode ?? null,
        }
      : null,
  };
}

/** The request shape shared by create and update. */
type SquareCustomerFields = Omit<Square.UpdateCustomerRequest, 'customerId'>;

function toSquareFields(input: CustomerProfileInput): SquareCustomerFields {
  const fields: SquareCustomerFields = {};
  if (input.givenName !== undefined) fields.givenName = input.givenName;
  if (input.familyName !== undefined) fields.familyName = input.familyName;
  if (input.emailAddress !== undefined) fields.emailAddress = normaliseEmail(input.emailAddress);
  if (input.phoneNumber !== undefined) fields.phoneNumber = input.phoneNumber;
  if (input.birthday !== undefined) fields.birthday = input.birthday;
  if (input.address !== undefined) {
    // Square merges addresses field by field, so every line is sent
    // explicitly: null clears it. "Remove my address" is the same write with
    // every line null — the request type has no null at the address level.
    fields.address = {
      addressLine1: input.address?.addressLine1 ?? null,
      addressLine2: input.address?.addressLine2 ?? null,
      locality: input.address?.locality ?? null,
      postalCode: input.address?.postalCode ?? null,
      country: ADDRESS_COUNTRY,
    };
  }
  return fields;
}

/**
 * The create request refuses nulls — on a profile that does not exist yet
 * there is nothing to clear — so "clear this field" inputs simply drop.
 */
function toCreateFields(input: CustomerProfileInput): Omit<Square.CreateCustomerRequest, 'idempotencyKey'> {
  const fields: Omit<Square.CreateCustomerRequest, 'idempotencyKey'> = {};
  if (input.givenName != null) fields.givenName = input.givenName;
  if (input.familyName != null) fields.familyName = input.familyName;
  if (input.emailAddress != null) fields.emailAddress = normaliseEmail(input.emailAddress);
  if (input.phoneNumber != null) fields.phoneNumber = input.phoneNumber;
  if (input.birthday != null) fields.birthday = input.birthday;
  if (input.address != null) {
    fields.address = {
      addressLine1: input.address.addressLine1 ?? undefined,
      addressLine2: input.address.addressLine2 ?? undefined,
      locality: input.address.locality ?? undefined,
      postalCode: input.address.postalCode ?? undefined,
      country: ADDRESS_COUNTRY,
    };
  }
  return fields;
}

function isNotFound(err: unknown): boolean {
  return err instanceof SquareError && err.statusCode === 404;
}

/**
 * Exact-email lookup — one filtered search, never a walk of the directory.
 * Duplicates (possible when profiles were made at the till) resolve to the
 * oldest profile and are logged so they can be merged in the Square Dashboard.
 */
export async function findCustomerByEmail(email: string): Promise<CustomerProfile | null> {
  const response = await getSquareClient().customers.search({
    query: { filter: { emailAddress: { exact: normaliseEmail(email) } } },
  });

  const matches = response.customers ?? [];
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    console.warn('duplicate Square customers for one email — using the oldest', {
      count: matches.length,
      ids: matches.map((c) => c.id),
    });
  }

  const oldest = [...matches].sort((a, b) =>
    (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  )[0];
  return toProfile(oldest);
}

export async function getCustomerById(customerId: string): Promise<CustomerProfile | null> {
  try {
    const response = await getSquareClient().customers.get({ customerId });
    return response.customer ? toProfile(response.customer) : null;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/**
 * The only signup path: an existing profile wins, otherwise one is created.
 * Callers never call a bare create, which is what keeps emails unique.
 */
export async function findOrCreateCustomerByEmail(
  email: string,
  extra: CustomerProfileInput = {},
): Promise<CustomerProfile> {
  const existing = await findCustomerByEmail(email);
  if (existing) return existing;

  const response = await getSquareClient().customers.create({
    idempotencyKey: createIdempotencyKey(email),
    ...toCreateFields(extra),
    emailAddress: normaliseEmail(email),
  });

  if (!response.customer?.id) throw new Error('Square returned no customer on create');
  return toProfile(response.customer);
}

/** Sparse update: only the fields present in `input` change on Square. */
export async function updateCustomer(
  customerId: string,
  input: CustomerProfileInput,
): Promise<CustomerProfile> {
  const response = await getSquareClient().customers.update({
    ...toSquareFields(input),
    customerId,
  });
  if (!response.customer) throw new Error('Square returned no customer on update');
  return toProfile(response.customer);
}

/** GDPR erasure. Idempotent: deleting an already-deleted profile is success. */
export async function deleteCustomer(customerId: string): Promise<void> {
  try {
    await getSquareClient().customers.delete({ customerId });
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
}

/**
 * Newsletter → directory mirror, called after a signup is safely stored.
 * Additive only: it fills a missing phone number but never overwrites what
 * the till already knows about a customer.
 */
export async function upsertNewsletterSubscriber(input: {
  email: string;
  phone: string | null;
}): Promise<void> {
  const existing = await findCustomerByEmail(input.email);

  if (!existing) {
    await findOrCreateCustomerByEmail(input.email, { phoneNumber: input.phone });
    return;
  }
  if (input.phone && !existing.phoneNumber) {
    await updateCustomer(existing.id, { phoneNumber: input.phone });
  }
}
