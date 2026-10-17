import { NextResponse } from 'next/server';
import { z } from 'zod';
import { captureLead, recentSignupCount } from '@/server/leads/leadRepo';
import { recordCompetitionEntry } from '@/server/competition/entryRepo';
import { drawMonthFor } from '@/server/competition/drawMonth';
import { clientIp } from '@/server/requestIp';

/**
 * Monthly €10 competition entry. Signing up for news & offers is the entry
 * condition (it is step 2 on the poster), so both ticks must be true — the
 * form says so in plain words next to the boxes.
 *
 * The person goes onto the lead list through capture_lead (source
 * `competition`, news consent only — no 10% offer code is issued), and the
 * entry itself lands in competition_entries, one per email per draw.
 */
const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,20}$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  instagram: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@+/, '').toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9._]{1,30}$/)),
  acceptTerms: z.literal(true),
  marketingOptin: z.literal(true),
  lang: z.enum(['en', 'es']).default('en'),
  src: z.string().trim().max(40).optional(),
});

const RATE_LIMIT_WINDOW_MIN = 60;
const RATE_LIMIT_MAX = 5;

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const ip = clientIp(request);
  const userAgent = request.headers.get('user-agent');

  try {
    if (ip && (await recentSignupCount(ip, RATE_LIMIT_WINDOW_MIN)) >= RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const lead = await captureLead({
      email: body.email,
      source: 'competition',
      lang: body.lang,
      phone: body.phone ?? null,
      offerOptin: false,
      eventsOptin: true,
      ip,
      userAgent,
    });

    const drawMonth = drawMonthFor();
    const isNew = await recordCompetitionEntry({
      leadId: lead.leadId,
      drawMonth,
      fullName: body.name,
      email: body.email,
      phone: body.phone ?? null,
      instagramHandle: body.instagram,
      source: body.src ?? null,
      lang: body.lang,
      ip,
      userAgent,
    });

    return NextResponse.json({ ok: true, alreadyEntered: !isNew, drawMonth });
  } catch (err) {
    console.error('competition entry failed', err);
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}
