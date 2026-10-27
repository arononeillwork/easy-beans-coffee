import { redirect, unstable_rethrow } from 'next/navigation';
import { cookies } from 'next/headers';
import { isLeadsAdmin, isLeadsAdminConfigured, matchesAdminToken, ADMIN_COOKIE } from '@/server/leads/adminAuth';
import { getWebsiteDomain, getWebsiteServicePricing, isWebsiteStudioConfigured } from '@/server/env';
import {
  EDITABLE_TYPES,
  PROXIABLE_TYPES,
  createRecord,
  deleteRecord,
  getZone,
  isDnsConfigured,
  listRecords,
  parseRecordForm,
  qualifyName,
  updateRecord,
  type DnsRecord,
  type DnsZone,
} from '@/server/website/cloudflareDns';
import {
  addProjectDomain,
  isDomainsConfigured,
  listProjectDomains,
  normaliseDomain,
  removeProjectDomain,
  verifyProjectDomain,
  type ProjectDomain,
} from '@/server/website/vercelDomains';
import { snapshotSite, SnapshotError, type SiteSnapshot } from '@/server/website/siteSnapshot';
import { generateWebsite, GenerationError, WEBSITE_MODEL, type GenerationInput, type NewSiteBrief, type RedesignBrief } from '@/server/website/generate';
import {
  addVersion,
  createProject,
  deleteProject,
  getProject,
  getVersion,
  listProjects,
  listVersions,
  type ProjectRow,
} from '@/server/website/projectRepo';
import { createPurchaseLink, priceFor, refreshPurchase, serviceName } from '@/server/website/purchase';
import { PendingButton } from './PendingButton';

export const dynamic = 'force-dynamic';
// A full site takes Claude a minute or two to write; the server actions on
// this page run inside that window.
export const maxDuration = 300;
export const metadata = { title: 'Website · Easy Beans Coffee', robots: { index: false, follow: false } };

/**
 * The owner's website desk, behind the leads admin token (DNS changes can take
 * the site down, so staff with the board PIN don't get in):
 *
 * - Domain & DNS: the domain names on the Vercel project and every record in
 *   the Cloudflare zone, editable in place, with one-click fixes for the
 *   records Vercel asks for.
 * - Website studio: redesign an existing site from its URL, or generate a new
 *   one from a brief; regenerate as often as wanted, then buy the build-out as
 *   its own Square purchase.
 */

type Tab = 'domain' | 'studio';

