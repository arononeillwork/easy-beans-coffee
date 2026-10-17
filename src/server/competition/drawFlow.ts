import 'server-only';
import { randomInt } from 'node:crypto';
import { TZDate } from '@date-fns/tz';
import { getSiteUrl } from '../env';
import { sendAdminApprovedEmail, sendAdminDrawEmail, sendAdminIssueEmail, sendWinnerEmail, monthLabel } from '../email/competitionEmails';
import { dmText } from './dmText';
import { issuePrizeCard } from './giftCard';
import { publishInstagramPhoto } from './instagramPost';
import { DRAW_DAY } from './drawMonth';
import {
  getDraw,
  getDrawByToken,
  getEntry,
  insertDraw,
  listDraws,
  listEntries,
  markEntryWinner,
  undrawnMonths,
  updateDraw,
  type DrawRow,
} from './drawRepo';

/**
 * The monthly €10 draw, end to end:
 *
 *   16th (daily cron) → random pick → email the owner (nothing to the winner)
 *   owner approves    → Square €10 gift card → winner email with the number
 *                       and a "can we tag you on Instagram?" question
 *   winner answers    → Instagram post (tagged, or anonymous if they say no)
 *   no answer in 3 days → anonymous post anyway
 *
 * Every step is recorded on the draw row, so re-running any of it is safe.
 */

const FIRST_DRAW = '2026-11-01';
const DAY_MS = 86_400_000;
const REMIND_AFTER_DAYS = 3;
const ANON_POST_AFTER_DAYS = 3;

