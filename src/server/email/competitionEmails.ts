import 'server-only';
import { getSiteUrl } from '../env';
import { sendMail } from './mailer';

/**
 * Emails for the monthly €10 draw. All are sent by the website through the
 * same mailbox as the 10% offer emails (EMAIL_FROM over SMTP). Square sends
 * nothing for API-created gift cards, so the winner's card number arrives here.
 */

type Lang = 'en' | 'es';

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function adminEmail(): string {
  return process.env.COMPETITION_ADMIN_EMAIL?.trim() || 'easybeanscafe@gmail.com';
}

export function monthLabel(drawMonth: string, lang: Lang = 'en'): string {
  const [y, m] = drawMonth.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function shell(lang: Lang, inner: string): string {
  return `<!doctype html>
<html lang="${lang}">
  <body style="margin:0;padding:24px;background:#F7ECE4;font-family:Helvetica,Arial,sans-serif;color:#1A1A1A;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;">
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:14px;letter-spacing:0.04em;color:#A85A68;">EASY BEANS</p>
        ${inner}
      </td></tr>
    </table>
  </body>
</html>`;
}

const P = 'margin:0 0 16px;font-size:15px;line-height:1.55;color:rgba(26,26,26,0.75);';
const BTN =
  'display:inline-block;background:#3B2A20;color:#F7ECE4;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;margin:0 8px 8px 0;';
const BTN_LIGHT =
  'display:inline-block;background:#F3DED3;color:#3B2A20;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;margin:0 8px 8px 0;';

// ---------------------------------------------------------------- owner ---

export interface AdminDrawInfo {
  drawMonth: string;
  entryCount: number;
  winnerName: string | null;
  winnerHandle: string | null;
  adminToken: string;
}

export async function sendAdminDrawEmail(info: AdminDrawInfo, reminder = false): Promise<boolean> {
  const month = monthLabel(info.drawMonth);
  const link = `${getSiteUrl()}/admin/competition?t=${info.adminToken}`;

  if (!info.winnerName) {
    const subject = `No entries for the ${month} €10 draw`;
    const text = `Nobody entered the ${month} draw, so there is no winner this month.\n\nAdmin page: ${link}`;
    const html = shell('en', `<h1 style="margin:0 0 16px;font-size:22px;">${esc(subject)}</h1><p style="${P}">Nobody entered the ${esc(month)} draw, so there is no winner this month.</p><a href="${esc(link)}" style="${BTN}">Open the admin page</a>`);
    return sendMail({ to: adminEmail(), subject, text, html });
  }

  const ig = `https://www.instagram.com/${info.winnerHandle}/`;
  const subject = `${reminder ? 'Reminder: ' : ''}Approve the ${month} €10 winner`;
  const text = [
    `${reminder ? 'Still waiting for your OK. ' : ''}The ${month} draw has picked a winner from ${info.entryCount} ${info.entryCount === 1 ? 'entry' : 'entries'}:`,
    '',
    `${info.winnerName} (@${info.winnerHandle})`,
    `Check they follow @easy.beans.coffee: ${ig}`,
    '',
    `Approve (sends their €10 gift card) or draw again: ${link}`,
    '',
    'Nothing is sent to the winner until you approve.',
  ].join('\n');
  const html = shell(
    'en',
    `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${esc(subject)}</h1>
     <p style="${P}">${reminder ? 'Still waiting for your OK. ' : ''}Picked at random from <b>${info.entryCount}</b> ${info.entryCount === 1 ? 'entry' : 'entries'}:</p>
     <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#3B2A20;">${esc(info.winnerName)}</p>
     <p style="margin:0 0 20px;font-size:15px;"><a href="${esc(ig)}" style="color:#A85A68;font-weight:600;">@${esc(info.winnerHandle ?? '')} on Instagram ↗</a><br /><span style="color:rgba(26,26,26,0.55);font-size:13px;">Check they follow @easy.beans.coffee before approving.</span></p>
     <a href="${esc(link)}" style="${BTN}">Approve or draw again</a>
     <p style="margin:16px 0 0;font-size:13px;color:rgba(26,26,26,0.5);">Nothing is sent to the winner until you approve. Approving creates their €10 Square gift card and emails it to them.</p>`,
  );
  return sendMail({ to: adminEmail(), subject, text, html });
}

export async function sendAdminIssueEmail(subject: string, lines: string[]): Promise<boolean> {
  const text = lines.join('\n');
  const html = shell('en', `<h1 style="margin:0 0 16px;font-size:20px;">${esc(subject)}</h1>${lines.map((l) => `<p style="${P}white-space:pre-wrap;">${esc(l)}</p>`).join('')}`);
  return sendMail({ to: adminEmail(), subject, text, html });
}

// --------------------------------------------------------------- winner ---

const WIN = {
  en: {
    subject: 'You won €10 at Easy Beans ☕',
    heading: (name: string) => `Congratulations, ${name}!`,
    intro: (month: string) => `You’ve won our ${month} draw: a €10 Easy Beans gift card.`,
    cardLabel: 'Your gift card number',
    how: 'Show this email at the till (or read out the number) next time you visit — the €10 comes off your order. Any balance left stays on the card until it expires.',
    validUntil: (d: string) => `Valid until ${d}.`,
    manual: 'We’ll send your gift card details in a separate email very soon.',
    igQ: 'Can we congratulate you on our Instagram? We’d tag your account in the post.',
    igYes: 'Yes, tag me',
    igNo: 'No thanks',
    signoff: 'See you soon,\nEasy Beans · C. Pizarro 8, San Pedro de Alcántara',
  },
  es: {
    subject: 'Has ganado 10 € en Easy Beans ☕',
    heading: (name: string) => `¡Enhorabuena, ${name}!`,
    intro: (month: string) => `Has ganado nuestro sorteo de ${month}: una tarjeta regalo de Easy Beans de 10 €.`,
    cardLabel: 'Número de tu tarjeta regalo',
    how: 'Enseña este email en caja (o di el número) en tu próxima visita y te descontamos los 10 €. El saldo que sobre se queda en la tarjeta hasta que caduque.',
    validUntil: (d: string) => `Válida hasta el ${d}.`,
    manual: 'Te enviaremos los datos de tu tarjeta regalo en otro email muy pronto.',
    igQ: '¿Podemos felicitarte en nuestro Instagram? Te etiquetaríamos en la publicación.',
    igYes: 'Sí, etiquétame',
    igNo: 'No, gracias',
    signoff: '¡Hasta pronto!\nEasy Beans · C. Pizarro 8, San Pedro de Alcántara',
  },
};

export interface WinnerEmailInput {
  to: string;
  firstName: string;
  lang: Lang;
  drawMonth: string;
  gan: string | null;
  expiresAt: Date | null;
  winnerToken: string;
}

function formatGan(gan: string): string {
  return gan.replace(/(.{4})/g, '$1 ').trim();
}

export async function sendWinnerEmail(input: WinnerEmailInput): Promise<boolean> {
  const t = WIN[input.lang] ?? WIN.en;
  const month = monthLabel(input.drawMonth, input.lang);
  const base = `${getSiteUrl()}/${input.lang}/competition/winner?t=${input.winnerToken}`;
  const yes = `${base}&a=yes`;
  const validUntil = input.expiresAt
    ? t.validUntil(
        input.expiresAt.toLocaleDateString(input.lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }),
      )
    : '';
  const no = `${base}&a=no`;

  const text = [
    t.heading(input.firstName),
    '',
    t.intro(month),
    '',
    ...(input.gan ? [`${t.cardLabel}: ${formatGan(input.gan)}`, validUntil, '', t.how] : [t.manual]),
    '',
    t.igQ,
    `${t.igYes}: ${yes}`,
    `${t.igNo}: ${no}`,
    '',
    t.signoff,
  ].join('\n');

  const card = input.gan
    ? `<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(26,26,26,0.45);">${t.cardLabel}</p>
       <p style="margin:0 0 4px;font-size:26px;font-weight:700;letter-spacing:0.06em;color:#3B2A20;font-family:'Courier New',monospace;">${esc(formatGan(input.gan))}</p>
       <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#A85A68;">${esc(validUntil)}</p>
       <p style="${P}">${t.how}</p>`
    : `<p style="${P}">${t.manual}</p>`;

  const html = shell(
    input.lang,
    `<h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#3B2A20;">${esc(t.heading(input.firstName))}</h1>
     <p style="${P}">${esc(t.intro(month))}</p>
     ${card}
     <hr style="border:0;border-top:1px solid #F3DED3;margin:24px 0;" />
     <p style="${P}">${t.igQ}</p>
     <a href="${esc(yes)}" style="${BTN}">${t.igYes}</a><a href="${esc(no)}" style="${BTN_LIGHT}">${t.igNo}</a>
     <p style="margin:24px 0 0;font-size:13px;color:rgba(26,26,26,0.5);white-space:pre-line;">${esc(t.signoff)}</p>`,
  );
  return sendMail({ to: input.to, subject: t.subject, text, html });
}
