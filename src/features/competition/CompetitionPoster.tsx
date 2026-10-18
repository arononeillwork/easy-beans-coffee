import Image from 'next/image';
import Box from '@mui/material/Box';
import type { Lang } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import { brand } from '@/theme/brand';
import { competitionCopy } from './copy';

/**
 * The competition poster, built as a real page section rather than a flat
 * image: live text and QR code, with the poster's drinks scene as the one
 * photo, so it reflows from a phone up to the in-store TV.
 *
 * Phone: headline → drinks → steps → "Enter now" button (no QR: they're
 * already on the page). Tablet/desktop/TV: text column left, drinks right,
 * QR bottom-left for people looking at the shop screen.
 */

const ESPRESSO = '#3B2A20';

const SCENE_ALT =
  'Iced matcha vanilla, iced latte and iced ube matcha in can glasses, with a hot latte, strawberry smoothie, açaí bowl and croissant';

/** Soft fade on the photo's left and top edges so it melts into the cream. */
const SCENE_MASK = {
  // Phone: full-bleed, so only the top and bottom edges need to soften.
  xs: 'linear-gradient(to bottom, transparent 0%, #000 10%, #000 88%, transparent 100%)',
  // Big screens: the photo runs off the right and bottom edges; soften the
  // left and top where it meets the text column.
  md: 'linear-gradient(to right, transparent 0%, #000 14%), linear-gradient(to bottom, transparent 0%, #000 12%)',
};

/**
 * A TV mounted on its side. The side-by-side layout leaves most of a tall
 * screen empty, so the in-café display stacks everything in one centred
 * column instead, sized off the screen width so it reads from across the room.
 */
const PORTRAIT = '@media (orientation: portrait) and (min-width: 600px)';

/**
 * Squarer portrait screens (3:4 tablets) leave too little height for a
 * full-width photo, so there the whole scene is shown, centred, with its
 * sides faded into the cream instead of cropping the tops off the cans.
 */
const PORTRAIT_SQUAT = '@media (orientation: portrait) and (min-width: 600px) and (min-aspect-ratio: 2/3)';
const SIDE_FADE = 'linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)';

/** Top and bottom fade for the drinks when they span the full width. */
const PORTRAIT_MASK = 'linear-gradient(to bottom, transparent 0%, #000 14%, #000 90%, transparent 100%)';

function StepPill({ n, text, bg, href, portrait }: { n: number; text: string; bg: string; href?: string; portrait?: boolean }) {
  return (
    <Box
      {...(href ? { component: 'a' as const, href } : {})}
      sx={{
        display: 'inline-flex',
        textDecoration: 'none',
        ...(href && {
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(59,42,32,0.10)',
          transition: 'transform 150ms ease, box-shadow 150ms ease, filter 150ms ease',
          '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 8px 20px rgba(59,42,32,0.16)', filter: 'brightness(0.97)' },
          '&:focus-visible': { outline: `3px solid ${ESPRESSO}`, outlineOffset: 3 },
        }),
        alignItems: 'center',
        gap: { xs: 1.5, md: 2 },
        backgroundColor: bg,
        borderRadius: 999,
        py: { xs: 1, md: 1.25 },
        pl: { xs: 1, md: 1.25 },
        pr: { xs: 2.5, md: 3.5 },
        maxWidth: '100%',
        ...(portrait && { [PORTRAIT]: { gap: '2.2vw', py: '1.3vw', pl: '1.3vw', pr: '4vw' } }),
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
          ...(portrait && { [PORTRAIT]: { width: '7vw', height: '7vw', fontSize: '3.4vw' } }),
        }}
      >
        {n}
      </Box>
      <Box
        component="span"
        sx={{
          color: ESPRESSO,
          fontWeight: 600,
          fontSize: { xs: '1.05rem', md: 'clamp(1rem, 1.45vw, 1.8rem)' },
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          ...(portrait && { [PORTRAIT]: { fontSize: '3.9vw' } }),
        }}
      >
        {text}
      </Box>
      {href && (
        <Box component="span" aria-hidden sx={{ color: ESPRESSO, fontWeight: 600, fontSize: { xs: '1.05rem', md: 'clamp(1rem, 1.45vw, 1.8rem)' }, ml: -0.5 }}>
          →
        </Box>
      )}
    </Box>
  );
}

