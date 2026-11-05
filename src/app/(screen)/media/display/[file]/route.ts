import { getInstagramPostImageUrl } from '@/server/social/instagram';

/**
 * The café TV's picture when it is an Instagram post:
 * /media/display/instagram-<post id>.jpg (see the /display-menu page).
 *
 * The page could point straight at Instagram's address for the picture, but
 * that address is signed, expires within days and changes on every read, so
 * the TV would see a "new" picture each time it checked and reload for
 * nothing. This one stays the same for as long as the post is the newest, and
 * sits beside the posters in /media/display, where the TV's reload check
 * (ReloadOnChange) looks for its picture. The posters themselves are files in
 * public/media/display, served before this route is ever asked.
 *
 * A post's picture never changes, so once fetched it is kept at the edge.
 */
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const mediaId = /^instagram-(\d+)\.jpg$/.exec(file)?.[1];
  const src = mediaId ? await getInstagramPostImageUrl(mediaId) : null;
  if (!src) return missing(404);

  try {
    // Instagram's addresses are absolute; the test stand-in hands out the
    // site's own /media files, which resolve against this request.
    const res = await fetch(new URL(src, request.url), { cache: 'no-store' });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !res.body || !type.startsWith('image/')) return missing(502);
    return new Response(res.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable',
      },
    });
  } catch {
    return missing(502);
  }
}

function missing(status: number) {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}
