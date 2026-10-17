import 'server-only';
import { getInstagramToken } from '../social/instagramToken';

const API = 'https://graph.instagram.com/v21.0';

type IgError = { error?: { message?: string; code?: number } };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: 'no-store', ...init });
  const body = (await res.json().catch(() => ({}))) as T & IgError;
  if (!res.ok || body.error) {
    throw new Error(`Instagram ${res.status}: ${body.error?.message ?? 'request failed'}${body.error?.code ? ` (code ${body.error.code})` : ''}`);
  }
  return body;
}

/**
 * Publishes one photo post to the café's Instagram (Instagram API with
 * Instagram Login). Needs a token carrying `instagram_business_content_publish`
 * as well as the `instagram_business_basic` the feed already uses; the image
 * must be a public JPEG URL. Returns the new media id.
 */
export async function publishInstagramPhoto(imageUrl: string, caption: string): Promise<string> {
  const token = await getInstagramToken(false);
  if (!token) throw new Error('No Instagram token is configured');
  const auth = `access_token=${encodeURIComponent(token)}`;

  const me = await call<{ user_id?: string; id?: string }>(`/me?fields=user_id,username&${auth}`);
  const igId = me.user_id ?? me.id;
  if (!igId) throw new Error('Instagram did not return the account id');

  const form = (params: Record<string, string>) =>
    ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...params, access_token: token }) }) as RequestInit;

  const container = await call<{ id: string }>(`/${igId}/media`, form({ image_url: imageUrl, caption }));

  // Instagram fetches the image asynchronously; wait until the container is ready.
  for (let i = 0; i < 10; i += 1) {
    const s = await call<{ status_code?: string }>(`/${container.id}?fields=status_code&${auth}`);
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram could not process the image (${s.status_code})`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  const published = await call<{ id: string }>(`/${igId}/media_publish`, form({ creation_id: container.id }));
  return published.id;
}
