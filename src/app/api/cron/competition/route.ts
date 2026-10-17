import { NextResponse } from 'next/server';
import { runDailyCompetitionJob } from '@/server/competition/drawFlow';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily (vercel.json → crons): runs the monthly €10 draw on the 16th, sends the
 * owner a reminder if a winner sits unapproved for 3 days, and posts the
 * anonymous Instagram announcement if a winner never answered the tag question.
 * Same auth as the Instagram token cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization');
  const fromVercelCron = (request.headers.get('user-agent') ?? '').startsWith('vercel-cron');
  if (secret ? auth !== `Bearer ${secret}` : !fromVercelCron) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runDailyCompetitionJob()) });
  } catch (err) {
    console.error('[competition] daily job failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
