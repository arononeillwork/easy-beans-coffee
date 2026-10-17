'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import type { DayHours } from '@/shared/lib/openingHours';
import { clockLabel, describeWhen, openState, type OpenState } from '@/shared/lib/openNow';
import { brand } from '@/theme/brand';
import { CAFE_TZ } from './links';

/**
 * "Open until 15:00" / "Closed. We open tomorrow at 8:00", from the live Google
 * hours. Worked out in the browser, not at build time: the page is cached, and
 * a server-rendered "open" would go stale the moment the café closed. Nothing
 * is drawn until the browser has the clock, so there is no flash of a wrong
 * answer.
 */
export function OpenNowPill({
  hours,
  lang,
  openUntil,
  opensAt,
}: {
  hours: DayHours[];
  lang: string;
  openUntil: string;
  opensAt: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) return <Box sx={{ height: 34 }} aria-hidden />;

  const state: OpenState = openState(hours, now, CAFE_TZ);
  const text = state.open
    ? openUntil.replace('{time}', clockLabel(state.closesAt, CAFE_TZ))
    : state.opensAt
      ? opensAt.replace('{when}', describeWhen(state.opensAt, now, lang, CAFE_TZ))
      : null;
  if (!text) return null;

  return (
    <Box
      data-testid="open-now"
      data-open={state.open ? 'true' : 'false'}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        alignSelf: 'flex-start',
        px: 1.5,
        py: 0.75,
        borderRadius: 999,
        backgroundColor: brand.white,
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: state.open ? '#3E9B57' : brand.rosePinkDeep,
          boxShadow: state.open ? '0 0 0 4px rgba(62,155,87,0.18)' : 'none',
        }}
      />
      {text}
    </Box>
  );
}
