import { isLeadsAdmin } from '@/server/leads/adminAuth';
import { listLeads } from '@/server/leads/leadRepo';

export const dynamic = 'force-dynamic';

const COLUMNS = [
  'email',
  'phone',
  'source',
  'lang',
  'offer_optin',
  'events_optin',
  'interests',
  'offer_code',
  'offer_redeemed_at',
  'unsubscribed_at',
  'created_at',
  'last_seen_at',
] as const;

/**
 * Quotes every field rather than only the risky ones. A leading `=`, `+`, `-`
 * or `@` is also prefixed with a quote: spreadsheet apps treat those as
 * formulas, and an email address is attacker-supplied text.
 */
function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await isLeadsAdmin())) {
    return new Response('Not found', { status: 404 });
  }

  const leads = await listLeads();
  const rows = [
    COLUMNS.join(','),
    ...leads.map((lead) => COLUMNS.map((column) => csvCell(lead[column])).join(',')),
  ];
  // BOM so Excel opens the accented names as UTF-8 rather than mojibake.
  const body = `﻿${rows.join('\r\n')}\r\n`;

  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="easy-beans-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
