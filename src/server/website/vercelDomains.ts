import 'server-only';
import { getVercelEnv } from '../env';

/**
 * The domain names attached to the site's Vercel project, and whether each one
 * is pointed at Vercel correctly. DNS itself is at Cloudflare
 * (`cloudflareDns.ts`); this side says which records Vercel wants, so the admin
 * page can offer to add them there in one click.
 */

const API = 'https://api.vercel.com';

export interface VerificationRecord {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

export interface ProjectDomain {
  name: string;
  verified: boolean;
  redirect: string | null;
  verification: VerificationRecord[];
  /** False when DNS does not point at Vercel yet; null if Vercel couldn't say. */
  configured: boolean | null;
  /** Records Vercel recommends for this name, e.g. A 76.76.21.21 for an apex. */
  recommended: { type: 'A' | 'CNAME'; value: string }[];
}

export class DomainError extends Error {}

async function vercel<T>(path: string, init: RequestInit = {}): Promise<T> {
  const env = getVercelEnv();
  if (!env) throw new DomainError('VERCEL_TOKEN is not set');

  const url = new URL(`${API}${path}`);
  if (env.teamId) url.searchParams.set('teamId', env.teamId);
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${env.token}`, 'content-type': 'application/json', ...init.headers },
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) throw new DomainError(`Vercel: ${body.error?.message ?? `HTTP ${response.status}`}`);
  return body;
}

function projectPath(): string {
  return `/projects/${encodeURIComponent(getVercelEnv()?.project ?? '')}`;
}

export function isDomainsConfigured(): boolean {
  return getVercelEnv() !== null;
}

interface RawDomain {
  name: string;
  verified: boolean;
  redirect?: string | null;
  verification?: VerificationRecord[];
}

interface RawConfig {
  misconfigured?: boolean;
  recommendedIPv4?: { rank: number; value: string[] }[];
  recommendedCNAME?: { rank: number; value: string }[];
}

async function configFor(name: string): Promise<Pick<ProjectDomain, 'configured' | 'recommended'>> {
  try {
    const config = await vercel<RawConfig>(`/v6/domains/${encodeURIComponent(name)}/config`);
    const isApex = name.split('.').length <= 2;
    const ipv4 = config.recommendedIPv4?.find((r) => r.rank === 1)?.value ?? [];
    const cname = config.recommendedCNAME?.find((r) => r.rank === 1)?.value;
    const recommended: ProjectDomain['recommended'] =
      isApex || !cname
        ? ipv4.map((value) => ({ type: 'A' as const, value }))
        : [{ type: 'CNAME' as const, value: cname.replace(/\.$/, '') }];
    return { configured: config.misconfigured === undefined ? null : !config.misconfigured, recommended };
  } catch {
    return { configured: null, recommended: [] };
  }
}

export async function listProjectDomains(): Promise<ProjectDomain[]> {
  const { domains } = await vercel<{ domains: RawDomain[] }>(`/v9${projectPath()}/domains`);
  return Promise.all(
    domains.map(async (d) => ({
      name: d.name,
      verified: d.verified,
      redirect: d.redirect ?? null,
      verification: d.verification ?? [],
      ...(await configFor(d.name)),
    })),
  );
}

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normaliseDomain(input: string): string | null {
  const name = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  return DOMAIN_RE.test(name) ? name : null;
}

export async function addProjectDomain(name: string, redirect?: string): Promise<void> {
  await vercel(`/v10${projectPath()}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name, ...(redirect ? { redirect } : {}) }),
  });
}

export async function verifyProjectDomain(name: string): Promise<boolean> {
  const result = await vercel<{ verified?: boolean }>(`/v9${projectPath()}/domains/${encodeURIComponent(name)}/verify`, {
    method: 'POST',
  });
  return Boolean(result.verified);
}

export async function removeProjectDomain(name: string): Promise<void> {
  await vercel(`/v9${projectPath()}/domains/${encodeURIComponent(name)}`, { method: 'DELETE' });
}