function back(params: Record<string, string | number | undefined>): never {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') q.set(key, String(value));
  redirect(`/admin/website${q.size ? `?${q.toString()}` : ''}`);
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong.');
const field = (form: FormData, name: string, max = 2000) => String(form.get(name) ?? '').trim().slice(0, max);

async function requireAdmin(): Promise<void> {
  if (!(await isLeadsAdmin())) back({ err: 'Signed out — open the page again.' });
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
  redirect('/admin/website');
}

// ── Domain & DNS actions ────────────────────────────────────────────────────

async function dnsAction(formData: FormData) {
  'use server';
  await requireAdmin();
  const action = field(formData, 'action');
  const recordId = field(formData, 'id', 64);
  let msg: string;
  try {
    const zone = await getZone();
    if (action === 'delete') {
      if (formData.get('confirm') !== 'on') back({ tab: 'domain', err: 'Tick “Yes, delete it” to delete a record.' });
      await deleteRecord(zone, recordId);
      msg = 'Record deleted.';
    } else {
      const input = parseRecordForm(formData);
      if (typeof input === 'string') back({ tab: 'domain', err: input });
      if (action === 'create') {
        await createRecord(zone, input);
        msg = `Added ${input.type} ${qualifyName(input.name, zone.name)}.`;
      } else {
        await updateRecord(zone, recordId, input);
        msg = `Saved ${input.type} ${qualifyName(input.name, zone.name)}.`;
      }
    }
  } catch (err) {
    unstable_rethrow(err);
    back({ tab: 'domain', err: errorText(err) });
  }
  back({ tab: 'domain', msg });
}

async function domainAction(formData: FormData) {
  'use server';
  await requireAdmin();
  const action = field(formData, 'action');
  const name = normaliseDomain(field(formData, 'domain', 253));
  if (!name) back({ tab: 'domain', err: 'That is not a valid domain name.' });
  let msg: string;
  try {
    if (action === 'add') {
      const redirectTo = normaliseDomain(field(formData, 'redirect', 253)) ?? undefined;
      await addProjectDomain(name, redirectTo);
      msg = `${name} added to the site. Add the DNS records shown below if it is not pointed yet.`;
    } else if (action === 'verify') {
      msg = (await verifyProjectDomain(name)) ? `${name} is verified.` : `${name} is not verified yet — DNS can take a few minutes.`;
    } else if (action === 'remove') {
      if (formData.get('confirm') !== 'on') back({ tab: 'domain', err: 'Tick “Yes, remove it” to remove a domain.' });
      await removeProjectDomain(name);
      msg = `${name} removed from the site.`;
    } else if (action === 'fix') {
      // Adds the record Vercel asked for straight into Cloudflare. Proxy off:
      // Vercel issues its own certificate and needs to see the traffic.
      const type = field(formData, 'type', 10).toUpperCase();
      const value = field(formData, 'value', 4096);
      const recordName = field(formData, 'name', 253) || name;
      const zone = await getZone();
      if (!(EDITABLE_TYPES as readonly string[]).includes(type)) throw new Error(`Can't add a ${type} record.`);
      await createRecord(zone, { type: type as (typeof EDITABLE_TYPES)[number], name: recordName, content: value, ttl: 1, proxied: false, comment: 'Added for Vercel from /admin/website' });
      msg = `Added ${type} ${qualifyName(recordName, zone.name)} → ${value} in Cloudflare.`;
    } else {
      msg = 'Unknown action.';
    }
  } catch (err) {
    unstable_rethrow(err);
    back({ tab: 'domain', err: errorText(err) });
  }
  back({ tab: 'domain', msg });
}

// ── Website studio actions ──────────────────────────────────────────────────

async function startProject(formData: FormData) {
  'use server';
  await requireAdmin();
  const mode = field(formData, 'mode') === 'redesign' ? 'redesign' : 'new';
  let projectId: string;
  try {
    let input: GenerationInput;
    let sourceUrl: string | null = null;
    let brief: ProjectRow['brief'];
    if (mode === 'redesign') {
      const redesign: RedesignBrief = { url: field(formData, 'url', 500), goals: field(formData, 'goals'), style: field(formData, 'style', 500) };
      if (!redesign.url) back({ tab: 'studio', mode, err: 'Enter the address of the current website.' });
      const snapshot = await snapshotSite(redesign.url);
      input = { mode, brief: redesign, snapshot };
      sourceUrl = snapshot.url;
      brief = { ...redesign, snapshot };
    } else {
      const fresh: NewSiteBrief = {
        businessName: field(formData, 'businessName', 120),
        businessType: field(formData, 'businessType', 200),
        location: field(formData, 'location', 200),
        description: field(formData, 'description'),
        style: field(formData, 'style', 500),
        contact: field(formData, 'contact', 500),
      };
      if (!fresh.businessName || !fresh.businessType || !fresh.description) {
        back({ tab: 'studio', mode, err: 'Business name, type and a short description are needed.' });
      }
      input = { mode, brief: fresh };
      brief = { ...fresh };
    }

    const html = await generateWebsite(input);
    const project = await createProject({ mode, source_url: sourceUrl, brief });
    await addVersion(project.id, html, WEBSITE_MODEL, null);
    projectId = project.id;
  } catch (err) {
    unstable_rethrow(err);
    const known = err instanceof SnapshotError || err instanceof GenerationError;
    if (!known) console.error('website studio: generation failed', err);
    back({ tab: 'studio', mode, err: known ? err.message : 'The draft could not be generated. Try again.' });
  }
  back({ tab: 'studio', project: projectId, v: 1, msg: 'Your example website is ready.' });
}

function inputFor(project: ProjectRow): GenerationInput {
  if (project.mode === 'redesign') {
    const { snapshot, ...brief } = project.brief as RedesignBrief & { snapshot: SiteSnapshot };
    return { mode: 'redesign', brief, snapshot };
  }
  return { mode: 'new', brief: project.brief as NewSiteBrief };
}

async function studioAction(formData: FormData) {
  'use server';
  await requireAdmin();
  const projectId = field(formData, 'project', 64);
  const action = field(formData, 'action');
  const project = await getProject(projectId);
  if (!project) back({ tab: 'studio', err: 'That project no longer exists.' });

  if (action === 'delete') {
    if (project.paid_at) back({ tab: 'studio', project: project.id, err: 'A paid project is kept.' });
    await deleteProject(project.id);
    back({ tab: 'studio', msg: 'Project deleted.' });
  }

  const version = Number(formData.get('v'));
  if (action === 'purchase') {
    let url: string;
    try {
      if (!(await getVersion(project.id, version))) throw new Error('Pick a version to buy.');
      url = await createPurchaseLink(project, version);
    } catch (err) {
      unstable_rethrow(err);
      console.error('website studio: purchase link failed', err);
      back({ tab: 'studio', project: project.id, v: version, err: `Couldn't open checkout: ${errorText(err)}` });
    }
    redirect(url);
  }

  if (action === 'regenerate') {
    if (project.paid_at) back({ tab: 'studio', project: project.id, v: version, err: 'This project is paid for — start a new one to explore other designs.' });
    const feedback = field(formData, 'feedback');
    let next: number;
    try {
      const base = await getVersion(project.id, version);
      const html = await generateWebsite(inputFor(project), { previousHtml: base?.html ?? '', feedback });
      next = await addVersion(project.id, html, WEBSITE_MODEL, feedback || null);
    } catch (err) {
      unstable_rethrow(err);
      const known = err instanceof GenerationError;
      if (!known) console.error('website studio: regeneration failed', err);
      back({ tab: 'studio', project: project.id, v: version, err: known ? err.message : 'Regeneration failed. Try again.' });
    }
    back({ tab: 'studio', project: project.id, v: next, msg: `Version ${next} is ready.` });
  }

  back({ tab: 'studio', project: project.id, err: 'Unknown action.' });
}

// ── View ────────────────────────────────────────────────────────────────────

const STYLES = `
  body { margin:0; background:#F7ECE4; color:#1A1A1A; font-family:system-ui,-apple-system,sans-serif; }
  .wrap { max-width:1100px; margin:0 auto; padding:28px 16px 64px; }
  h1 { font-size:26px; margin:0 0 4px; color:#3B2A20; }
  h2 { font-size:19px; margin:0 0 4px; color:#3B2A20; }
  h3 { font-size:15px; margin:16px 0 6px; color:#3B2A20; }
  .sub { color:rgba(26,26,26,.6); font-size:14px; margin:0 0 20px; }
  .tabs { display:flex; gap:8px; margin:0 0 20px; flex-wrap:wrap; }
  .tabs a { padding:10px 18px; border-radius:999px; background:#F3DED3; color:#3B2A20; text-decoration:none; font-weight:600; font-size:14px; }
  .tabs a.on { background:#3B2A20; color:#F7ECE4; }
  .card { background:#fff; border-radius:18px; padding:20px; margin:0 0 16px; box-shadow:0 6px 20px rgba(59,42,32,.06); min-width:0; }
  .row { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
  .pill { font-size:12px; padding:4px 10px; border-radius:999px; font-weight:600; white-space:nowrap; }
  .ok { background:#E8EEDF; color:#4F6C39; } .warn { background:#FDE3E6; color:#A85A68; } .none { background:#E7E5E1; color:#555; }
  .muted { color:rgba(26,26,26,.55); font-size:13px; }
  a { color:#A85A68; font-weight:600; }
  code { font-family:ui-monospace,monospace; font-size:12px; background:#FBF5EF; padding:2px 6px; border-radius:6px; word-break:break-all; }
  button { border:0; border-radius:999px; padding:10px 16px; font-weight:600; font-size:14px; cursor:pointer; }
  button[disabled] { opacity:.6; cursor:progress; }
  a.primary { display:inline-block; padding:10px 16px; border-radius:999px; text-decoration:none; }
  .primary { background:#3B2A20; color:#F7ECE4; } .light { background:#F3DED3; color:#3B2A20; } .danger { background:#B3261E; color:#fff; }
  .msg { background:#3B2A20; color:#F7ECE4; border-radius:12px; padding:12px 16px; margin:0 0 16px; font-size:14px; }
  .err { background:#FDE3E6; color:#8C1D18; border-radius:12px; padding:12px 16px; margin:0 0 16px; font-size:14px; }
  input, select, textarea { padding:9px 11px; border-radius:10px; border:1px solid #E2D0BD; font-size:14px; font-family:inherit; background:#fff; min-width:0; box-sizing:border-box; }
  textarea { width:100%; min-height:80px; resize:vertical; }
  label.f { display:flex; flex-direction:column; gap:4px; font-size:13px; color:rgba(26,26,26,.7); }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin:0 0 12px; }
  .records { display:flex; flex-direction:column; gap:8px; }
  form.rec { display:grid; grid-template-columns:100px minmax(120px,1.2fr) minmax(160px,2.4fr) 90px 70px 70px auto; gap:6px; align-items:center; padding:8px; border-radius:12px; background:#FBF5EF; }
  form.rec.new { background:#F3DED3; }
  form.rec .chk { display:flex; align-items:center; gap:4px; font-size:12px; }
  .readonly { display:grid; grid-template-columns:100px minmax(120px,1.2fr) minmax(160px,2.4fr) auto; gap:6px; padding:8px; font-size:13px; }
  details.del { font-size:12px; } details.del summary { cursor:pointer; color:#B3261E; }
  details.del form { display:flex; gap:8px; align-items:center; margin-top:6px; }
  .domain { border-top:1px solid #F3DED3; padding:14px 0; } .domain:first-of-type { border-top:0; }
  .fix { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:6px 0; font-size:13px; }
  .mode { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; margin:0 0 16px; }
  .mode a { display:block; padding:16px; border-radius:14px; border:2px solid #F3DED3; text-decoration:none; color:#3B2A20; }
  .mode a.on { border-color:#3B2A20; background:#FBF5EF; }
  .mode b { display:block; font-size:16px; margin-bottom:4px; }
  .mode span { font-weight:400; font-size:13px; color:rgba(26,26,26,.6); }
  .preview { width:100%; height:70vh; min-height:420px; border:1px solid #E2D0BD; border-radius:14px; background:#fff; }
  .versions { display:flex; gap:6px; flex-wrap:wrap; margin:8px 0 12px; }
  .versions a { padding:6px 12px; border-radius:999px; background:#F3DED3; color:#3B2A20; text-decoration:none; font-size:13px; }
  .versions a.on { background:#3B2A20; color:#F7ECE4; }
  .buy { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px; }
  .price { font-size:28px; font-weight:700; color:#3B2A20; }
  form.gate { max-width:320px; margin:80px auto; display:flex; flex-direction:column; gap:12px; }
  table { width:100%; border-collapse:collapse; font-size:13px; } td, th { text-align:left; padding:8px 6px; border-bottom:1px solid #F3DED3; } th { color:rgba(26,26,26,.5); font-weight:500; }
  @media (max-width: 760px) {
    form.rec, .readonly { grid-template-columns:1fr 1fr; }
    form.rec input[name=content], .readonly .content { grid-column:1 / -1; }
  }
`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="wrap">{children}</div>
    </>
  );
}

