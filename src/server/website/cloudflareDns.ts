import 'server-only';
import { getCloudflareEnv, getWebsiteDomain } from '../env';

/**
 * The site's DNS, read and edited through the Cloudflare API so the owner can
 * change records from /admin/website instead of the Cloudflare dashboard. The
 * token (CLOUDFLARE_API_TOKEN) needs Zone → DNS → Edit on the one zone; the
 * zone is looked up by WEBSITE_DOMAIN unless CLOUDFLARE_ZONE_ID pins it.
 */

const API = 'https://api.cloudflare.com/client/v4';

/** The record types the editor offers. Others are listed but left read-only. */
export const EDITABLE_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'CAA', 'NS', 'SRV'] as const;
export type EditableType = (typeof EDITABLE_TYPES)[number];

/** Only A, AAAA and CNAME can sit behind Cloudflare's proxy. */
export const PROXIABLE_TYPES: readonly string[] = ['A', 'AAAA', 'CNAME'];

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  /** 1 means "automatic" in Cloudflare. */
  ttl: number;
  proxied: boolean;
  proxiable: boolean;
  priority?: number;
  comment?: string | null;
}

export interface DnsZone {
  id: string;
  name: string;
  status: string;
  nameServers: string[];
}

export interface DnsRecordInput {
  type: EditableType;
  /** Full name or `@` for the apex; a bare label is expanded against the zone. */
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
  comment?: string;
}

export class DnsError extends Error {}

interface CloudflareEnvelope<T> {
  success: boolean;
  errors?: { code: number; message: string }[];
  result: T;
}

async function cf<T>(path: string, init: RequestInit = {}): Promise<T> {
  const env = getCloudflareEnv();
  if (!env) throw new DnsError('CLOUDFLARE_API_TOKEN is not set');

  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.apiToken}`,
      'content-type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as CloudflareEnvelope<T> | null;
  if (!response.ok || !body?.success) {
    const message = body?.errors?.map((e) => e.message).join('; ') || `HTTP ${response.status}`;
    throw new DnsError(`Cloudflare: ${message}`);
  }
  return body.result;
}

export function isDnsConfigured(): boolean {
  return getCloudflareEnv() !== null;
}

export async function getZone(): Promise<DnsZone> {
  const env = getCloudflareEnv();
  type RawZone = { id: string; name: string; status: string; name_servers?: string[] };
  const raw = env?.zoneId
    ? await cf<RawZone>(`/zones/${encodeURIComponent(env.zoneId)}`)
    : (await cf<RawZone[]>(`/zones?name=${encodeURIComponent(getWebsiteDomain())}`))[0];
  if (!raw) throw new DnsError(`No Cloudflare zone found for ${getWebsiteDomain()}`);
  return { id: raw.id, name: raw.name, status: raw.status, nameServers: raw.name_servers ?? [] };
}

export async function listRecords(zoneId: string): Promise<DnsRecord[]> {
  const records = await cf<DnsRecord[]>(`/zones/${encodeURIComponent(zoneId)}/dns_records?per_page=500`);
  // Apex first, then alphabetical, then by type: the order people scan a zone in.
  return records.sort(
    (a, b) => a.name.split('.').length - b.name.split('.').length || a.name.localeCompare(b.name) || a.type.localeCompare(b.type),
  );
}

/** `@` → apex; `www` → `www.zone`; anything already ending in the zone is kept. */
export function qualifyName(name: string, zoneName: string): string {
  const trimmed = name.trim().toLowerCase().replace(/\.$/, '');
  if (!trimmed || trimmed === '@') return zoneName;
  if (trimmed === zoneName || trimmed.endsWith(`.${zoneName}`)) return trimmed;
  return `${trimmed}.${zoneName}`;
}

function payload(input: DnsRecordInput, zoneName: string) {
  return {
    type: input.type,
    name: qualifyName(input.name, zoneName),
    content: input.content.trim(),
    ttl: input.ttl,
    proxied: PROXIABLE_TYPES.includes(input.type) ? input.proxied : false,
    ...(input.type === 'MX' || input.type === 'SRV' ? { priority: input.priority ?? 10 } : {}),
    ...(input.comment !== undefined ? { comment: input.comment } : {}),
  };
}

export async function createRecord(zone: DnsZone, input: DnsRecordInput): Promise<DnsRecord> {
  return cf<DnsRecord>(`/zones/${encodeURIComponent(zone.id)}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(payload(input, zone.name)),
  });
}

export async function updateRecord(zone: DnsZone, recordId: string, input: DnsRecordInput): Promise<DnsRecord> {
  return cf<DnsRecord>(`/zones/${encodeURIComponent(zone.id)}/dns_records/${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload(input, zone.name)),
  });
}

export async function deleteRecord(zone: DnsZone, recordId: string): Promise<void> {
  await cf<unknown>(`/zones/${encodeURIComponent(zone.id)}/dns_records/${encodeURIComponent(recordId)}`, {
    method: 'DELETE',
  });
}

/**
 * Reads a record from the editor's form. Returns an error string rather than
 * throwing, so the page can put it back in front of the owner.
 */
export function parseRecordForm(form: FormData): DnsRecordInput | string {
  const type = String(form.get('type') ?? '').toUpperCase();
  if (!(EDITABLE_TYPES as readonly string[]).includes(type)) return `Unsupported record type "${type}".`;
  const name = String(form.get('name') ?? '').trim();
  const content = String(form.get('content') ?? '').trim();
  if (!content) return 'A record needs a value.';
  if (name.length > 253 || content.length > 4096) return 'That name or value is too long.';
  if (type === 'A' && !/^(\d{1,3}\.){3}\d{1,3}$/.test(content)) return 'An A record must be an IPv4 address.';
  if (type === 'AAAA' && !content.includes(':')) return 'An AAAA record must be an IPv6 address.';

  const ttl = Number(form.get('ttl') ?? 1);
  if (!Number.isInteger(ttl) || (ttl !== 1 && (ttl < 60 || ttl > 86_400))) return 'TTL must be Auto or 60–86400 seconds.';

  const rawPriority = String(form.get('priority') ?? '').trim();
  const priority = rawPriority ? Number(rawPriority) : undefined;
  if (priority !== undefined && (!Number.isInteger(priority) || priority < 0 || priority > 65_535)) {
    return 'Priority must be a whole number from 0 to 65535.';
  }

  const comment = form.get('comment');
  return {
    type: type as EditableType,
    name,
    content,
    ttl,
    proxied: form.get('proxied') === 'on',
    priority,
    comment: typeof comment === 'string' ? comment.trim().slice(0, 100) : undefined,
  };
}
