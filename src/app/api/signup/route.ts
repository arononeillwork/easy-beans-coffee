import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { captureLead, getUnsubscribeToken, recentSignupCount } from '@/server/leads/leadRepo';
import { sendOfferEmail } from '@/server/email/offerEmail';
import { upsertNewsletterSubscriber } from '@/server/square/customers';
import { INTEREST_KEYS } from '@/shared/lib/interests';

/**
 * Consent is decided here, from the form the submission came through — never
 * from the request body. The events form promises "no offers", so a client
 * cannot talk its way into offer consent by posting a different flag.
 */
const CONSENT_BY_SOURCE = {
  // The subscribe modal (popup, and the same dialog behind the launch bar) is
  // a newsletter signup with a 10% code attached, so it grants both. The
  // ticked interests narrow what actually gets sent; consent stays the coarse
  // promise honoured in code.
  first_visit_popup: { offerOptin: true, eventsOptin: true },
  newsletter_section: { offerOptin: false, eventsOptin: true },
  announcement_bar: { offerOptin: true, eventsOptin: true },
} as const;

/** A new capture point must be added here, which forces a consent decision. */
const bodySchema = z.object({
  email: z.email(),
  lang: z.enum(['en', 'es']).optional(),
  source: z
    .enum(['first_visit_popup', 'newsletter_section', 'announcement_bar'])
    .default('first_visit_popup'),
  // Only the known topic keys survive; anything else is a 400, same as a bad
  // source. Deduplicated before storage.
  interests: z.array(z.enum(INTEREST_KEYS)).max(INTEREST_KEYS.length * 2).default([]),
  // Nice-to-have, kept for Square customer records later. The dialog validates
  // the same shape, so a 400 here only ever hits a client that skipped it.
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,20}$/)
    .optional(),
});

const RATE_LIMIT_WINDOW_MIN = 60;
const RATE_LIMIT_MAX = 5;

/** Vercel puts the client first in x-forwarded-for; the rest are proxies. */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip') || null;
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const ip = clientIp(request);
  const consent = CONSENT_BY_SOURCE[parsed.source];

  try {
    if (ip && (await recentSignupCount(ip, RATE_LIMIT_WINDOW_MIN)) >= RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const lead = await captureLead({
      email: parsed.email,
      source: parsed.source,
      lang: parsed.lang ?? null,
      interests: [...new Set(parsed.interests)],
      phone: parsed.phone ?? null,
      ip,
      userAgent: request.headers.get('user-agent'),
      ...consent,
    });

    // Only on first issue: a repeat submit returns the same code without
    // mailing the address again, which also closes the obvious abuse vector.
    if (lead.codeIssuedNow && lead.offerCode) {
      const token = await getUnsubscribeToken(lead.leadId);
      if (token) {
        await sendOfferEmail({
          to: parsed.email,
          code: lead.offerCode,
          lang: parsed.lang ?? 'es',
          unsubscribeToken: token,
        });
      }
    }

    // Mirror the subscriber into Square's Customer Directory after the
    // response is sent. Supabase already holds the signup, so Square being
    // down costs nothing but a log line — never a failed signup.
    after(() =>
      upsertNewsletterSubscriber({ email: parsed.email, phone: parsed.phone ?? null }).catch(
        (err) => console.error('square subscriber sync failed', err),
      ),
    );

    // The code goes back to the client so the popup can show it immediately —
    // the email is the durable copy, not the only one.
    return NextResponse.json({ ok: true, offerCode: consent.offerOptin ? lead.offerCode : null });
  } catch (err) {
    console.error('lead capture failed', err);
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}
