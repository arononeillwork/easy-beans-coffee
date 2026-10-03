import 'server-only';
import { getSupabaseAdmin } from '../supabaseAdmin';
import { getOfferConfig } from '../env';
import { generateOfferCode } from './offerCode';

export type LeadSource = 'first_visit_popup' | 'newsletter_section' | (string & {});

export interface CaptureLeadInput {
  email: string;
  source: LeadSource;
  lang?: 'en' | 'es' | null;
  /** The subscribe modal's 10% code. Implies we owe them a code and an email. */
  offerOptin: boolean;
  /** The events form, which is promised "no offers" — keep the two apart. */
  eventsOptin: boolean;
  /** Newsletter topics ticked in the subscribe modal; validated upstream. */
  interests?: string[];
  /** Optional — a nice-to-have for Square customer records, never required. */
  phone?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CapturedLead {
  leadId: string;
  offerCode: string | null;
  /** True only when this call issued the code, so a repeat submit can't re-mail. */
  codeIssuedNow: boolean;
}

function offerExpiresAt(): string | null {
  const { validDays } = getOfferConfig();
  if (!validDays) return null;
  return new Date(Date.now() + validDays * 86_400_000).toISOString();
}

/**
 * Records a submission through the `capture_lead` function, which merges
 * consent and writes the touch row in one statement. See migration 0007 for
 * the merge rules.
 */
export async function captureLead(input: CaptureLeadInput): Promise<CapturedLead> {
  const supabase = getSupabaseAdmin();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase.rpc('capture_lead', {
      p_email: input.email.toLowerCase(),
      p_source: input.source,
      p_lang: input.lang ?? null,
      p_offer_optin: input.offerOptin,
      p_events_optin: input.eventsOptin,
      p_offer_code: input.offerOptin ? generateOfferCode() : null,
      p_offer_expires_at: input.offerOptin ? offerExpiresAt() : null,
      p_ip: input.ip ?? null,
      p_user_agent: input.userAgent ?? null,
      p_interests: input.interests ?? [],
      p_phone: input.phone ?? null,
    });

    if (error) {
      // Email conflicts are merged inside the function, so a 23505 out here can
      // only be the offer_code unique index — worth one more roll of the dice.
      if (error.code === '23505' && attempt < 2) continue;
      throw new Error(`capture_lead failed: ${error.code ?? 'unknown'} ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('capture_lead returned no row');

    return {
      leadId: row.lead_id,
      offerCode: row.lead_offer_code ?? null,
      codeIssuedNow: row.code_issued_now ?? false,
    };
  }

  throw new Error('capture_lead exhausted offer-code retries');
}

/**
 * Single opt-in means anyone can type a stranger's address, so submissions are
 * capped per IP. Fails open: a broken counter must not block real signups.
 */
export async function recentSignupCount(ip: string, withinMinutes: number): Promise<number> {
  const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
  const { count, error } = await getSupabaseAdmin()
    .from('lead_touches')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', since);

  if (error) {
    console.error('lead rate-limit lookup failed', { code: error.code, message: error.message });
    return 0;
  }
  return count ?? 0;
}

export interface RedeemableOffer {
  leadId: string;
  code: string;
}

/**
 * Returns the offer only while it is unexpired. The 10% code is good for every
 * online order across its 6-month window, so a past redemption does not spend
 * it — `offer_redeemed_at` records the first use, nothing more.
 */
export async function findRedeemableOffer(code: string): Promise<RedeemableOffer | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('email_signups')
    .select('id, offer_code, offer_expires_at, offer_redeemed_at, unsubscribed_at')
    .eq('offer_code', code)
    .maybeSingle();

  if (error) {
    console.error('offer lookup failed', { code: error.code, message: error.message });
    return null;
  }
  if (!data?.offer_code) return null;
  if (data.offer_expires_at && Date.parse(data.offer_expires_at) < Date.now()) return null;

  return { leadId: data.id, code: data.offer_code };
}

/**
 * Records the code's first use. Called from the Square payment webhook, never
 * at checkout-link creation — an abandoned checkout is not a use. The `is null`
 * filter makes the update itself the concurrency guard: later orders and
 * replayed webhooks return false and leave the first-use row untouched.
 */
export async function markOfferRedeemed(code: string, orderId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('email_signups')
    .update({ offer_redeemed_at: new Date().toISOString(), offer_order_id: orderId })
    .eq('offer_code', code)
    .is('offer_redeemed_at', null)
    .select('id');

  if (error) {
    console.error('offer redemption failed', { code: error.code, message: error.message });
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** One-click unsubscribe from the link in every email. Drops both consents. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('email_signups')
    .update({
      unsubscribed_at: new Date().toISOString(),
      offer_optin: false,
      events_optin: false,
    })
    .eq('unsubscribe_token', token)
    .select('id');

  if (error) {
    console.error('unsubscribe failed', { code: error.code, message: error.message });
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * GDPR erasure, driven from account deletion. Removes the lead row and, via
 * cascade, its touch history. Emails are stored lowercased by capture_lead;
 * ilike (with wildcards escaped) also catches any pre-0007 mixed-case rows.
 */
export async function deleteLeadByEmail(email: string): Promise<void> {
  const pattern = email.toLowerCase().replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { error } = await getSupabaseAdmin().from('email_signups').delete().ilike('email', pattern);
  if (error) {
    throw new Error(`lead erasure failed: ${error.code ?? 'unknown'} ${error.message}`);
  }
}

export async function getUnsubscribeToken(leadId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('email_signups')
    .select('unsubscribe_token')
    .eq('id', leadId)
    .maybeSingle();

  if (error) {
    console.error('unsubscribe token lookup failed', { code: error.code });
    return null;
  }
  return data?.unsubscribe_token ?? null;
}

export interface LeadRow {
  id: string;
  email: string;
  lang: string | null;
  source: string;
  offer_optin: boolean;
  events_optin: boolean;
  interests: string[];
  phone: string | null;
  offer_code: string | null;
  offer_redeemed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
  last_seen_at: string;
}

const LEAD_COLUMNS =
  'id, email, lang, source, offer_optin, events_optin, interests, phone, offer_code, offer_redeemed_at, unsubscribed_at, created_at, last_seen_at';

/** Admin listing. `limit` is generous because export needs the whole list. */
export async function listLeads(limit = 2000): Promise<LeadRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('email_signups')
    .select(LEAD_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`lead listing failed: ${error.message}`);
  return (data ?? []) as LeadRow[];
}
