import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { isLeadsAdmin, isLeadsAdminConfigured, matchesAdminToken, ADMIN_COOKIE } from '@/server/leads/adminAuth';
import { getDraw, getDrawByToken, getEntry, listDraws, listEntries, type DrawRow, type EntryRow } from '@/server/competition/drawRepo';
import { approve, postWinnerToInstagram, redraw } from '@/server/competition/drawFlow';
import { drawMonthFor } from '@/server/competition/drawMonth';
import { monthLabel } from '@/server/email/competitionEmails';
import { prizeCents } from '@/server/competition/giftCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Competition · Easy Beans Coffee', robots: { index: false, follow: false } };

/**
 * Owner sign-off for the monthly €10 draw. Opened from the draw email (the
 * `t` link unlocks that one draw) or with the leads admin password (all draws).
 * Nothing reaches the winner until "Approve" here.
 */

async function canManage(month: string, token: string | null): Promise<boolean> {
  if (await isLeadsAdmin()) return true;
  if (!token) return false;
  const draw = await getDrawByToken('admin', token);
  return draw?.draw_month === month;
}

function back(token: string | null, msg: string): never {
  const q = new URLSearchParams();
  if (token) q.set('t', token);
  q.set('msg', msg);
  redirect(`/admin/competition?${q.toString()}`);
}

async function act(formData: FormData) {
  'use server';
  const month = String(formData.get('month') ?? '');
  const token = (formData.get('t') as string | null) || null;
  const action = String(formData.get('action') ?? '');
  if (!/^\d{4}-\d{2}-01$/.test(month) || !(await canManage(month, token))) back(token, 'Not allowed.');

  if (action === 'approve' || action === 'approve-manual') {
    const r = await approve(month, { manualCard: action === 'approve-manual' });
    back(token, r.ok ? (r.error ?? 'Approved. The winner has been emailed their gift card.') : (r.error ?? 'Could not approve.'));
  }
  if (action === 'redraw') {
    const d = await redraw(month);
    back(token, d?.winner_entry_id ? 'New winner drawn.' : 'No other entries left to draw.');
  }
  if (action === 'instagram') {
    const r = await postWinnerToInstagram(month);
    back(token, r.ok ? 'Posted to Instagram.' : `Instagram post failed: ${r.error}`);
  }
  back(token, 'Unknown action.');
}

async function signIn(formData: FormData) {
  'use server';
  const token = formData.get('token');
  if (typeof token === 'string' && matchesAdminToken(token)) {
    (await cookies()).set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
  }
  redirect('/admin/competition');
}

const STYLES = `
  body { margin:0; background:#F7ECE4; color:#1A1A1A; font-family:system-ui,-apple-system,sans-serif; }
  .wrap { max-width:760px; margin:0 auto; padding:28px 18px 64px; }
  h1 { font-size:26px; margin:0 0 4px; color:#3B2A20; }
  h2 { font-size:19px; margin:0; color:#3B2A20; }
  .sub { color:rgba(26,26,26,.6); font-size:14px; margin:0 0 20px; }
  .card { background:#fff; border-radius:18px; padding:20px; margin:0 0 16px; box-shadow:0 6px 20px rgba(59,42,32,.06); }
  .row { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
  .pill { font-size:12px; padding:4px 10px; border-radius:999px; font-weight:600; }
  .pending { background:#FDE3E6; color:#A85A68; } .approved { background:#E8EEDF; color:#4F6C39; } .none { background:#E7E5E1; color:#555; }
  .winner { margin:16px 0; padding:16px; border-radius:14px; background:#FBF5EF; }
  .winner b { font-size:22px; color:#3B2A20; display:block; }
  .muted { color:rgba(26,26,26,.55); font-size:13px; }
  a { color:#A85A68; font-weight:600; }
  form.inline { display:inline; }
  button { border:0; border-radius:999px; padding:12px 18px; font-weight:600; font-size:15px; cursor:pointer; margin:6px 8px 0 0; }
  .primary { background:#3B2A20; color:#F7ECE4; } .light { background:#F3DED3; color:#3B2A20; } .link { background:none; color:#A85A68; padding:8px 0; font-size:13px; }
  .msg { background:#3B2A20; color:#F7ECE4; border-radius:12px; padding:12px 16px; margin:0 0 16px; font-size:14px; }
  .err { color:#B3261E; font-size:13px; margin-top:8px; }
  table { width:100%; border-collapse:collapse; font-size:13px; } td, th { text-align:left; padding:8px 6px; border-bottom:1px solid #F3DED3; } th { color:rgba(26,26,26,.5); font-weight:500; }
  dl { display:grid; grid-template-columns:auto 1fr; gap:6px 14px; font-size:14px; margin:12px 0 0; } dt { color:rgba(26,26,26,.55); }
  form.gate { max-width:320px; margin:80px auto; display:flex; flex-direction:column; gap:12px; }
  input { padding:12px 14px; border-radius:10px; border:1px solid #E2D0BD; font-size:15px; }
`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="wrap">{children}</div>
    </>
  );
}

