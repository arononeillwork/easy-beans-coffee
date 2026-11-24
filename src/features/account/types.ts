import type { PublicOrderStatus } from '@/features/order/types';

/**
 * The account profile as `/api/account` serves it — a client-side mirror of
 * the server's `CustomerProfile` (src/server/square/customers.ts), which is
 * itself the slice of Square's customer record the site uses.
 */
export interface AccountAddress {
  addressLine1: string | null;
  addressLine2: string | null;
  locality: string | null;
  postalCode: string | null;
}

export interface AccountProfile {
  id: string;
  emailAddress: string | null;
  givenName: string | null;
  familyName: string | null;
  phoneNumber: string | null;
  /** `YYYY-MM-DD`. */
  birthday: string | null;
  address: AccountAddress | null;
}

/**
 * The rewards snapshot as `/api/account/rewards` serves it — the Square
 * loyalty programme plus the signed-in customer's own balance. `program` is
 * null when the café has no active programme; `balance` is null when the
 * customer has not been enrolled at the till yet.
 */
export interface AccountRewards {
  program: {
    /** Square's name for one point — "Bean" — and for several. */
    one: string;
    other: string;
    tiers: Array<{ id: string; name: string; points: number }>;
  } | null;
  balance: number | null;
  lifetimePoints: number | null;
}

/**
 * One collection order on the account page, as `/api/account/orders` serves
 * it. `status` is the same customer-facing status the order's own status page
 * shows; `token` opens that page.
 */
export interface AccountOrder {
  token: string;
  /** Last six of the Square order id, as the receipt and the counter call it. */
  orderNumber: string | null;
  createdAt: string;
  status: PublicOrderStatus;
  totalCents: number;
  currency: string;
  /** "2 × Flat white", one entry per line. */
  items: string[];
}

/**
 * The editable subset, as the PUT endpoint expects it. The email is the
 * Supabase Auth login key and is not edited through the profile.
 */
export interface AccountUpdate {
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  birthday?: string;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    locality?: string;
    postalCode?: string;
  } | null;
}

/**
 * The coffee club as `/api/account/club` serves it, from the Business Agent
 * (its account summary's `club`; docs/WEBSITE.md there). Null when the café
 * has no club, or the agent couldn't be asked.
 */
export interface AccountClub {
  name: string;
  /** A month, in `currency`. */
  price: number;
  currency: string;
  coffees_per_week: number;
  /** Square's checkout page to join; null for a member, or while the café isn't taking members. */
  join_url: string | null;
  /** Their membership; null when they aren't a member (or it has ended). */
  pass: {
    standing: 'active' | 'ending' | 'pending' | 'paused' | 'payment_failed';
    used_this_week: number;
    /** 0 unless the membership is active and paid. */
    left_this_week: number;
    /** This week's Monday (`YYYY-MM-DD`): a new week's coffees start then. */
    week_start: string;
    started_on: string | null;
    /** The last day a cancelled membership runs. */
    ends_on: string | null;
    /** Their member code (8 letters and digits), shown as a Code 128 barcode. Null until the agent gives one. */
    card_code?: string | null;
  } | null;
}
