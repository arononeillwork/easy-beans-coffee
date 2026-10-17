import 'server-only';
import { getSupabaseAdmin } from '../supabaseAdmin';

export interface CompetitionEntryInput {
  leadId: string;
  drawMonth: string;
  fullName: string;
  email: string;
  phone: string | null;
  instagramHandle: string;
  source: string | null;
  lang: 'en' | 'es';
  ip: string | null;
  userAgent: string | null;
}

/**
 * Records one entry for the month's draw. Returns false when this email has
 * already entered the same draw (the unique index), so a double-submit is a
 * friendly "you're already in" rather than an error.
 */
export async function recordCompetitionEntry(input: CompetitionEntryInput): Promise<boolean> {
  const { error } = await getSupabaseAdmin().from('competition_entries').insert({
    lead_id: input.leadId,
    draw_month: input.drawMonth,
    full_name: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    instagram_handle: input.instagramHandle,
    marketing_optin: true,
    source: input.source,
    lang: input.lang,
    ip: input.ip,
    user_agent: input.userAgent,
  });

  if (!error) return true;
  if (error.code === '23505') return false;
  throw new Error(`competition entry insert failed: ${error.code ?? 'unknown'} ${error.message}`);
}
