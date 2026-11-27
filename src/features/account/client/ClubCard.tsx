'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import { useLanguage } from '@/i18n/LanguageProvider';
import { JoinClubButton } from '@/features/club/client/JoinClubButton';
import { formatEuros } from '@/features/order/lib/price';
import { code128Bars, code128Encodable, code128Modules } from '@/shared/lib/code128';
import { brand, radius, shadow } from '@/theme/brand';
import type { AccountClub } from '../types';

/** Quiet zone each side of the barcode, in modules (Code 128 asks for at least 10). */
const QUIET = 12;

/** Back from Square's checkout the pass takes a minute or two: asked for every 15 s, for up to 3 minutes. */
const REREAD_MS = 15_000;
const REREADS = (3 * 60_000) / REREAD_MS;

/** "7Q2K 9XMB": the member code in two groups, easy to read out or type at the till. */
export const groupedCode = (code: string) => (code.length > 4 ? `${code.slice(0, 4)} ${code.slice(4)}` : code);

/**
 * The coffee club, from the Business Agent (`/api/account/club`). A member gets
 * their pass to hold up at the counter: their name, this week's coffee and their
 * member code as a barcode. Someone who isn't a member gets how to join, while
 * the café is taking members. No club, or the agent unreachable: nothing.
 *
 * Back from the checkout (`?club=joined`) they're welcomed, and the club is
 * re-read until the pass arrives. Until then there's no join button, so nobody
 * pays twice while Square and the agent catch up.
 */
export function ClubCard({ name }: { name: string | null }) {
  const [club, setClub] = useState<AccountClub | null>(null);
  const [joined] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('club') === 'joined',
  );
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rereads = 0;

    const read = async () => {
      let next: AccountClub | null = null;
      try {
        const res = await fetch('/api/account/club');
        if (res.ok) next = ((await res.json()) as { club: AccountClub | null }).club;
      } catch {
        // The account page never fails over the club: no card is all.
      }
      if (cancelled) return;
      setClub(next);
      if (!joined) return;
      if (next?.pass) {
        // Welcomed, with their pass: a reload from here is just the account page.
        const url = new URL(window.location.href);
        url.searchParams.delete('club');
        window.history.replaceState(null, '', `${url.pathname}${url.search}`);
      } else if (rereads < REREADS) {
        rereads += 1;
        timer = setTimeout(read, REREAD_MS);
      } else {
        setSlow(true);
      }
    };

    void read();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [joined]);

  if (!joined) return club ? <ClubPass club={club} name={name} /> : null;
  return (
    <Stack spacing={3}>
      <Welcome waiting={club?.pass ? null : slow ? 'slow' : 'settingUp'} />
      {club?.pass && <ClubPass club={club} name={name} />}
    </Stack>
  );
}

