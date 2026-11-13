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
 * The rewards snapshot as `/api/account/rewards` serves it, read from the
 * Business Agent (src/server/businessAgent/account.ts): their beans from
 * Square Loyalty, their credit from the café's reps ledger, how posts earn
 * cashback, and their code if they're a rep. Each part is null when it doesn't
 * apply (no loyalty account yet, no credit, cashback off, not a rep).
 */
export interface AccountRewards {
  firstName: string | null;
  points: {
    program: {
      /** Square's name for one point — "Bean" — and for several. */
      one: string;
      other: string;
      tiers: Array<{ id: string; name: string; points: number }>;
    };
    balance: number;
    lifetime: number;
  } | null;
  credit: {
    /** Euros to spend at the till (with the gift card on file). */
    balance: number;
    /** Waiting for the café's OK. */
    pending: number;
    gift_card_linked: boolean;
    lines: Array<{ date: string; label: string; amount: number; status: 'pending' | 'approved' | 'rejected'; note: string | null }>;
  } | null;
  cashback: { on: true; per_1000_views: number; per_100_likes: number; per_follower: number; max: number } | null;
  rep: {
    code: string;
    kind: 'team' | 'ambassador' | 'customer';
    earns: 'credit' | 'commission';
    reach: number;
    reach_step: string;
    reach_step_id?: string;
    multiplier: number;
    crew: { leads: boolean; members: number };
    this_month: number;
  } | null;
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
