import 'server-only';
import type { Transporter } from 'nodemailer';
import { createTransporter, getSMTPConfig } from '@common-lib/integrations/email';
import { getEmailEnv, isEmailConfigured } from '../env';

let transporter: Transporter | null = null;

/**
 * Cached across requests. `createVerifiedTransporter` would round-trip to the
 * SMTP server on every send, which is a lot of latency to add to a popup.
 */
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransporter(getSMTPConfig());
  }
  return transporter as Transporter;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Fail-soft on purpose: the lead is already stored by the time we get here, and
 * a bounced SMTP connection must never turn a successful signup into an error
 * the visitor sees. Returns whether the message actually went out.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn('email not configured, skipping send', { subject: mail.subject });
    return false;
  }

  try {
    const env = getEmailEnv();
    await getTransporter().sendMail({
      from: env.from,
      replyTo: env.replyTo,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return true;
  } catch (err) {
    console.error('email send failed', err);
    return false;
  }
}
