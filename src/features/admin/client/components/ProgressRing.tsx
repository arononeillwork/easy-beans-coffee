import { Box, Typography } from '@mui/material';

type ProgressRingProps = {
  percent: number;
  loading?: boolean;
  size?: number;
};

/**
 * Lightweight SVG completion ring with a warm gradient stroke. Animates the
 * arc as tasks get checked off, giving the board a sense of momentum.
 */
export default function ProgressRing({ percent, loading = false, size = 84 }: ProgressRingProps) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Box component="svg" width={size} height={size} sx={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0a458" />
            <stop offset="100%" stopColor="#8a6650" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(111,78,55,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={loading ? circumference : offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: 'primary.dark' }}>
            {loading ? '—' : `${clamped}%`}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: '0.06em' }}>
            DONE
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
