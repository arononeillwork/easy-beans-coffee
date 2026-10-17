import Image from 'next/image';
import Box from '@mui/material/Box';
import type { Lang } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import { brand } from '@/theme/brand';
import { competitionCopy } from './copy';

/**
 * The competition poster, built as a real page section rather than a flat
 * image: live text, the café's own product cut-outs (transparent PNGs), and a
 * QR code — so it reflows from a phone up to the in-store TV.
 *
 * Phone: headline → drinks → steps → "Enter now" button (no QR: they're
 * already on the page). Tablet/desktop/TV: text column left, drinks right,
 * QR bottom-left for people looking at the shop screen.
 */

const ESPRESSO = '#3B2A20';
const PLASTER = '#EADBCB';

type Product = {
  src: string;
  alt: string;
  w: number;
  h: number;
  /** Position inside the stage, in % of the stage box. */
  left: string;
  bottom: string;
  height: string;
  z: number;
};

// Back row first, hero cans last (painted on top).
const PRODUCTS: Product[] = [
  { src: 'hot-latte', alt: 'Hot latte with latte art', w: 625, h: 442, left: '0%', bottom: '31%', height: '24%', z: 1 },
  { src: 'acai-bowl', alt: 'Açaí bowl', w: 647, h: 657, left: '77%', bottom: '30%', height: '31%', z: 1 },
  { src: 'smoothie', alt: 'Strawberry smoothie', w: 375, h: 900, left: '6%', bottom: '8%', height: '46%', z: 2 },
  { src: 'matcha-vanilla-can', alt: 'Iced matcha vanilla in a can glass', w: 369, h: 900, left: '21%', bottom: '8%', height: '70%', z: 3 },
  { src: 'ube-matcha-can', alt: 'Iced ube matcha in a can glass', w: 313, h: 820, left: '61%', bottom: '8%', height: '66%', z: 3 },
  { src: 'iced-latte-can', alt: 'Iced latte in a can glass', w: 354, h: 900, left: '40.5%', bottom: '3%', height: '80%', z: 4 },
];