export function CompetitionPoster({
  lang,
  variant = 'page',
}: {
  lang: Lang;
  /**
   * `page`: the responsive web page, sitting under the site header and the
   * offer bar. `screen`: the in-café display — fills the whole screen, always
   * shows the QR code, no "Enter now" button.
   */
  variant?: 'page' | 'screen';
}) {
  const isScreen = variant === 'screen';
  // Space taken above the hero on big screens (header + offer bar on the page).
  const above = isScreen ? '0px' : '120px';
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
        background: 'radial-gradient(120% 90% at 70% 15%, #FCF5EC 0%, #FAF0E5 55%, #F4E6D7 100%)',
        height: { md: `calc(100svh - ${above})` },
        minHeight: { md: 600 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 40fr) minmax(0, 60fr)' },
        gridTemplateAreas: { xs: '"head" "stage" "steps" "foot"', md: '"head stage" "steps stage" "foot stage"' },
        gridTemplateRows: { md: 'auto auto minmax(0, 1fr)' },
        columnGap: { md: 2 },
        px: { xs: 2.5, sm: 4, md: '4vw' },
        pt: { xs: 4, md: 'clamp(24px, 4.5vh, 64px)' },
        pb: { xs: 4, md: 'clamp(20px, 3.5vh, 48px)' },
        ...(isScreen && {
          [PORTRAIT]: {
            height: '100svh',
            minHeight: 0,
            gridTemplateColumns: '1fr',
            gridTemplateAreas: '"head" "stage" "steps" "foot"',
            gridTemplateRows: 'auto minmax(0, 1fr) auto auto',
            columnGap: 0,
            paddingLeft: '6vw',
            paddingRight: '6vw',
            paddingTop: '5vh',
            paddingBottom: '3.5vh',
          },
        }),
      }}
    >

      {/* Headline */}
      <Box sx={{ gridArea: 'head', textAlign: { xs: 'center', md: 'left' }, position: 'relative', zIndex: 5, ...(isScreen && { [PORTRAIT]: { textAlign: 'center' } }) }}>
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
            ...(isScreen && { [PORTRAIT]: { fontSize: '15vw' } }),
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
            ...(isScreen && { [PORTRAIT]: { fontSize: '6.2vw', marginTop: '0.6vh' } }),
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
          width: {
            xs: 'calc(100% + 40px)',
            sm: 'calc(100% + 64px)',
            md: `min(calc(100% + 4vw), calc((100svh - ${above} - 5vh) * 1.2026))`,
          },
          // Phones use the tighter crop; big screens the tall one with the
          // palm-leaf shadow above the drinks.
          aspectRatio: { xs: '1828 / 1190', md: '1828 / 1520' },
          WebkitMaskImage: SCENE_MASK,
          maskImage: SCENE_MASK,
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
          mt: { xs: 2, md: 0 },
          // Bleed to the screen edges: both sides on phones, right and bottom
          // on big screens (undoing the section's padding).
          mx: { xs: -2.5, sm: -4, md: 0 },
          mr: { md: '-4vw' },
          mb: { md: 'calc(-1 * clamp(20px, 3.5vh, 48px))' },
          maxWidth: { md: 'calc(100% + 4vw)' },
          // Portrait display: the drinks take all the height left between the
          // headline and the steps, edge to edge.
          ...(isScreen && {
            [PORTRAIT]: {
              alignSelf: 'stretch',
              justifySelf: 'stretch',
              width: 'auto',
              maxWidth: 'none',
              aspectRatio: 'auto',
              marginLeft: '-6vw',
              marginRight: '-6vw',
              marginTop: '1.5vh',
              marginBottom: 0,
              WebkitMaskImage: PORTRAIT_MASK,
              maskImage: PORTRAIT_MASK,
              '& img': { objectPosition: 'center 78%' },
            },
          }),
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: { xs: 'block', md: 'none' },
            ...(isScreen && {
              [PORTRAIT]: { display: 'none' },
              [PORTRAIT_SQUAT]: {
                display: 'block',
                inset: 'auto',
                top: 0,
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                height: '100%',
                aspectRatio: '1828 / 1190',
                maxWidth: '100%',
                WebkitMaskImage: SIDE_FADE,
                maskImage: SIDE_FADE,
              },
            }),
          }}
        >
          <Image src="/media/competition/drinks-scene.png" alt={SCENE_ALT} fill priority sizes="100vw" style={{ objectFit: 'cover' }} />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: { xs: 'none', md: 'block' },
            ...(isScreen && { [PORTRAIT]: { display: 'block' }, [PORTRAIT_SQUAT]: { display: 'none' } }),
          }}
        >
          <Image src="/media/competition/drinks-scene-tall.png" alt={SCENE_ALT} fill priority sizes="62vw" style={{ objectFit: 'cover' }} />
        </Box>
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
          ...(isScreen && { [PORTRAIT]: { alignItems: 'center', gap: '1.4vh', marginTop: '2.5vh' } }),
        }}
      >
        <StepPill n={1} text={c.posterStep1} bg={brand.rosePinkTint} portrait={isScreen} />
        {/* On the web page step 2 is a button straight to the form; on the
            in-café display it stays a label beside the QR code. */}
        <StepPill n={2} text={c.posterStep2} bg={brand.lilacTint} href={isScreen ? undefined : '#enter'} portrait={isScreen} />

        {/* Web page (phone + desktop): visitors are already here, so a button
            to the form instead of a QR code. */}
        <Box
          component="a"
          href="#enter"
          sx={{
            display: isScreen ? 'none' : 'inline-flex',
            '&:hover': { backgroundColor: '#24180f' },
            mt: 1.5,
            px: 4,
            py: 1.6,
            borderRadius: 999,
            backgroundColor: ESPRESSO,
            color: brand.cream,
            fontWeight: 600,
            fontSize: { xs: '1.05rem', md: 'clamp(1.05rem, 1.3vw, 1.5rem)' },
            textDecoration: 'none',
          }}
        >
          {c.enterNow} ↓
        </Box>
      </Box>

      {/* Footer: QR (in-café display only) + small print */}
      <Box
        sx={{
          gridArea: 'foot',
          alignSelf: 'end',
          mt: { xs: 3, md: '2vw' },
          textAlign: { xs: 'center', md: 'left' },
          position: 'relative',
          zIndex: 5,
          ...(isScreen && { [PORTRAIT]: { textAlign: 'center', marginTop: '3vh' } }),
        }}
      >
        <Box
          sx={{
            display: isScreen ? 'flex' : 'none',
            justifyContent: { xs: 'center', md: 'flex-start' },
            alignItems: 'center',
            gap: { xs: 2, md: '1.6vw' },
            mb: { xs: 2, md: '2.2vw' },
            [PORTRAIT]: { justifyContent: 'center', gap: '3.5vw', marginBottom: '2.5vh' },
          }}
        >
          <Box
            component="img"
            src="/media/competition/qr.svg"
            alt={c.qrAlt}
            sx={{
              width: 'clamp(120px, 11vw, 280px)',
              height: 'auto',
              aspectRatio: '1',
              display: 'block',
              boxSizing: 'border-box',
              padding: 'clamp(12px, 1.1vw, 28px)',
              background: '#FFFFFF',
              borderRadius: 'clamp(16px, 1.6vw, 36px)',
              boxShadow: '0 8px 24px rgba(59,42,32,0.10)',
              [PORTRAIT]: { width: '22vw', padding: '2vw', borderRadius: '2.8vw' },
            }}
          />
          <Box sx={{ color: ESPRESSO, fontWeight: 600, fontSize: 'clamp(1.1rem, 1.7vw, 2rem)', ...(isScreen && { [PORTRAIT]: { fontSize: '4.6vw' } }) }}>
            {c.scanToEnter}
          </Box>
        </Box>
        <Box sx={{ color: ESPRESSO, fontWeight: 600, fontSize: { xs: '0.95rem', md: 'clamp(0.95rem, 1.15vw, 1.4rem)' }, ...(isScreen && { [PORTRAIT]: { fontSize: '2.5vw' } }) }}>
          Easy Beans Coffee · San Pedro
        </Box>
        <Box sx={{ mt: 0.5, color: ESPRESSO, opacity: 0.85, fontSize: { xs: '0.85rem', md: 'clamp(0.85rem, 0.95vw, 1.15rem)' }, ...(isScreen && { [PORTRAIT]: { fontSize: '1.9vw' } }) }}>
          {c.monthlyDraw} ·{' '}
          <Box component="a" href={termsHref} sx={{ color: 'inherit', textUnderlineOffset: '3px' }}>
            {c.termsShort}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
