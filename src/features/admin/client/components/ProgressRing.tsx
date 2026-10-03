import { Box, Typography } from '@mui/material';
import { matcha, roseInk } from '../adminTheme';

type ProgressRingProps = {
  percent: number;
  loading?: boolean;
  size?: number;
};

/**
 * Completion ring for the hero. Matcha arc on a rose track, animating as jobs
 * get ticked off so the board shows momentum at a glance.
 */
export default function ProgressRing({ percent, loading = false, size = 84 }: ProgressRingProps) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <Box component="svg" width={size} height={size} sx={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(122,78,85,.16)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={matcha}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={loading ? circumference : offset}
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </Box>
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 650,
            letterSpacing: '-.02em',
            fontVariantNumeric: 'tabular-nums',
            color: roseInk,
          }}
        >
          {loading ? '—' : `${clamped}%`}
        </Typography>
      </Box>
    </Box>
  );
}