const euros = (cents: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' }) : '—');
const relativeName = (name: string, zone: string) => (name === zone ? '@' : name.endsWith(`.${zone}`) ? name.slice(0, -zone.length - 1) : name);

const TTL_OPTIONS: [number, string][] = [[1, 'Auto'], [300, '5 min'], [3600, '1 hour'], [86_400, '1 day']];

function TtlSelect({ value }: { value: number }) {
  const options = TTL_OPTIONS.some(([v]) => v === value) ? TTL_OPTIONS : [...TTL_OPTIONS, [value, `${value}s`] as [number, string]];
  return (
    <select name="ttl" defaultValue={String(value)} aria-label="TTL">
      {options.map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  );
}

function RecordForm({ record, zone }: { record?: DnsRecord; zone: DnsZone }) {
  const type = record?.type ?? 'A';
  return (
    <form className={`rec${record ? '' : ' new'}`} action={dnsAction}>
      <input type="hidden" name="action" value={record ? 'update' : 'create'} />
      {record && <input type="hidden" name="id" value={record.id} />}
      <select name="type" defaultValue={type} aria-label="Type">
        {EDITABLE_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <input name="name" defaultValue={record ? relativeName(record.name, zone.name) : ''} placeholder="@ or www" aria-label="Name" required />
      <input name="content" defaultValue={record?.content ?? ''} placeholder="Value (IP, hostname, text…)" aria-label="Value" required />
      <TtlSelect value={record?.ttl ?? 1} />
      <input name="priority" defaultValue={record?.priority ?? ''} placeholder="Prio" aria-label="Priority (MX/SRV)" inputMode="numeric" />
      <label className="chk" title="Cloudflare proxy (orange cloud). Only A, AAAA and CNAME.">
        <input type="checkbox" name="proxied" defaultChecked={record?.proxied ?? false} disabled={record ? !PROXIABLE_TYPES.includes(type) : false} />
        Proxy
      </label>
      <PendingButton className={record ? 'light' : 'primary'} label={record ? 'Save' : 'Add record'} pendingLabel="Saving…" />
    </form>
  );
}

function DeleteRecord({ record }: { record: DnsRecord }) {
  return (
    <details className="del">
      <summary>Delete {record.type} {record.name}…</summary>
      <form action={dnsAction}>
        <input type="hidden" name="action" value="delete" />
        <input type="hidden" name="id" value={record.id} />
        <label className="chk"><input type="checkbox" name="confirm" /> Yes, delete it</label>
        <button className="danger" type="submit">Delete</button>
      </form>
    </details>
  );
}

function DomainRow({ domain, records, zone }: { domain: ProjectDomain; records: DnsRecord[]; zone: DnsZone | null }) {
  const has = (type: string, name: string, value: string) =>
    records.some((r) => r.type === type && r.name === name && r.content.replace(/\.$/, '') === value.replace(/\.$/, ''));
  const wanted = [
    ...domain.verification.map((v) => ({ type: v.type, name: v.domain, value: v.value, why: 'Proves to Vercel you own the domain' })),
    ...(domain.configured === false ? domain.recommended.map((r) => ({ type: r.type, name: domain.name, value: r.value, why: 'Points the domain at the site' })) : []),
  ];
  const inZone = zone && (domain.name === zone.name || domain.name.endsWith(`.${zone.name}`));

  return (
    <div className="domain">
      <div className="row">
        <div>
          <b>{domain.name}</b>
          {domain.redirect && <span className="muted"> → redirects to {domain.redirect}</span>}
        </div>
        <div className="row">
          <span className={`pill ${domain.verified ? 'ok' : 'warn'}`}>{domain.verified ? 'Verified' : 'Not verified'}</span>
          <span className={`pill ${domain.configured ? 'ok' : domain.configured === false ? 'warn' : 'none'}`}>
            {domain.configured ? 'DNS OK' : domain.configured === false ? 'DNS not pointed' : 'DNS unknown'}
          </span>
        </div>
      </div>

      {wanted.map((w) => (
        <div className="fix" key={`${w.type}${w.name}${w.value}`}>
          <span>{w.why}:</span> <code>{w.type} {w.name} → {w.value}</code>
          {has(w.type, w.name, w.value) ? (
            <span className="pill ok">In Cloudflare</span>
          ) : inZone ? (
            <form action={domainAction}>
              <input type="hidden" name="action" value="fix" />
              <input type="hidden" name="domain" value={domain.name} />
              <input type="hidden" name="type" value={w.type} />
              <input type="hidden" name="name" value={w.name} />
              <input type="hidden" name="value" value={w.value} />
              <PendingButton className="light" label="Add it in Cloudflare" pendingLabel="Adding…" />
            </form>
          ) : (
            <span className="muted">Add this at the domain’s DNS provider.</span>
          )}
        </div>
      ))}

      <div className="row" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
        {!domain.verified && (
          <form action={domainAction}>
            <input type="hidden" name="action" value="verify" />
            <input type="hidden" name="domain" value={domain.name} />
            <PendingButton className="light" label="Check again" pendingLabel="Checking…" />
          </form>
        )}
        <details className="del">
          <summary>Remove {domain.name} from the site…</summary>
          <form action={domainAction}>
            <input type="hidden" name="action" value="remove" />
            <input type="hidden" name="domain" value={domain.name} />
            <label className="chk"><input type="checkbox" name="confirm" /> Yes, remove it</label>
            <button className="danger" type="submit">Remove</button>
          </form>
        </details>
      </div>
    </div>
  );
}

function Setup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="muted">{children}</p>
    </div>
  );
}

async function DomainTab() {
  const domainName = getWebsiteDomain();
  let zone: DnsZone | null = null;
  let records: DnsRecord[] = [];
  let dnsError: string | null = null;
  let domains: ProjectDomain[] = [];
  let domainsError: string | null = null;

  await Promise.all([
    (async () => {
      if (!isDnsConfigured()) return;
      try {
        zone = await getZone();
        records = await listRecords(zone.id);
      } catch (err) {
        unstable_rethrow(err);
        dnsError = errorText(err);
      }
    })(),
    (async () => {
      if (!isDomainsConfigured()) return;
      try {
        domains = await listProjectDomains();
      } catch (err) {
        unstable_rethrow(err);
        domainsError = errorText(err);
      }
    })(),
  ]);
  const z = zone as DnsZone | null;

  return (
    <>
      {isDomainsConfigured() ? (
        <div className="card">
          <h2>Domain names</h2>
          <p className="muted">The addresses the website answers on (Vercel project). A red badge means DNS needs a change — use the button next to it.</p>
          {domainsError ? <div className="err">{domainsError}</div> : domains.length === 0 ? <p className="muted">No domains on the project yet.</p> : null}
          {domains.map((d) => (
            <DomainRow key={d.name} domain={d} records={records} zone={z} />
          ))}
          <h3>Connect a domain</h3>
          <form action={domainAction} className="grid" style={{ alignItems: 'end' }}>
            <input type="hidden" name="action" value="add" />
            <label className="f">Domain<input name="domain" placeholder={`e.g. shop.${domainName}`} required /></label>
            <label className="f">Redirect to (optional)<input name="redirect" placeholder={`e.g. www.${domainName}`} /></label>
            <div><PendingButton label="Connect domain" pendingLabel="Connecting…" /></div>
          </form>
        </div>
      ) : (
        <Setup title="Domain names">
          Set <code>VERCEL_TOKEN</code> (and <code>VERCEL_TEAM_ID</code> if the project is under a team) to manage the site’s domains here. See <code>docs/website-admin.md</code>.
        </Setup>
      )}

      {isDnsConfigured() ? (
        <div className="card">
          <div className="row">
            <h2>DNS records{z ? ` · ${z.name}` : ''}</h2>
            {z && <span className={`pill ${z.status === 'active' ? 'ok' : 'warn'}`}>Cloudflare zone {z.status}</span>}
          </div>
          {z && z.nameServers.length > 0 && (
            <p className="muted">Nameservers at the registrar must be: {z.nameServers.map((ns) => <code key={ns}>{ns}</code>)}</p>
          )}
          <p className="muted">Changes go live in Cloudflare as soon as you save. Name is relative to the domain: <code>@</code> is {z?.name ?? domainName} itself.</p>
          {dnsError && <div className="err">{dnsError}</div>}
          {z && (
            <div className="records">
              {records.map((r) =>
                (EDITABLE_TYPES as readonly string[]).includes(r.type) ? (
                  <div key={r.id}>
                    <RecordForm record={r} zone={z} />
                    <DeleteRecord record={r} />
                  </div>
                ) : (
                  <div className="readonly" key={r.id}>
                    <b>{r.type}</b>
                    <span>{relativeName(r.name, z.name)}</span>
                    <code className="content">{r.content}</code>
                    <span className="muted">Edit in Cloudflare</span>
                  </div>
                ),
              )}
              <h3>Add a record</h3>
              <RecordForm zone={z} />
            </div>
          )}
        </div>
      ) : (
        <Setup title="DNS records">
          DNS for {domainName} is at Cloudflare. Set <code>CLOUDFLARE_API_TOKEN</code> (a token with Zone → DNS → Edit on that zone) to edit records here. See <code>docs/website-admin.md</code>.
        </Setup>
      )}
    </>
  );
}

function NewProjectForm({ mode }: { mode: 'redesign' | 'new' }) {
  return (
    <div className="card">
      <div className="mode">
        <a className={mode === 'redesign' ? 'on' : ''} href="/admin/website?tab=studio&mode=redesign">
          <b>I have a website</b>
          <span>Give us the address. We read it and design a fresh version that keeps your content.</span>
        </a>
        <a className={mode === 'new' ? 'on' : ''} href="/admin/website?tab=studio&mode=new">
          <b>I don’t have a website yet</b>
          <span>Tell us about the business and we generate an example site to start from.</span>
        </a>
      </div>

      <form action={startProject}>
        <input type="hidden" name="mode" value={mode} />
        {mode === 'redesign' ? (
          <>
            <div className="grid">
              <label className="f">Current website<input name="url" placeholder="www.example.com" required /></label>
              <label className="f">Look and feel (optional)<input name="style" placeholder="e.g. warmer, more photos, minimal" /></label>
            </div>
            <label className="f">What should the redesign do better? (optional)<textarea name="goals" placeholder="e.g. make booking obvious, look more premium, work better on phones" /></label>
          </>
        ) : (
          <>
            <div className="grid">
              <label className="f">Business name<input name="businessName" required /></label>
              <label className="f">What kind of business<input name="businessType" placeholder="e.g. specialty coffee shop" required /></label>
              <label className="f">Location<input name="location" placeholder="Town, region" /></label>
              <label className="f">Look and feel<input name="style" placeholder="e.g. playful pastels, bold and modern" /></label>
            </div>
            <label className="f">About the business<textarea name="description" placeholder="What you offer, who it’s for, what makes you different" required /></label>
            <label className="f" style={{ marginTop: 12 }}>Contact details to show (optional)<input name="contact" placeholder="Address, phone, email, Instagram, opening hours" /></label>
          </>
        )}
        <p className="muted">Generating takes about a minute or two. Previews are free; you only pay if you buy the build-out.</p>
        <PendingButton label={mode === 'redesign' ? 'Generate redesign' : 'Generate example website'} pendingLabel="Generating… this takes a minute or two" />
      </form>
    </div>
  );
}

async function ProjectView({ project: initial, version: wanted }: { project: ProjectRow; version: number | null }) {
  const project = await refreshPurchase(initial);
  const versions = await listVersions(project.id);
  const current = versions.find((v) => v.version === wanted) ?? versions[0];
  const pricing = getWebsiteServicePricing();
  const price = project.price_cents ?? priceFor(project.mode);
  const title =
    project.mode === 'redesign'
      ? `Redesign of ${project.source_url ? new URL(project.source_url).hostname : 'your site'}`
      : `New site for ${(project.brief as NewSiteBrief).businessName}`;

  if (!current) {
    return <div className="card"><h2>{title}</h2><p className="muted">This project has no drafts.</p></div>;
  }
  const previewSrc = `/api/admin/website/preview?project=${project.id}&v=${current.version}`;

  return (
    <>
      <div className="card">
        <div className="row">
          <div>
            <h2>{title}</h2>
            <p className="muted">Started {when(project.created_at)}{current.feedback ? ` · v${current.version} notes: “${current.feedback}”` : ''}</p>
          </div>
          <a href={previewSrc} target="_blank" rel="noopener">Open full screen ↗</a>
        </div>
        <div className="versions" aria-label="Versions">
          {[...versions].reverse().map((v) => (
            <a key={v.version} className={v.version === current.version ? 'on' : ''} href={`/admin/website?tab=studio&project=${project.id}&v=${v.version}`}>
              v{v.version}
            </a>
          ))}
        </div>
        <iframe className="preview" src={previewSrc} title={`Preview, version ${current.version}`} sandbox="allow-popups allow-popups-to-escape-sandbox" />
      </div>

      <div className="buy">
        {!project.paid_at && (
          <div className="card">
            <h2>Not quite right?</h2>
            <p className="muted">Regenerate as often as you like. Leave notes to change this version, or leave it blank for a completely different design.</p>
            <form action={studioAction}>
              <input type="hidden" name="project" value={project.id} />
              <input type="hidden" name="v" value={current.version} />
              <input type="hidden" name="action" value="regenerate" />
              <textarea name="feedback" placeholder="e.g. darker colours, bigger photos, move opening hours to the top" />
              <div style={{ marginTop: 10 }}>
                <PendingButton className="light" label="Regenerate" pendingLabel="Regenerating… a minute or two" />
              </div>
            </form>
          </div>
        )}

        <div className="card">
          {project.paid_at ? (
            <>
              <span className="pill ok">Paid {when(project.paid_at)}</span>
              <h2 style={{ marginTop: 10 }}>{serviceName(project.mode)}</h2>
              <p className="muted">
                Purchased version <b>v{project.chosen_version}</b> for {euros(price)}. It will be built out and launched on your domain.
              </p>
              <a className="primary" href={`/api/admin/website/preview?project=${project.id}&v=${project.chosen_version}&download=1`}>
                Download v{project.chosen_version} (HTML)
              </a>
            </>
          ) : (
            <>
              <h2>{serviceName(project.mode)}</h2>
              <div className="price">{euros(price)}</div>
              <p className="muted">
                A one-off purchase, separate from anything else on the site: we turn version v{current.version} into your finished website,
                connect it to your domain and launch it. Paid securely through Square.
              </p>
              {project.square_order_id && project.chosen_version !== null && (
                <p className="muted">A checkout for v{project.chosen_version} is open — buying a different version starts a new one.</p>
              )}
              <form action={studioAction}>
                <input type="hidden" name="project" value={project.id} />
                <input type="hidden" name="v" value={current.version} />
                <input type="hidden" name="action" value="purchase" />
                <PendingButton label={`Buy v${current.version} — ${euros(price)}`} pendingLabel="Opening checkout…" />
              </form>
              <p className="muted">New site {euros(pricing.newSiteCents)} · Redesign {euros(pricing.redesignCents)}</p>
            </>
          )}
        </div>
      </div>

      {!project.paid_at && (
        <details className="del">
          <summary>Delete this project…</summary>
          <form action={studioAction}>
            <input type="hidden" name="project" value={project.id} />
            <input type="hidden" name="action" value="delete" />
            <button className="danger" type="submit">Delete project and all versions</button>
          </form>
        </details>
      )}
    </>
  );
}

async function StudioTab({ projectId, version, mode }: { projectId?: string; version: number | null; mode: 'redesign' | 'new' }) {
  if (!isWebsiteStudioConfigured()) {
    return <Setup title="Website studio">Set <code>ANTHROPIC_API_KEY</code> to generate example websites. See <code>docs/website-admin.md</code>.</Setup>;
  }

  const project = projectId && /^[0-9a-f-]{36}$/i.test(projectId) ? await getProject(projectId) : null;
  const projects = await listProjects();

  return (
    <>
      {project ? (
        <>
          <p><a href="/admin/website?tab=studio">← Start another</a></p>
          <ProjectView project={project} version={version} />
        </>
      ) : (
        <NewProjectForm mode={mode} />
      )}

      {projects.length > 0 && (
        <div className="card">
          <h2>Your projects</h2>
          <table>
            <thead>
              <tr><th>Project</th><th>Type</th><th>Started</th><th>Status</th></tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <a href={`/admin/website?tab=studio&project=${p.id}`}>
                      {p.mode === 'redesign' ? p.source_url : (p.brief as NewSiteBrief).businessName}
                    </a>
                  </td>
                  <td>{p.mode === 'redesign' ? 'Redesign' : 'New site'}</td>
                  <td>{when(p.created_at)}</td>
                  <td>
                    {p.paid_at ? <span className="pill ok">Paid</span> : p.square_order_id ? <span className="pill warn">Checkout open</span> : <span className="pill none">Preview</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default async function WebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; msg?: string; err?: string; project?: string; v?: string; mode?: string; paid?: string }>;
}) {
  if (!isLeadsAdminConfigured()) {
    return (
      <Shell>
        <h1>Website</h1>
        <p className="sub">Set <code>ADMIN_LEADS_TOKEN</code> in the environment to enable this page. Until then it stays shut — it can change the site’s DNS.</p>
      </Shell>
    );
  }

  if (!(await isLeadsAdmin())) {
    return (
      <Shell>
        <form className="gate" action={signIn}>
          <h1>Website</h1>
          <input type="password" name="token" placeholder="Access token" autoComplete="off" />
          <button className="primary" type="submit">Open</button>
        </form>
      </Shell>
    );
  }

  const params = await searchParams;
  const tab: Tab = params.tab === 'studio' || params.project ? 'studio' : 'domain';
  const version = params.v ? Number(params.v) : null;

  return (
    <Shell>
      <h1>Website</h1>
      <p className="sub">Your domain, its DNS, and a studio for redesigning or creating a website.</p>
      <nav className="tabs">
        <a className={tab === 'domain' ? 'on' : ''} href="/admin/website?tab=domain">Domain &amp; DNS</a>
        <a className={tab === 'studio' ? 'on' : ''} href="/admin/website?tab=studio">Website studio</a>
      </nav>
      {params.paid === '1' && <div className="msg">Thanks — your payment is being confirmed by Square. This page shows “Paid” once it lands.</div>}
      {params.msg && <div className="msg">{params.msg}</div>}
      {params.err && <div className="err">{params.err}</div>}
      {tab === 'domain' ? (
        <DomainTab />
      ) : (
        <StudioTab projectId={params.project} version={Number.isInteger(version) ? version : null} mode={params.mode === 'new' ? 'new' : 'redesign'} />
      )}
    </Shell>
  );
}
