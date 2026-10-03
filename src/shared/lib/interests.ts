/**
 * The topics the subscribe modal lets a lead tick. These keys are the stored
 * vocabulary — `/api/signup` validates against them and Postgres keeps them in
 * `email_signups.interests` — so they must stay stable across languages.
 * The human labels live in the locale dictionaries under `popup.interests`.
 */
export const INTEREST_KEYS = ['coffee', 'spanish', 'english', 'menu', 'events', 'offers'] as const;

export type InterestKey = (typeof INTEREST_KEYS)[number];
