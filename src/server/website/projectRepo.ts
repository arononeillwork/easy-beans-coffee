import 'server-only';
import { getSupabaseAdmin } from '../supabaseAdmin';
import type { NewSiteBrief, RedesignBrief } from './generate';
import type { SiteSnapshot } from './siteSnapshot';

/** Website studio storage (migration 0012). Service role only. */

export interface ProjectRow {
  id: string;
  mode: 'redesign' | 'new';
  source_url: string | null;
  /** The brief as typed; a redesign also keeps the snapshot it was read from. */
  brief: (NewSiteBrief | (RedesignBrief & { snapshot: SiteSnapshot })) & Record<string, unknown>;
  chosen_version: number | null;
  price_cents: number | null;
  currency: string;
  square_payment_link_id: string | null;
  square_payment_link_url: string | null;
  square_order_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface VersionRow {
  id: string;
  project_id: string;
  version: number;
  html: string;
  feedback: string | null;
  model: string;
  created_at: string;
}

export type VersionSummary = Omit<VersionRow, 'html'>;

const db = () => getSupabaseAdmin();

export async function createProject(input: Pick<ProjectRow, 'mode' | 'source_url' | 'brief'>): Promise<ProjectRow> {
  const { data, error } = await db().from('website_projects').insert(input).select('*').single();
  if (error) throw error;
  return data as ProjectRow;
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  const { data, error } = await db().from('website_projects').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as ProjectRow | null) ?? null;
}

export async function listProjects(limit = 20): Promise<ProjectRow[]> {
  const { data, error } = await db().from('website_projects').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as ProjectRow[];
}

export async function updateProject(id: string, patch: Partial<ProjectRow>): Promise<void> {
  const { error } = await db().from('website_projects').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await db().from('website_projects').delete().eq('id', id);
  if (error) throw error;
}

export async function listVersions(projectId: string): Promise<VersionSummary[]> {
  const { data, error } = await db()
    .from('website_versions')
    .select('id, project_id, version, feedback, model, created_at')
    .eq('project_id', projectId)
    .order('version', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VersionSummary[];
}

export async function getVersion(projectId: string, version: number): Promise<VersionRow | null> {
  const { data, error } = await db()
    .from('website_versions')
    .select('*')
    .eq('project_id', projectId)
    .eq('version', version)
    .maybeSingle();
  if (error) throw error;
  return (data as VersionRow | null) ?? null;
}

export async function getLatestVersion(projectId: string): Promise<VersionRow | null> {
  const { data, error } = await db()
    .from('website_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as VersionRow | null) ?? null;
}

/**
 * Next number = latest + 1. Two regenerations racing on one project would
 * collide on the (project_id, version) unique key and one would fail, which is
 * the right outcome for a single-owner page.
 */
export async function addVersion(projectId: string, html: string, model: string, feedback: string | null): Promise<number> {
  const latest = await getLatestVersion(projectId);
  const version = (latest?.version ?? 0) + 1;
  const { error } = await db().from('website_versions').insert({ project_id: projectId, version, html, model, feedback });
  if (error) throw error;
  return version;
}
