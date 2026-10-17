'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { DayHours } from '@/shared/lib/openingHours';
import { clockLabel, describeWhen, openState } from '@/shared/lib/openNow';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand } from '@/theme/brand';
import { CAFE_TZ } from './links';

/**
 * "Open until 15:00" / "Closed. We open tomorrow at 8:00" — worked out in the
 * visitor's browser from the live Google hours, because the page itself is
 * cached and "now" is not. Renders nothing until mounted, so the cached HTML
 * never claims a state that has since changed.
 */
export function LiveStatus({ hours }: { hours: DayHours[] }) {
  const { t, lang } = useLanguage();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(tick);
  }, []);

  if (now === null) return <Box sx={{ minHeight: 28 }} aria-hidden />;

  const state = openState(hours, now, CAFE_TZ);
  const label = state.open
    ? t.status.openUntil.replace('{time}', clockLabel(state.closesAt, CAFE_TZ))
    : state.opensAt
      ? t.status.opensAt.replace('{when}', describeWhen(state.opensAt, now, lang, CAFE_TZ))
      : null;
  if (!label) return null;

  return (
    <Typography
      component="p"
      data-testid="open-status"
      data-open={state.open ? 'true' : 'false'}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, minHeight: 28, fontWeight: 500 }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: state.open ? brand.matchaGreen : brand.greyLimewash,
          boxShadow: state.open ? `0 0 0 4px ${brand.matchaTint}` : 'none',
        }}
      />
      {label}
    </Typography>
  );
}
