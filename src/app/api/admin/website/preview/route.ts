import { isLeadsAdmin } from '@/server/leads/adminAuth';
import { getProject, getVersion } from '@/server/website/projectRepo';

export const dynamic = 'force-dynamic';

/**
 * Serves one generated draft for the studio's preview frame. The page is
 * model-written HTML, so it is served under a CSP sandbox: no scripts, no
 * same-origin access to the admin's cookies, and nothing loaded except images
 * and Google Fonts. Downloading the file is part of what the purchase buys, so
 * `?download=1` only answers for a paid project.
 */
const CSP = [
  'sandbox allow-popups allow-popups-to-escape-sandbox',
  "default-src 'none'",
  'img-src https: data:',
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "frame-ancestors 'self'",
].join('; ');

export async function GET(request: Request) {
  if (!(await isLeadsAdmin())) return new Response('Not found', { status: 404 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('project') ?? '';
  const versionNumber = Number(url.searchParams.get('v'));
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !Number.isInteger(versionNumber)) {
    return new Response('Bad request', { status: 400 });
  }

  const [project, version] = await Promise.all([getProject(projectId), getVersion(projectId, versionNumber)]);
  if (!project || !version) return new Response('Not found', { status: 404 });

  const download = url.searchParams.get('download') === '1';
  if (download && !project.paid_at) return new Response('Purchase the site to download it.', { status: 402 });

  return new Response(version.html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': CSP,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store',
      'referrer-policy': 'no-referrer',
      ...(download ? { 'content-disposition': `attachment; filename="website-v${version.version}.html"` } : {}),
    },
  });
}
