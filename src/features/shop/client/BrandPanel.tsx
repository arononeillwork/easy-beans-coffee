'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { brand } from '@/theme/brand';

/** Deterministic tint per key so a grid of panels still reads as designed. */
const TINTS = [brand.roseWash, brand.matchaTint, brand.lilacTint, brand.limewashTint];

function tintFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

/**
 * Stand-in for missing photography: the wordmark on a brand tint. Used wherever
 * we have no honest shot of a product, rather than borrowing an unrelated one.
 * The lockup rules allow the mark on cream and limewash grounds.
 */
export function BrandPanel({ tintKey }: { tintKey: string }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        backgroundColor: tintFor(tintKey),
      }}
    >
      <Typography
        sx={{
          fontFamily: 'var(--font-poppins)',
          fontWeight: 600,
          fontSize: '1.35rem',
          letterSpacing: '-0.02em',
          color: brand.ink,
        }}
      >
        Easy Beans
      </Typography>
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: brand.ink70,
        }}
      >
        Coffee
      </Typography>
    </Box>
  );
}
