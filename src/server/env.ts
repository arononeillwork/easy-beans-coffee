import 'server-only';
import { z } from 'zod';

/**
 * Server env access, validated per feature area so a missing Square secret
 * doesn't break unrelated routes (e.g. email signup). Never import this from
 * client code.
 */

/** Truncated echo of a bad value — enough to spot a mis-pasted key without logging a whole secret. */
function preview(value: unknown): string {
  if (typeof value !== 'string') return JSON.stringify(value) ?? 'undefined';
  return value.length > 10 ? `"${value.slice(0, 10)}…"` : `"${value}"`;
}

const supabaseEnvSchema = z.object({
  url: z.url({ message: 'NEXT_PUBLIC_SUPABASE_URL must be a URL' }),
  serviceRoleKey: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
});

export function getSupabaseServerEnv() {
  return supabaseEnvSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

const squareEnvSchema = z.object({
  environment: z.enum(['sandbox', 'production'], {
    error: (issue) =>
      `SQUARE_ENVIRONMENT must be "sandbox" or "production" (received ${preview(issue.input)})`,
  }),
  accessToken: z.string().min(1, 'SQUARE_ACCESS_TOKEN is required'),
  locationId: z.string().min(1, 'SQUARE_LOCATION_ID is required'),
});

/** Blank/whitespace-only vars are treated as unset; `??` alone would let `''` through. */
function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getSquareEnv() {
  return squareEnvSchema.parse({
    environment: optionalEnv('SQUARE_ENVIRONMENT')?.toLowerCase() ?? 'sandbox',
    accessToken: optionalEnv('SQUARE_ACCESS_TOKEN'),
    locationId: optionalEnv('SQUARE_LOCATION_ID'),
  });
}

const webhookEnvSchema = z.object({
  signatureKey: z.string().min(1, 'SQUARE_WEBHOOK_SIGNATURE_KEY is required'),
  notificationUrl: z.url({ message: 'SQUARE_WEBHOOK_NOTIFICATION_URL must be a URL' }),
});

export function getWebhookEnv() {
  return webhookEnvSchema.parse({
    signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    notificationUrl: process.env.SQUARE_WEBHOOK_NOTIFICATION_URL,
  });
}

/**
 * Raw catalog exclusion rules (see `square/catalogFilters`). Returned unparsed,
 * and deliberately not via `optionalEnv`: unset means "use the defaults" while
 * an explicitly empty value means "filter nothing".
 */
export function getCatalogExcludeRulesEnv(): string | undefined {
  return process.env.SQUARE_EXCLUDE_RULES;
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

const smtpEnvSchema = z.object({
  from: z.string().min(1, 'EMAIL_FROM is required to send lead email'),
  replyTo: z.string().optional(),
});

/** Mail is optional infrastructure: a missing SMTP config must not fail a signup. */
export function isEmailConfigured(): boolean {
  return Boolean(
    optionalEnv('SMTP_HOST') &&
      optionalEnv('SMTP_PORT') &&
      optionalEnv('EMAIL_USER') &&
      optionalEnv('EMAIL_PASS') &&
      optionalEnv('EMAIL_FROM'),
  );
}

export function getEmailEnv() {
  return smtpEnvSchema.parse({
    from: optionalEnv('EMAIL_FROM'),
    replyTo: optionalEnv('EMAIL_REPLY_TO'),
  });
}

/** The subscribe modal promises "10% off for 6 months after sign up". */
const OFFER_DEFAULT_VALID_DAYS = 183;

export interface OfferConfig {
  /** Off until the shop opens: codes accumulate now, redeem later. */
  redemptionEnabled: boolean;
  percentage: number;
  /** Days a code stays good after issue. OFFER_VALID_DAYS overrides the 6-month default. */
  validDays: number;
}

export function getOfferConfig(): OfferConfig {
  const validDays = Number(optionalEnv('OFFER_VALID_DAYS'));
  return {
    redemptionEnabled: optionalEnv('OFFER_REDEMPTION_ENABLED')?.toLowerCase() === 'true',
    percentage: 10,
    validDays: Number.isFinite(validDays) && validDays > 0 ? validDays : OFFER_DEFAULT_VALID_DAYS,
  };
}

export function getCafeTimezone(): string {
  return process.env.CAFE_TIMEZONE ?? 'Europe/Madrid';
}

const supabaseAuthEnvSchema = z.object({
  url: z.url({ message: 'NEXT_PUBLIC_SUPABASE_URL must be a URL' }),
  anonKey: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

/**
 * The anon-key pair the server uses to read a visitor's Supabase Auth session
 * from cookies. Distinct from getSupabaseServerEnv: that is the service role
 * (RLS bypass), this is the public key that only validates JWTs.
 */
export function getSupabaseAuthEnv() {
  return supabaseAuthEnvSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/**
 * Accounts are a feature switch: Supabase Auth handles sign-in (sessions,
 * passwords, verification emails — no code management here) and the service
 * role links each user to their Square customer profile. Missing either means
 * every account route answers 503 and the rest of the site is unaffected.
 */
export function isAccountAuthConfigured(): boolean {
  return Boolean(
    optionalEnv('NEXT_PUBLIC_SUPABASE_URL') &&
      optionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') &&
      optionalEnv('SUPABASE_SERVICE_ROLE_KEY'),
  );
}