/** A few small bean clusters for texture, drawn in SVG so they stay crisp. */
function Beans({ sx }: { sx: object }) {
  const beans = [
    [14, 14, 20], [34, 10, -35], [24, 30, 60], [46, 26, 10], [8, 36, -60], [40, 44, 40],
  ];
  return (
    <Box aria-hidden sx={{ position: 'absolute', pointerEvents: 'none', ...sx }}>
      <svg viewBox="0 0 56 56" width="100%" height="100%">
        {beans.map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r})`} opacity={0.5}>
            <ellipse rx="5.2" ry="7.4" fill="#6F4C34" />
            <path d="M0,-6 C2,-2 -2,2 0,6" stroke={brand.cream} strokeWidth="1.1" fill="none" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </Box>
  );
}

function StepPill({ n, text, bg }: { n: number; text: string; bg: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: { xs: 1.5, md: 2 },
        backgroundColor: bg,
        borderRadius: 999,
        py: { xs: 1, md: 1.25 },
        pl: { xs: 1, md: 1.25 },
        pr: { xs: 2.5, md: 3.5 },
        maxWidth: '100%',
      }}
    >
      <Box
        component="span"
        sx={{
          width: { xs: 34, md: 'clamp(36px, 3.2vw, 56px)' },
          height: { xs: 34, md: 'clamp(36px, 3.2vw, 56px)' },
          flexShrink: 0,
          borderRadius: '50%',
          backgroundColor: ESPRESSO,
          color: brand.cream,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 600,
          fontSize: { xs: '1rem', md: 'clamp(1rem, 1.5vw, 1.6rem)' },
        }}
      >
        {n}
      </Box>
      <Box
        component="span"
        sx={{ color: ESPRESSO, fontWeight: 600, fontSize: { xs: '1.05rem', md: 'clamp(1rem, 1.45vw, 1.8rem)' }, lineHeight: 1.2, whiteSpace: 'nowrap' }}
      >
        {text}
      </Box>
    </Box>
  );
}

export function CompetitionPoster({ lang }: { lang: Lang }) {
  const c = competitionCopy(lang);
  const termsHref = localePath(lang, '/competition-terms');

  return (
    <Box
      component="section"
      aria-labelledby="competition-headline"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        // Warm cream with a soft light pool, like the poster's morning light.
        background: `radial-gradient(120% 90% at 70% 15%, #FFF7EE 0%, ${brand.cream} 55%, #F1E2D3 100%)`,
        height: { md: 'calc(100svh - 76px)' },
        minHeight: { md: 600 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 40fr) minmax(0, 60fr)' },
        gridTemplateAreas: { xs: '"head" "stage" "steps" "foot"', md: '"head stage" "steps stage" "foot stage"' },
        gridTemplateRows: { md: 'auto auto minmax(0, 1fr)' },
        columnGap: { md: 2 },
        px: { xs: 2.5, sm: 4, md: '4vw' },
        pt: { xs: 4, md: 'clamp(24px, 4.5vh, 64px)' },
        pb: { xs: 4, md: 'clamp(20px, 3.5vh, 48px)' },
      }}
    >
      <Beans sx={{ top: { xs: 10, md: '2vw' }, left: { xs: 8, md: '36vw' }, width: { xs: 54, md: '5vw' }, height: { xs: 54, md: '5vw' } }} />
      <Beans sx={{ top: { xs: 10, md: '2vw' }, right: { xs: 8, md: '2vw' }, width: { xs: 54, md: '5.5vw' }, height: { xs: 54, md: '5.5vw' }, transform: 'scaleX(-1)' }} />
      <Beans sx={{ bottom: { xs: 12, md: '2vw' }, right: { xs: 12, md: '3vw' }, width: { xs: 50, md: '5vw' }, height: { xs: 50, md: '5vw' }, transform: 'rotate(90deg)' }} />

      {/* Headline */}
      <Box sx={{ gridArea: 'head', textAlign: { xs: 'center', md: 'left' }, position: 'relative', zIndex: 5 }}>
        <Box
          component="h1"
          id="competition-headline"
          sx={{
            m: 0,
            color: ESPRESSO,
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 0.95,
            fontSize: { xs: 'clamp(3.6rem, 19vw, 6rem)', md: 'clamp(3.6rem, 7vw, 10rem)' },
            whiteSpace: 'nowrap',
          }}
        >
          {c.posterHeadline}
        </Box>
        <Box
          component="p"
          sx={{
            m: 0,
            mt: { xs: 0.5, md: '0.6vw' },
            color: ESPRESSO,
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            fontSize: { xs: 'clamp(1.5rem, 7.4vw, 2.4rem)', md: 'clamp(1.5rem, 2.8vw, 4rem)' },
            lineHeight: 1.1,
          }}
        >
          {c.posterSub}
        </Box>
      </Box>

      {/* Product stage */}
      <Box
        sx={{
          gridArea: 'stage',
          position: 'relative',
          alignSelf: { md: 'end' },
          justifySelf: { md: 'end' },
          // Width-led on phones; on big screens capped by the hero's height so
          // the drinks never push the text column or spill off the bottom.
          width: { xs: '100%', md: 'min(100%, calc((100svh - 76px - 9vh) * 1.3333))' },
          aspectRatio: { xs: '10 / 8.4', md: '4 / 3' },
          mt: { xs: 2, md: 0 },
          mx: 'auto',
          maxWidth: { xs: 560, md: '100%' },
        }}
      >
        {/* Plaster ledge the products stand on */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: '-6%',
            right: '-12%',
            bottom: '-8%',
            height: '30%',
            borderRadius: '28px 28px 0 0',
            background: `linear-gradient(180deg, #F3E7DA 0%, ${PLASTER} 35%, #E2D0BD 100%)`,
            boxShadow: 'inset 0 10px 18px rgba(255,255,255,0.55)',
          }}
        />
        {PRODUCTS.map((p) => (
          <Box
            key={p.src}
            sx={{
              position: 'absolute',
              left: p.left,
              bottom: p.bottom,
              height: p.height,
              aspectRatio: `${p.w} / ${p.h}`,
              zIndex: p.z,
              filter: 'drop-shadow(0 14px 16px rgba(59,42,32,0.22))',
            }}
          >
            <Image
              src={`/media/competition/${p.src}.png`}
              alt={p.alt}
              fill
              priority={p.z >= 3}
              sizes="(max-width: 899px) 40vw, 22vw"
              style={{ objectFit: 'contain' }}
            />
          </Box>
        ))}
      </Box>

      {/* Steps */}
      <Box
        sx={{
          gridArea: 'steps',
          display: 'flex',
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-start' },
          gap: { xs: 1.25, md: '1.1vw' },
          mt: { xs: 3, md: '2.6vw' },
          position: 'relative',
          zIndex: 5,
        }}
      >
        <StepPill n={1} text={c.posterStep1} bg={brand.rosePinkTint} />
        <StepPill n={2} text={c.posterStep2} bg={brand.lilacTint} />

        {/* Phones: they are already here, so a button instead of a QR. */}
        <Box
          component="a"
          href="#enter"
          sx={{
            display: { xs: 'inline-flex', md: 'none' },
            mt: 1.5,
            px: 4,
            py: 1.6,
            borderRadius: 999,
            backgroundColor: ESPRESSO,
            color: brand.cream,
            fontWeight: 600,
            fontSize: '1.05rem',
            textDecoration: 'none',
          }}
        >
          {c.enterNow} ↓
        </Box>
      </Box>

      {/* Footer: QR (big screens) + small print */}
      <Box
        sx={{
          gridArea: 'foot',
          alignSelf: 'end',
          mt: { xs: 3, md: '2vw' },
          textAlign: { xs: 'center', md: 'left' },
          position: 'relative',
          zIndex: 5,
        }}
      >
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: '1.6vw', mb: '2.2vw' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/competition/qr.svg"
            alt={c.qrAlt}
            style={{
              width: 'clamp(120px, 11vw, 280px)',
              height: 'auto',
              aspectRatio: '1',
              display: 'block',
              boxSizing: 'border-box',
              padding: 'clamp(12px, 1.1vw, 28px)',
              background: '#FFFFFF',
              borderRadius: 'clamp(16px, 1.6vw, 36px)',
              boxShadow: '0 8px 24px rgba(59,42,32,0.10)',
            }}
          />
          <Box sx={{ color: ESPRESSO, fontWeight: 600, fontSize: 'clamp(1.1rem, 1.7vw, 2rem)' }}>{c.scanToEnter}</Box>
        </Box>
        <Box sx={{ color: ESPRESSO, fontWeight: 600, fontSize: { xs: '0.95rem', md: 'clamp(0.95rem, 1.15vw, 1.4rem)' } }}>
          Easy Beans Coffee · San Pedro
        </Box>
        <Box sx={{ mt: 0.5, color: ESPRESSO, opacity: 0.85, fontSize: { xs: '0.85rem', md: 'clamp(0.85rem, 0.95vw, 1.15rem)' } }}>
          {c.monthlyDraw} ·{' '}
          <Box component="a" href={termsHref} sx={{ color: 'inherit', textUnderlineOffset: '3px' }}>
            {c.termsShort}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
