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
