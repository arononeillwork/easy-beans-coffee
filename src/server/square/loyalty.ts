import 'server-only';
import { SquareError } from 'square';
import { getSquareClient } from './client';

/**
 * The site's read-only window onto Square Loyalty. The café's programme —
 * what a point is called (beans), how they accrue, and what they buy — is
 * configured entirely in the Square Dashboard; this module only reports it.
 * Earning and redeeming stay at the till, so the site can never disagree
 * with the counter about a balance.
 */

export interface LoyaltyRewardTier {
  id: string;
  name: string;
  /** Points (beans) exchanged for this reward. */
  points: number;
}

export interface LoyaltyProgramSummary {
  /** What the Dashboard calls one point — e.g. "Bean". */
  one: string;
  /** And several — e.g. "Beans". */
  other: string;
  /** The rewards on offer, cheapest first. */
  tiers: LoyaltyRewardTier[];
}

/**
 * The seller's single loyalty programme (`main` is Square's keyword for it),
 * or null when none is configured or it is switched off — the rewards
 * section simply does not render then.
 */
export async function getLoyaltyProgram(): Promise<LoyaltyProgramSummary | null> {
  let program;
  try {
    program = (await getSquareClient().loyalty.programs.get({ programId: 'main' })).program;
  } catch (err) {
    if (err instanceof SquareError && err.statusCode === 404) return null;
    throw err;
  }
  if (!program || program.status !== 'ACTIVE') return null;

  return {
    one: program.terminology?.one ?? 'Point',
    other: program.terminology?.other ?? 'Points',
    tiers: (program.rewardTiers ?? [])
      .map((tier) => ({ id: tier.id ?? '', name: tier.name ?? '', points: tier.points }))
      .sort((a, b) => a.points - b.points),
  };
}

export interface LoyaltyBalance {
  /** Points available to spend. Square allows negatives after refunds. */
  balance: number;
  /** Points ever collected. */
  lifetimePoints: number;
}

/**
 * The customer's balance, or null when they have no loyalty account yet —
 * enrolment happens at the till (by phone number), not here, so a missing
 * account is a normal state and not an error.
 */
export async function getLoyaltyBalance(customerId: string): Promise<LoyaltyBalance | null> {
  const response = await getSquareClient().loyalty.accounts.search({
    query: { customerIds: [customerId] },
    limit: 1,
  });
  const account = response.loyaltyAccounts?.[0];
  if (!account) return null;
  return { balance: account.balance ?? 0, lifetimePoints: account.lifetimePoints ?? 0 };
}
