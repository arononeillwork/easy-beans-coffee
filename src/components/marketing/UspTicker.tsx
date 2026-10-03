import Box from '@mui/material/Box';
import type { SiteContent } from '@/i18n/content/en';
import { brand } from '@/theme/brand';

/**
 * Continuous marquee of the café's one-liners.
 *
 * The keyframes are declared inline in `sx` rather than via Emotion's
 * `keyframes()` helper: a plain object serializes across the server/client
 * boundary, which is what lets this stay a server component.
 */
export function UspTicker({ t }: { t: SiteContent }) {
  const items = [...t.ticker, ...t.ticker];

  return (
    <Box
      sx={{
        backgroundColor: brand.rosePink,
        color: brand.ink,
        py: 2,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        sx={{
          '@keyframes ebc-ticker-scroll': {
            from: { transform: 'translateX(0)' },
            to: { transform: 'translateX(-50%)' },
          },
          display: 'inline-flex',
          animation: 'ebc-ticker-scroll 36s linear infinite',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {items.map((item, i) => (
          <Box
            key={`${item}-${i}`}
            component="span"
            aria-hidden={i >= t.ticker.length}
            sx={{
              px: 4,
              fontSize: '0.9375rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              '&::after': { content: '"·"', color: brand.rosePinkDeep, pl: 4 },
            }}
          >
            {item}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
