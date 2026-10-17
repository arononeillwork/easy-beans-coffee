import Box from '@mui/material/Box';
import type { SiteContent } from '@/i18n/content/en';
import { brand } from '@/theme/brand';

/**
 * The café's selling points as a slow Rose Pink marquee. Pure CSS, no
 * JavaScript; stops for anyone who asked for reduced motion. The list is
 * rendered twice so the loop has no seam; the second copy is hidden from
 * screen readers.
 */
export function Ticker({ t }: { t: SiteContent }) {
  const run = (hidden: boolean) => (
    <Box component="ul" aria-hidden={hidden || undefined} sx={{ display: 'flex', flexShrink: 0, m: 0, p: 0, listStyle: 'none' }}>
      {t.ticker.map((item) => (
        <Box
          component="li"
          key={item}
          sx={{
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-poppins)',
            fontWeight: 500,
            fontSize: { xs: '1rem', md: '1.25rem' },
            letterSpacing: '-0.01em',
            '&::after': {
              content: '""',
              display: 'inline-block',
              width: 7,
              height: 7,
              mx: { xs: 2.5, md: 4 },
              borderRadius: '50%',
              backgroundColor: brand.ink,
            },
          }}
        >
          {item}
        </Box>
      ))}
    </Box>
  );

  return (
    <Box
      component="section"
      aria-label={t.ticker.join(', ')}
      sx={{
        backgroundColor: brand.rosePink,
        color: brand.ink,
        overflow: 'hidden',
        py: { xs: 1.75, md: 2.25 },
        '@keyframes ebc-marquee': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          width: 'max-content',
          animation: 'ebc-marquee 48s linear infinite',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {run(false)}
        {run(true)}
      </Box>
    </Box>
  );
}
