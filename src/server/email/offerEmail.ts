import 'server-only';
import { getSiteUrl } from '../env';
import { sendMail } from './mailer';

type Lang = 'en' | 'es';

/**
 * Copy lives here rather than in the site dictionaries: these strings are
 * server-only, and shipping them to the browser bundle would be waste.
 * Tone follows the popup — short, plain, no exclamation marks.
 */
const COPY = {
  en: {
    subject: 'Your 10% code — Easy Beans',
    heading: '10% off our online shop for 6 months',
    intro:
      'Here is your code. It works on every online order for 6 months — keep this email, you will need it at checkout.',
    codeLabel: 'Your code',
    closing: 'We will only write about the things you said you wanted to hear about.',
    unsubscribe: 'Unsubscribe',
    signoff: 'Easy Beans, San Pedro',
  },
  es: {
    subject: 'Tu código del 10% — Easy Beans',
    heading: '10% en nuestra tienda online durante 6 meses',
    intro:
      'Aquí tienes tu código. Vale para todos tus pedidos online durante 6 meses — guarda este email, lo necesitarás al pagar.',
    codeLabel: 'Tu código',
    closing: 'Solo te escribiremos sobre lo que dijiste que querías recibir.',
    unsubscribe: 'Darse de baja',
    signoff: 'Easy Beans, San Pedro',
  },
} as const satisfies Record<Lang, Record<string, string>>;

/** Blocks the one injection that matters here: a code or URL breaking the markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface OfferEmailInput {
  to: string;
  code: string;
  lang: Lang;
  unsubscribeToken: string;
}

export async function sendOfferEmail(input: OfferEmailInput): Promise<boolean> {
  const t = COPY[input.lang] ?? COPY.es;
  const unsubscribeUrl = `${getSiteUrl()}/api/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}`;
  const code = escapeHtml(input.code);

  const text = [
    t.heading,
    '',
    t.intro,
    '',
    `${t.codeLabel}: ${input.code}`,
    '',
    t.closing,
    '',
    t.signoff,
    `${t.unsubscribe}: ${unsubscribeUrl}`,
  ].join('\n');

  // Inline styles and a single centred table: the only layout every mail client
  // still agrees on. No images, so nothing breaks when remote content is off.
  const html = `<!doctype html>
<html lang="${input.lang}">
  <body style="margin:0;padding:24px;background:#F7ECE4;font-family:Helvetica,Arial,sans-serif;color:#1A1A1A;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;">
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:14px;letter-spacing:0.04em;color:#A85A68;">EASY BEANS</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:600;">${t.heading}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:rgba(26,26,26,0.70);">${t.intro}</p>
        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(26,26,26,0.45);">${t.codeLabel}</p>
        <p style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:0.08em;color:#A85A68;font-family:'Courier New',monospace;">${code}</p>
        <p style="margin:0 0 32px;font-size:15px;line-height:1.55;color:rgba(26,26,26,0.70);">${t.closing}</p>
        <p style="margin:0;font-size:13px;color:rgba(26,26,26,0.45);">
          ${t.signoff}<br />
          <a href="${escapeHtml(unsubscribeUrl)}" style="color:rgba(26,26,26,0.45);">${t.unsubscribe}</a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return sendMail({ to: input.to, subject: t.subject, text, html });
}