/** The latest draw month (YYYY-MM-01) whose entry window has closed. */
export function latestClosedMonth(now: Date = new Date()): string {
  const local = new TZDate(now, 'Europe/Madrid');
  let y = local.getFullYear();
  let m = local.getMonth() + 1;
  if (local.getDate() <= DRAW_DAY) {
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

async function pickRandom(month: string, exclude: string[]): Promise<{ id: string | null; count: number }> {
  const entries = await listEntries(month);
  const pool = entries.filter((e) => !exclude.includes(e.id));
  return { id: pool.length ? pool[randomInt(pool.length)].id : null, count: entries.length };
}

async function notifyOwner(draw: DrawRow, reminder = false): Promise<boolean> {
  const winner = draw.winner_entry_id ? await getEntry(draw.winner_entry_id) : null;
  return sendAdminDrawEmail(
    {
      drawMonth: draw.draw_month,
      entryCount: draw.entry_count,
      winnerName: winner?.full_name ?? null,
      winnerHandle: winner?.instagram_handle ?? null,
      adminToken: draw.admin_token,
    },
    reminder,
  );
}

/** Draw every closed month that has entries but no draw yet. */
export async function drawClosedMonths(now = new Date()): Promise<string[]> {
  const through = latestClosedMonth(now);
  if (through < FIRST_DRAW) return [];
  const drawn: string[] = [];

  for (const month of await undrawnMonths(through)) {
    const { id, count } = await pickRandom(month, []);
    const inserted = await insertDraw({
      draw_month: month,
      status: id ? 'pending_approval' : 'no_entries',
      entry_count: count,
      winner_entry_id: id,
    });
    if (!inserted) continue; // another run beat us to it
    const draw = await getDraw(month);
    if (draw && (await notifyOwner(draw))) await updateDraw(month, { admin_notified_at: new Date().toISOString() });
    drawn.push(month);
  }

  // A closed month with nobody in it still gets one "no entries" note.
  if (!(await getDraw(through))) {
    const inserted = await insertDraw({ draw_month: through, status: 'no_entries', entry_count: 0 });
    if (inserted) {
      const draw = await getDraw(through);
      if (draw && (await notifyOwner(draw))) await updateDraw(through, { admin_notified_at: new Date().toISOString() });
    }
  }
  return drawn;
}

/** Skip the current pick and choose another entry at random. */
export async function redraw(month: string): Promise<DrawRow | null> {
  const draw = await getDraw(month);
  if (!draw || draw.status !== 'pending_approval') return draw;
  const exclude = draw.winner_entry_id ? [...draw.excluded_entry_ids, draw.winner_entry_id] : draw.excluded_entry_ids;
  const { id, count } = await pickRandom(month, exclude);
  return updateDraw(
    month,
    { winner_entry_id: id, excluded_entry_ids: exclude, entry_count: count, gift_card_id: null, gift_card_gan: null, gift_card_error: null },
    'pending_approval',
  );
}

/**
 * Owner sign-off: create and load the Square gift card, then email the winner.
 * With `manualCard` the card step is skipped (the owner sends one from Square)
 * and the winner is told it is on its way.
 */
export async function approve(month: string, opts: { manualCard?: boolean } = {}): Promise<{ ok: boolean; error?: string }> {
  const draw = await getDraw(month);
  if (!draw || draw.status !== 'pending_approval' || !draw.winner_entry_id) return { ok: false, error: 'Nothing to approve for this month.' };
  const winner = await getEntry(draw.winner_entry_id);
  if (!winner) return { ok: false, error: 'The winning entry no longer exists — draw again.' };

  let gan: string | null = null;
  if (!opts.manualCard) {
    try {
      const card = await issuePrizeCard(
        month,
        winner.id,
        draw.gift_card_id && draw.gift_card_gan ? { id: draw.gift_card_id, gan: draw.gift_card_gan } : null,
      );
      gan = card.gan;
      await updateDraw(month, { gift_card_id: card.id, gift_card_gan: card.gan, gift_card_error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[competition] gift card failed', message);
      await updateDraw(month, { gift_card_error: message.slice(0, 500) });
      return { ok: false, error: `Square could not create the gift card: ${message}` };
    }
  }

  const approved = await updateDraw(month, { status: 'approved', approved_at: new Date().toISOString() }, 'pending_approval');
  if (!approved) return { ok: false, error: 'This draw was already approved.' };
  await markEntryWinner(winner.id);

  const sent = await sendWinnerEmail({
    to: winner.email,
    firstName: firstName(winner.full_name),
    lang: winner.lang === 'es' ? 'es' : 'en',
    drawMonth: month,
    gan,
    winnerToken: approved.winner_token,
  });
  if (sent) await updateDraw(month, { winner_emailed_at: new Date().toISOString() });

  // Instagram won't let us DM someone who hasn't messaged us first, so the
  // owner gets the message ready to paste and a button into the winner's DMs.
  await sendAdminApprovedEmail({
    drawMonth: month,
    winnerName: winner.full_name,
    handle: winner.instagram_handle,
    dm: dmText(winner, month),
    cardSent: Boolean(gan),
    adminToken: approved.admin_token,
  });

  if (!sent) return { ok: true, error: 'Approved, but the winner email did not send — check the email settings, or send the card number yourself.' };
  return { ok: true };
}

// -------------------------------------------------------------- Instagram ---

function caption(draw: DrawRow, handle: string | null): string {
  const month = monthLabel(draw.draw_month, 'en');
  const head = handle
    ? `🎉 Congratulations @${handle}! You’ve won our ${month} €10 Easy Beans gift card ☕\n🇪🇸 ¡Enhorabuena @${handle}! Has ganado la tarjeta regalo de 10 € de ${monthLabel(draw.draw_month, 'es')}.`
    : `🎉 We have a winner! Our ${month} €10 Easy Beans gift card has been drawn and the winner has been emailed ☕\n🇪🇸 ¡Ya tenemos ganador del sorteo de ${monthLabel(draw.draw_month, 'es')}! Le hemos escrito por email.`;
  return `${head}\n\nWant to win next month? Follow @easy.beans.coffee and sign up at easybeanscoffee.com/competition 💌\n¿Quieres ganar el mes que viene? Síguenos y apúntate en easybeanscoffee.com/competition\n\n#easybeanscoffee #sanpedrodealcantara #marbella #specialtycoffee #matcha`;
}

/** Posts the winner announcement once. Safe to call repeatedly. */
export async function postWinnerToInstagram(month: string): Promise<{ ok: boolean; error?: string }> {
  const draw = await getDraw(month);
  if (!draw || draw.status !== 'approved') return { ok: false, error: 'Draw not approved yet.' };
  if (draw.ig_posted_at) return { ok: true };

  const winner = draw.ig_consent && draw.winner_entry_id ? await getEntry(draw.winner_entry_id) : null;
  const text = caption(draw, winner?.instagram_handle ?? null);
  try {
    const id = await publishInstagramPhoto(`${getSiteUrl()}/media/competition/winner-post.jpg`, text);
    await updateDraw(month, { ig_post_id: id, ig_posted_at: new Date().toISOString(), ig_post_error: null });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[competition] instagram post failed', message);
    await updateDraw(month, { ig_post_error: message.slice(0, 500) });
    if (!draw.ig_error_notified_at) {
      const sent = await sendAdminIssueEmail(`Instagram post for the ${monthLabel(month)} winner didn’t go out`, [
        `Instagram said: ${message}`,
        'You can post it yourself with this image and caption, or fix the Instagram connection and press "Post to Instagram now" on the admin page.',
        `Image: ${getSiteUrl()}/media/competition/winner-post.jpg`,
        `Caption:\n${text}`,
        `Admin page: ${getSiteUrl()}/admin/competition?t=${draw.admin_token}`,
      ]);
      if (sent) await updateDraw(month, { ig_error_notified_at: new Date().toISOString() });
    }
    return { ok: false, error: message };
  }
}

/** The winner's answer to "can we tag you?" — posts straight away either way. */
export async function recordInstagramConsent(winnerToken: string, yes: boolean): Promise<DrawRow | null> {
  const draw = await getDrawByToken('winner', winnerToken);
  if (!draw || draw.status !== 'approved') return null;
  if (draw.ig_consent === null && !draw.ig_posted_at) {
    await updateDraw(draw.draw_month, { ig_consent: yes, ig_consent_at: new Date().toISOString() });
    await postWinnerToInstagram(draw.draw_month);
  }
  return getDraw(draw.draw_month);
}

// ------------------------------------------------------------- daily job ---

/** Run once a day by Vercel cron. Every branch is idempotent. */
export async function runDailyCompetitionJob(now = new Date()) {
  const drawn = await drawClosedMonths(now);
  const reminded: string[] = [];
  const posted: string[] = [];

  for (const draw of await listDraws(6)) {
    const age = (iso: string | null) => (iso ? now.getTime() - new Date(iso).getTime() : 0);

    if (draw.status === 'pending_approval' && draw.admin_notified_at && !draw.admin_reminded_at && age(draw.admin_notified_at) > REMIND_AFTER_DAYS * DAY_MS) {
      if (await notifyOwner(draw, true)) {
        await updateDraw(draw.draw_month, { admin_reminded_at: now.toISOString() });
        reminded.push(draw.draw_month);
      }
    }

    // Winner never answered the Instagram question: post without naming them.
    if (
      draw.status === 'approved' &&
      !draw.ig_posted_at &&
      !draw.ig_post_error &&
      draw.ig_consent === null &&
      age(draw.approved_at) > ANON_POST_AFTER_DAYS * DAY_MS
    ) {
      await updateDraw(draw.draw_month, { ig_consent: false });
      if ((await postWinnerToInstagram(draw.draw_month)).ok) posted.push(draw.draw_month);
    }
  }
  return { drawn, reminded, posted };
}