/** "Welcome to the club", and while the pass is on its way, that it is. */
function Welcome({ waiting }: { waiting: 'settingUp' | 'slow' | null }) {
  const { t } = useLanguage();
  const labels = t.account;
  return (
    <Box
      data-testid="club-welcome"
      sx={{ backgroundColor: brand.matchaTint, borderRadius: `${radius.xl}px`, p: { xs: 3, md: 4 } }}
    >
      <Typography variant="h4" component="h2">
        {labels.clubWelcome}
      </Typography>
      {/* Always mounted, so a screen reader hears the text change. */}
      <Box role="status">
        {waiting && (
          <Typography sx={{ color: brand.ink70, mt: 1 }}>
            {waiting === 'slow' ? labels.clubSlow : labels.clubSettingUp}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/** The card itself, for a club already read: the member's pass, or how to join; nothing when neither applies. */
export function ClubPass({ club, name }: { club: AccountClub; name: string | null }) {
  const { t, lang } = useLanguage();
  const labels = t.account;
  const pass = club.pass;
  if (!pass && !club.join_url) return null;

  const day = (date: string) =>
    new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
      new Date(`${date}T12:00:00Z`),
    );
  const n = club.coffees_per_week;

  return (
    <Box
      component="section"
      aria-label={club.name}
      sx={{ backgroundColor: brand.white, borderRadius: `${radius.xl}px`, boxShadow: shadow.soft, p: { xs: 3, md: 4 } }}
    >
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {club.name}
      </Typography>

      {pass ? (
        <>
          {/* The name, big: what the team reads to find them on the till. */}
          {name && (
            <Typography sx={{ fontSize: { xs: '1.75rem', md: '2rem' }, fontWeight: 600, lineHeight: 1.2, mb: 1 }}>{name}</Typography>
          )}
          <Status
            ready={pass.left_this_week > 0}
            text={
              pass.standing === 'payment_failed'
                ? labels.clubPaymentFailed
                : pass.standing === 'paused'
                  ? labels.clubPaused
                  : pass.standing === 'pending'
                    ? labels.clubStarts.replace('{date}', pass.started_on ? day(pass.started_on) : '–')
                    : pass.left_this_week > 0
                      ? n === 1
                        ? labels.clubReady
                        : labels.clubLeft.replace('{left}', String(pass.left_this_week)).replace('{n}', String(n))
                      : n === 1
                        ? labels.clubHadOne
                        : labels.clubHadAll.replace('{n}', String(n))
            }
          />
          {pass.standing === 'ending' && pass.ends_on && (
            <Typography sx={{ fontSize: '0.875rem', color: brand.ink70, mt: 0.5 }}>
              {labels.clubEnds.replace('{date}', day(pass.ends_on))}
            </Typography>
          )}

          {pass.card_code && code128Encodable(pass.card_code) && (
            <Box sx={{ mt: 3, p: 2, backgroundColor: brand.white, border: `1px solid ${brand.ink06}`, borderRadius: `${radius.lg}px`, textAlign: 'center' }}>
              <Barcode value={pass.card_code} label={labels.clubBarcode.replace('{code}', groupedCode(pass.card_code))} />
              <Typography sx={{ fontSize: '0.75rem', color: brand.ink45, mt: 1 }}>{labels.clubCode}</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '0.12em', fontWeight: 600 }}>
                {groupedCode(pass.card_code)}
              </Typography>
            </Box>
          )}

          <Typography sx={{ fontSize: '0.75rem', color: brand.ink45, mt: 2 }}>{labels.clubShow}</Typography>
        </>
      ) : (
        <>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {labels.clubJoinBody
              .replace('{coffees}', n === 1 ? labels.clubOne : labels.clubMany.replace('{n}', String(n)))
              .replace('{price}', formatEuros(Math.round(club.price * 100), lang))}
          </Typography>
          {/* Their own checkout, with their email filled in; `join_url` only says the café is taking members. */}
          <JoinClubButton />
        </>
      )}
    </Box>
  );
}

function Status({ ready, text }: { ready: boolean; text: string }) {
  return (
    <Typography
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        fontWeight: 500,
        color: ready ? brand.matchaGreenDeep : brand.ink70,
      }}
    >
      {ready && <CheckCircleOutlineRoundedIcon sx={{ fontSize: '1.2rem' }} aria-hidden />}
      {text}
    </Typography>
  );
}

/**
 * The member code as a Code 128 barcode, black on white with quiet zones either
 * side, wide enough to scan from a phone held up at the till.
 */
export function Barcode({ value, label }: { value: string; label: string }) {
  const width = code128Modules(value).length + QUIET * 2;
  return (
    <Box
      component="svg"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} 50`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      sx={{ display: 'block', width: '100%', maxWidth: 360, minWidth: 220, height: 96, mx: 'auto', backgroundColor: '#FFFFFF' }}
    >
      <rect width={width} height={50} fill="#FFFFFF" />
      {code128Bars(value).map(([x, w]) => (
        <rect key={x} x={x + QUIET} y={0} width={w} height={50} fill="#000000" />
      ))}
    </Box>
  );
}
