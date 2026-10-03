import { unsubscribeByToken } from '@/server/leads/leadRepo';

export const dynamic = 'force-dynamic';

/**
 * Two steps on purpose. Corporate mail scanners prefetch every link in an
 * email, so a GET that unsubscribed immediately would drop people off the list
 * without them ever clicking. GET asks; POST acts.
 */

function page(body: string): Response {
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Easy Beans</title>
  </head>
  <body style="margin:0;padding:48px 24px;background:#F7ECE4;font-family:Helvetica,Arial,sans-serif;color:#1A1A1A;">
    <div style="max-width:420px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;text-align:center;">
      <p style="margin:0 0 16px;font-size:14px;letter-spacing:0.04em;color:#A85A68;">EASY BEANS</p>
      ${body}
    </div>
  </body>
</html>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return page('<p style="margin:0;font-size:15px;">Enlace no válido. / Invalid link.</p>');
  }

  return page(`
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">
      ¿Quieres dejar de recibir emails de Easy Beans?<br />
      <span style="color:rgba(26,26,26,0.45);">Stop receiving emails from Easy Beans?</span>
    </p>
    <form method="post">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      <button type="submit" style="width:100%;padding:12px 16px;border:0;border-radius:999px;background:#F79BA4;color:#1A1A1A;font-size:15px;font-weight:600;cursor:pointer;">
        Darse de baja / Unsubscribe
      </button>
    </form>`);
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const token = form?.get('token');

  if (typeof token !== 'string' || !token) {
    return page('<p style="margin:0;font-size:15px;">Enlace no válido. / Invalid link.</p>');
  }

  const done = await unsubscribeByToken(token);

  // Same wording either way: an unknown token must not confirm or deny that an
  // address is on the list.
  return page(`
    <p style="margin:0;font-size:15px;line-height:1.55;">
      Listo. No recibirás más emails.<br />
      <span style="color:rgba(26,26,26,0.45);">Done. You will not receive further emails.</span>
    </p>${done ? '' : '<!-- token not found -->'}`);
}
