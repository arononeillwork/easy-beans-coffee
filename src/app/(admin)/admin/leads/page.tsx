import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { isLeadsAdmin, isLeadsAdminConfigured, matchesAdminToken, ADMIN_COOKIE } from '@/server/leads/adminAuth';
import { listLeads, type LeadRow } from '@/server/leads/leadRepo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leads · Easy Beans Coffee', robots: { index: false, follow: false } };

/**
 * Server-rendered on purpose: the rows never reach the browser as data, only as
 * markup, and there is no client bundle to leak the service-role path.
 */

async function signIn(formData: FormData) {
  'use server';
  const token = formData.get('token');
  if (typeof token === 'string' && matchesAdminToken(token)) {
    (await cookies()).set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      // Root path so the CSV route under /api/admin also receives it.
      path: '/',
      maxAge: 60 * 60 * 12,
    });
  }
  redirect('/admin/leads');
}

const STYLES = `
  body { margin:0; background:#14131A; color:#EDEAF2; font-family:system-ui,sans-serif; }
  .wrap { max-width:1100px; margin:0 auto; padding:32px 24px 64px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:#9A93AC; font-size:14px; margin:0 0 24px; }
  .stats { display:flex; gap:12px; flex-wrap:wrap; margin:0 0 24px; }
  .stat { background:#1D1B26; border:1px solid #2C2937; border-radius:12px; padding:12px 16px; min-width:120px; }
  .stat b { display:block; font-size:22px; }
  .stat span { color:#9A93AC; font-size:12px; text-transform:uppercase; letter-spacing:0.06em; }
  .scroll { overflow-x:auto; border:1px solid #2C2937; border-radius:12px; }
  table { border-collapse:collapse; width:100%; font-size:13px; white-space:nowrap; }
  th, td { text-align:left; padding:10px 14px; border-bottom:1px solid #2C2937; }
  th { color:#9A93AC; font-weight:500; text-transform:uppercase; font-size:11px; letter-spacing:0.06em; }
  tr:last-child td { border-bottom:0; }
  .tag { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; border:1px solid #3B3748; }
  .yes { color:#A6E3A1; border-color:#39543A; }
  .no { color:#6C6680; }
  code { font-family:ui-monospace,monospace; color:#F79BA4; }
  a.btn { display:inline-block; background:#F79BA4; color:#1A1A1A; padding:8px 16px; border-radius:999px;
          text-decoration:none; font-size:13px; font-weight:600; }
  form.gate { max-width:320px; margin:80px auto; display:flex; flex-direction:column; gap:12px; }
  input { padding:10px 14px; border-radius:8px; border:1px solid #2C2937; background:#1D1B26; color:#EDEAF2; }
  button { padding:10px 14px; border-radius:999px; border:0; background:#F79BA4; font-weight:600; cursor:pointer; }
`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="wrap">{children}</div>
    </>
  );
}

function Flag({ on }: { on: boolean }) {
  return <span className={`tag ${on ? 'yes' : 'no'}`}>{on ? 'yes' : 'no'}</span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function LeadTable({ leads }: { leads: LeadRow[] }) {
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Phone</th>
            <th>Source</th>
            <th>Lang</th>
            <th>Offer</th>
            <th>Events</th>
            <th>Interests</th>
            <th>Code</th>
            <th>Redeemed</th>
            <th>Signed up</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} style={lead.unsubscribed_at ? { opacity: 0.45 } : undefined}>
              <td>{lead.email}</td>
              <td>{lead.phone ?? '—'}</td>
              <td>{lead.source}</td>
              <td>{lead.lang ?? '—'}</td>
              <td>
                <Flag on={lead.offer_optin} />
              </td>
              <td>
                <Flag on={lead.events_optin} />
              </td>
              <td>{lead.interests?.length ? lead.interests.join(', ') : '—'}</td>
              <td>{lead.offer_code ? <code>{lead.offer_code}</code> : '—'}</td>
              <td>{lead.offer_redeemed_at ? lead.offer_redeemed_at.slice(0, 10) : '—'}</td>
              <td>{lead.created_at.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function LeadsPage() {
  if (!isLeadsAdminConfigured()) {
    return (
      <Shell>
        <h1>Leads</h1>
        <p className="sub">
          Set <code>ADMIN_LEADS_TOKEN</code> in the environment to enable this page. Until then it
          stays shut — the list holds customer email addresses.
        </p>
      </Shell>
    );
  }

  if (!(await isLeadsAdmin())) {
    return (
      <Shell>
        <form className="gate" action={signIn}>
          <h1>Leads</h1>
          <input type="password" name="token" placeholder="Access token" autoComplete="off" />
          <button type="submit">Open</button>
        </form>
      </Shell>
    );
  }

  const leads = await listLeads();
  const active = leads.filter((l) => !l.unsubscribed_at);

  return (
    <Shell>
      <h1>Leads</h1>
      <p className="sub">Newest first. Dimmed rows have unsubscribed.</p>

      <div className="stats">
        <Stat label="Total" value={leads.length} />
        <Stat label="Offer list" value={active.filter((l) => l.offer_optin).length} />
        <Stat label="Events list" value={active.filter((l) => l.events_optin).length} />
        <Stat label="Codes redeemed" value={leads.filter((l) => l.offer_redeemed_at).length} />
        <Stat label="Unsubscribed" value={leads.length - active.length} />
      </div>

      <p>
        <a className="btn" href="/api/admin/leads/export">
          Download CSV
        </a>
      </p>

      <LeadTable leads={leads} />
    </Shell>
  );
}