function Btn({ month, token, action, label, kind = 'primary' }: { month: string; token: string | null; action: string; label: string; kind?: string }) {
  return (
    <form className="inline" action={act}>
      <input type="hidden" name="month" value={month} />
      {token && <input type="hidden" name="t" value={token} />}
      <input type="hidden" name="action" value={action} />
      <button className={kind} type="submit">
        {label}
      </button>
    </form>
  );
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' }) : '—');

async function DrawCard({ draw, token }: { draw: DrawRow; token: string | null }) {
  const winner: EntryRow | null = draw.winner_entry_id ? await getEntry(draw.winner_entry_id) : null;
  const euros = (prizeCents() / 100).toFixed(0);
  const status =
    draw.status === 'approved' ? <span className="pill approved">Approved</span> : draw.status === 'no_entries' ? <span className="pill none">No entries</span> : <span className="pill pending">Waiting for your OK</span>;

  return (
    <div className="card">
      <div className="row">
        <h2>{monthLabel(draw.draw_month)} draw</h2>
        {status}
      </div>
      <p className="muted" style={{ margin: '6px 0 0' }}>
        {draw.entry_count} {draw.entry_count === 1 ? 'entry' : 'entries'} · drawn {when(draw.drawn_at)}
      </p>

      {winner ? (
        <div className="winner">
          <b>{winner.full_name}</b>
          <a href={`https://www.instagram.com/${winner.instagram_handle}/`} target="_blank" rel="noopener">
            @{winner.instagram_handle} on Instagram ↗
          </a>
          <div className="muted" style={{ marginTop: 6 }}>
            {winner.email}
            {winner.phone ? ` · ${winner.phone}` : ''} · entered {when(winner.created_at)}
          </div>
        </div>
      ) : draw.status === 'pending_approval' ? (
        <p className="muted">No entries left to draw from.</p>
      ) : null}

      {draw.status === 'pending_approval' && winner && (
        <>
          <p className="muted" style={{ margin: '0 0 4px' }}>
            Check they follow @easy.beans.coffee, then approve. Approving creates a €{euros} Square gift card and emails it to them.
          </p>
          <Btn month={draw.draw_month} token={token} action="approve" label={`Approve & send €${euros} gift card`} />
          <Btn month={draw.draw_month} token={token} action="redraw" label="Draw again" kind="light" />
          {draw.gift_card_error && (
            <>
              <div className="err">Square gift card failed: {draw.gift_card_error}</div>
              <Btn month={draw.draw_month} token={token} action="approve-manual" label="Approve — I’ll send the card from Square myself" kind="link" />
            </>
          )}
        </>
      )}

      {draw.status === 'approved' && (
        <dl>
          <dt>Approved</dt>
          <dd>{when(draw.approved_at)}</dd>
          <dt>Gift card</dt>
          <dd>{draw.gift_card_gan ? `•••• ${draw.gift_card_gan.slice(-4)} (€${euros}, in Square)` : 'Sent manually'}</dd>
          <dt>Winner emailed</dt>
          <dd>{when(draw.winner_emailed_at)}</dd>
          <dt>Tag on Instagram?</dt>
          <dd>{draw.ig_consent === null ? 'No answer yet (posts without their name after 3 days)' : draw.ig_consent ? 'Yes' : 'No — posted without their name'}</dd>
          <dt>Instagram post</dt>
          <dd>
            {draw.ig_posted_at ? `Posted ${when(draw.ig_posted_at)}` : draw.ig_post_error ? <span className="err">Failed: {draw.ig_post_error}</span> : 'Not yet'}
            {!draw.ig_posted_at && (
              <div>
                <Btn month={draw.draw_month} token={token} action="instagram" label="Post to Instagram now" kind="link" />
              </div>
            )}
          </dd>
        </dl>
      )}
    </div>
  );
}

function EntryTable({ entries }: { entries: EntryRow[] }) {
  if (!entries.length) return <p className="muted">No entries yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Instagram</th>
          <th>Entered</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <td>{e.full_name}</td>
            <td>
              <a href={`https://www.instagram.com/${e.instagram_handle}/`} target="_blank" rel="noopener">
                @{e.instagram_handle}
              </a>
            </td>
            <td>{when(e.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function CompetitionAdminPage({ searchParams }: { searchParams: Promise<{ t?: string; msg?: string }> }) {
  const { t, msg } = await searchParams;
  const token = typeof t === 'string' ? t : null;
  const message = typeof msg === 'string' ? msg.slice(0, 300) : null;

  // Link from the draw email: that one draw, no password needed.
  if (token) {
    const draw = await getDrawByToken('admin', token);
    if (!draw) {
      return (
        <Shell>
          <h1>Competition</h1>
          <p className="sub">This link is not valid any more.</p>
        </Shell>
      );
    }
    return (
      <Shell>
        <h1>Monthly €10 draw</h1>
        <p className="sub">Easy Beans Coffee</p>
        {message && <div className="msg">{message}</div>}
        <DrawCard draw={draw} token={token} />
      </Shell>
    );
  }

  if (!isLeadsAdminConfigured()) {
    return (
      <Shell>
        <h1>Competition</h1>
        <p className="sub">
          Open this page from the link in the draw email, or set <code>ADMIN_LEADS_TOKEN</code> to sign in.
        </p>
      </Shell>
    );
  }

  if (!(await isLeadsAdmin())) {
    return (
      <Shell>
        <form className="gate" action={signIn}>
          <h1>Competition</h1>
          <input type="password" name="token" placeholder="Admin password" autoComplete="off" />
          <button className="primary" type="submit">
            Open
          </button>
        </form>
      </Shell>
    );
  }

  const current = drawMonthFor();
  const [draws, entries, currentDraw] = await Promise.all([listDraws(), listEntries(current), getDraw(current)]);

  return (
    <Shell>
      <h1>Monthly €10 draw</h1>
      <p className="sub">The winner is drawn automatically on the 16th; nothing goes to them until you approve.</p>
      {message && <div className="msg">{message}</div>}

      {!currentDraw && (
        <div className="card">
          <div className="row">
            <h2>{monthLabel(current)} — open</h2>
            <span className="pill none">{entries.length} so far</span>
          </div>
          <p className="muted">Entries close at 23:59 on the 15th. Draw runs the next morning.</p>
          <EntryTable entries={entries} />
        </div>
      )}

      {draws.map((d) => (
        <DrawCard key={d.draw_month} draw={d} token={null} />
      ))}
    </Shell>
  );
}
