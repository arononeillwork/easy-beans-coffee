import 'server-only';
import { getSupabaseAdmin } from '../supabaseAdmin';

export type DrawStatus = 'pending_approval' | 'approved' | 'no_entries';

export interface DrawRow {
  draw_month: string;
  status: DrawStatus;
  entry_count: number;
  winner_entry_id: string | null;
  excluded_entry_ids: string[];
  admin_token: string;
  drawn_at: string;
  admin_notified_at: string | null;
  admin_reminded_at: string | null;
  approved_at: string | null;
  gift_card_id: string | null;
  gift_card_gan: string | null;
  gift_card_error: string | null;
  gift_card_expires_at: string | null;
  gift_card_cleared_at: string | null;
  winner_emailed_at: string | null;
  winner_token: string;
  ig_consent: boolean | null;
  ig_consent_at: string | null;
  ig_post_id: string | null;
  ig_posted_at: string | null;
  ig_post_error: string | null;
  ig_error_notified_at: string | null;
}

export interface EntryRow {
  id: string;
  draw_month: string;
  full_name: string;
  email: string;
  phone: string | null;
  instagram_handle: string;
  lang: string | null;
  created_at: string;
}

const ENTRY_FIELDS = 'id, draw_month, full_name, email, phone, instagram_handle, lang, created_at';

function fail(what: string, error: { code?: string; message: string }): never {
  throw new Error(`${what}: ${error.code ?? 'unknown'} ${error.message}`);
}

export async function getDraw(month: string): Promise<DrawRow | null> {
  const { data, error } = await getSupabaseAdmin().from('competition_draws').select('*').eq('draw_month', month).maybeSingle();
  if (error) fail('getDraw', error);
  return (data as DrawRow | null) ?? null;
}

export async function getDrawByToken(kind: 'admin' | 'winner', token: string): Promise<DrawRow | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const column = kind === 'admin' ? 'admin_token' : 'winner_token';
  const { data, error } = await getSupabaseAdmin().from('competition_draws').select('*').eq(column, token).maybeSingle();
  if (error) fail('getDrawByToken', error);
  return (data as DrawRow | null) ?? null;
}

export async function listDraws(limit = 24): Promise<DrawRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('competition_draws')
    .select('*')
    .order('draw_month', { ascending: false })
    .limit(limit);
  if (error) fail('listDraws', error);
  return (data as DrawRow[]) ?? [];
}

/** Inserts a new draw; returns false if one already exists for the month (another run got there first). */
export async function insertDraw(row: Partial<DrawRow> & { draw_month: string }): Promise<boolean> {
  const { error } = await getSupabaseAdmin().from('competition_draws').insert(row);
  if (!error) return true;
  if (error.code === '23505') return false;
  fail('insertDraw', error);
}

export async function updateDraw(month: string, patch: Partial<DrawRow>, onlyIfStatus?: DrawStatus): Promise<DrawRow | null> {
  let q = getSupabaseAdmin()
    .from('competition_draws')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('draw_month', month);
  if (onlyIfStatus) q = q.eq('status', onlyIfStatus);
  const { data, error } = await q.select('*').maybeSingle();
  if (error) fail('updateDraw', error);
  return (data as DrawRow | null) ?? null;
}

export async function listEntries(month: string): Promise<EntryRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('competition_entries')
    .select(ENTRY_FIELDS)
    .eq('draw_month', month)
    .order('created_at', { ascending: true });
  if (error) fail('listEntries', error);
  return (data as EntryRow[]) ?? [];
}

export async function getEntry(id: string): Promise<EntryRow | null> {
  const { data, error } = await getSupabaseAdmin().from('competition_entries').select(ENTRY_FIELDS).eq('id', id).maybeSingle();
  if (error) fail('getEntry', error);
  return (data as EntryRow | null) ?? null;
}

/** Months (YYYY-MM-01) up to `through` that have entries but no draw yet. */
export async function undrawnMonths(through: string): Promise<string[]> {
  const db = getSupabaseAdmin();
  const [{ data: entries, error: e1 }, { data: draws, error: e2 }] = await Promise.all([
    db.from('competition_entries').select('draw_month').lte('draw_month', through),
    db.from('competition_draws').select('draw_month'),
  ]);
  if (e1) fail('undrawnMonths entries', e1);
  if (e2) fail('undrawnMonths draws', e2);
  const done = new Set((draws ?? []).map((d) => d.draw_month as string));
  return [...new Set((entries ?? []).map((e) => e.draw_month as string))].filter((m) => !done.has(m)).sort();
}

export async function markEntryWinner(entryId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('competition_entries')
    .update({ is_winner: true, winner_confirmed_at: new Date().toISOString() })
    .eq('id', entryId);
  if (error) fail('markEntryWinner', error);
}
