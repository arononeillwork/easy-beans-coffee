import { Box, Typography } from '@mui/material';
import ProgressRing from './ProgressRing';
import { Hero } from '../styled';
import { roseInk } from '../adminTheme';

type BoardHeroProps = {
  open: number;
  blockers: number;
  done: number;
  percent: number;
  loading: boolean;
};

/** Rose panel at the top: today's date, the headline, and the three counts. */
export default function BoardHero({ open, blockers, done, percent, loading }: BoardHeroProps) {
  return (
    <Hero>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.25 }}>
        <Typography variant="overline" sx={{ color: roseInk }}>
          Easy Beans Coffee
        </Typography>
        <Typography variant="overline" sx={{ color: roseInk }}>
          {formatToday()}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mt: 1.75,
        }}
      >
        <Box>
          <Typography variant="h1" sx={{ mb: 1.75 }}>
            What&rsquo;s left
          </Typography>
          <Box sx={{ display: 'flex', gap: 2.75 }}>
            <Stat value={open} label="open" />
            <Stat value={blockers} label="before reopen" tone="#C4372E" />
            <Stat value={done} label="done" />
          </Box>
        </Box>
        <ProgressRing percent={percent} loading={loading} />
      </Box>
    </Hero>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 21,
          fontWeight: 650,
          letterSpacing: '-.02em',
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums',
          color: tone,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontSize: 10.5,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: roseInk,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
