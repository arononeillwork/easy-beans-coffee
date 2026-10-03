'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { brand, motion, radius, shadow } from '@/theme/brand';
import { isSceneFrame } from '../drinkArt';
import type { FamilyPalette } from '../palette';

/**
 * The stage: one drink, lit from behind, that you swipe or step sideways to
 * change.
 *
 * How it is drawn, in layers, back to front:
 *
 *   1. The wash — the drink's own brand tint — is painted by the *parent*
 *      (see MenuStudio's washed region), so the title above and the rail below
 *      share the colour and the whole band cross-fades as one surface.
 *   2. The watermark: the drink's name, oversized, in the family glow colour.
 *      It sits *behind* the photograph on purpose — the cups are composited
 *      with `mix-blend-mode: multiply`, so their white studio ground lets the
 *      type read through, and the drink appears to stand on its own name.
 *   3. The glow, a soft radial of the family colour under the cup.
 *   4. The strip of photographs. A real horizontal scroll container with CSS
 *      scroll-snap — native scrolling gets momentum and rubber-banding right
 *      for free — read back with an IntersectionObserver, so which drink is
 *      "current" survives resizes and zoom without arithmetic.
 *   5. Glass arrows and the position dots, for everyone who does not think to
 *      swipe a web page.
 *
 * Two selection sources meet here and must not fight. A selection made
 * elsewhere (rail, arrows, section switch) scrolls the strip and mutes the
 * observer until the scroll *arrives* — not for a guessed duration. A
 * selection made by the strip itself (a swipe) is marked `fromScroll` and
 * answered with nothing at all: the cup is already in front of the reader, and
 * a programmatic scroll issued mid-gesture drags the swipe back to the drink
 * it just left.
 */

const USER_INPUT = ['pointerdown', 'wheel', 'touchstart'] as const;

export interface StagePanel {
  id: string;
  /** Resolved photograph, or null when the library has none yet. */
  src: string | null;
  /** Display name, for the watermark and the dots. */
  name: string;
  alt: string;
  palette: FamilyPalette;
}

export function DrinkStage({
  panels,
  activeIndex,
  onActiveChange,
  emptyLabel,
  prevLabel,
  nextLabel,
}: {
  panels: StagePanel[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  emptyLabel: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const settling = useRef(false);
  const fromScroll = useRef(false);
  /** When a hand last touched the strip — the mark of a genuine swipe. */
  const lastInputAt = useRef(0);
  /** Mirror of the prop, so the observer can tell a real change from an echo. */
  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;

  // A permanent ear on the strip. The observer below needs to know whether a
  // movement was made by a person, and every human gesture — finger, wheel,
  // trackpad — announces itself through one of these first.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const mark = () => {
      lastInputAt.current = Date.now();
    };
    for (const event of USER_INPUT) root.addEventListener(event, mark, { passive: true });
    return () => {
      for (const event of USER_INPUT) root.removeEventListener(event, mark);
    };
  }, [panels.length]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (settling.current) return;
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const index = panelRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index === -1) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { index, ratio: entry.intersectionRatio };
          }
        }
        if (best && best.ratio > 0.6 && best.index !== activeRef.current) {
          if (Date.now() - lastInputAt.current < 2000) {
            // A hand moved the strip: the strip is the truth.
            fromScroll.current = true;
            onActiveChange(best.index);
          } else {
            // Nobody touched it — a rotation, a resize, a screenshot capture
            // shook the scroll position loose. The customer's selection
            // outranks a relayout; put the strip back where they left it.
            const target = panelRefs.current[activeRef.current];
            if (target) {
              settling.current = true;
              root.scrollTo({ left: target.offsetLeft, behavior: 'auto' });
              setTimeout(() => {
                settling.current = false;
              }, 200);
            }
          }
        }
      },
      { root, threshold: [0.25, 0.6, 0.9] },
    );

    for (const panel of panelRefs.current) {
      if (panel) observer.observe(panel);
    }
    return () => observer.disconnect();
  }, [onActiveChange, panels.length]);

  useEffect(() => {
    // A swipe already put the cup on screen; answer it with nothing.
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }

    const target = panelRefs.current[activeIndex];
    const root = scroller.current;
    if (!target || !root) return;
    if (Math.abs(target.offsetLeft - root.scrollLeft) < 4) return;

    settling.current = true;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const release = () => {
      settling.current = false;
      clearTimeout(fallback);
      root.removeEventListener('scroll', onScroll);
      for (const event of USER_INPUT) root.removeEventListener(event, release);
    };
    const onScroll = () => {
      if (Math.abs(root.scrollLeft - target.offsetLeft) < 4) release();
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    // The strip always yields to a human: any direct input abandons the
    // programmatic scroll and hands the observer straight back.
    for (const event of USER_INPUT) root.addEventListener(event, release, { passive: true });
    // A smooth scroll can be cancelled from outside (another scroll, a layout
    // shift, a screenshotter). If it never arrives, jump the rest of the way —
    // an instant scroll cannot be cancelled — so the strip and the selection
    // can never be left disagreeing, with the observer then "correcting" a
    // choice the customer explicitly made.
    fallback = setTimeout(() => {
      if (Math.abs(root.scrollLeft - target.offsetLeft) > 4) {
        root.scrollTo({ left: target.offsetLeft, behavior: 'auto' });
      }
      release();
    }, 1200);

    root.scrollTo({
      left: target.offsetLeft,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });

    return release;
  }, [activeIndex, panels.length]);

  const active = panels[activeIndex] ?? panels[0];
  const palette = active?.palette;

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Layer 2: the watermark. Keyed so each drink's name rises in fresh. */}
      <Typography
        aria-hidden
        key={active?.id}
        sx={{
          position: 'absolute',
          left: '50%',
          top: '44%',
          transform: 'translate(-50%, -50%)',
          zIndex: 0,
          fontFamily: 'var(--font-poppins), Montserrat, sans-serif',
          fontWeight: 600,
          fontSize: 'clamp(3.6rem, 19vw, 8.5rem)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          color: palette?.glow ?? brand.rosePink,
          opacity: 0.26,
          userSelect: 'none',
          pointerEvents: 'none',
          animation: `watermark-in ${motion.slow} ${motion.easeOutSoft}`,
          '@keyframes watermark-in': {
            from: { opacity: 0, transform: 'translate(-50%, -46%)' },
            to: { opacity: 0.26, transform: 'translate(-50%, -50%)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {firstWord(active?.name)}
      </Typography>

      {/* Layer 3: the glow. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: '50%',
          top: '46%',
          width: 'min(78vw, 440px)',
          aspectRatio: '1',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${palette?.glow ?? brand.rosePink} 0%, transparent 68%)`,
          opacity: 0.42,
          filter: 'blur(8px)',
          transition: `background ${motion.slow} ${motion.easeOutSoft}`,
        }}
      />

      {/* Layer 4: the photographs. */}
      <Box
        ref={scroller}
        role="group"
        aria-roledescription="carousel"
        sx={{
          // No z-index here, deliberately: a stacking context would isolate
          // the multiply-blended cups from the watermark and wash behind them.
          // DOM order alone paints the strip above both.
          position: 'relative',
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          height: { xs: 'clamp(240px, 34vh, 340px)', md: 'clamp(340px, 48vh, 480px)' },
        }}
      >
        {panels.map((panel, index) => (
          <Box
            key={panel.id}
            ref={(node: HTMLDivElement | null) => {
              panelRefs.current[index] = node;
            }}
            data-drink={panel.id}
            role="group"
            aria-roledescription="slide"
            aria-label={panel.alt}
            sx={{
              flex: '0 0 100%',
              scrollSnapAlign: 'center',
              scrollSnapStop: 'always',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 2,
            }}
          >
            {panel.src ? (
              <StageImage src={panel.src} alt={panel.alt} eager={Math.abs(index - activeIndex) <= 1} />
            ) : (
              <EmptyPlate label={emptyLabel} />
            )}
          </Box>
        ))}
      </Box>

      {/* Layer 5: arrows and dots. */}
      {panels.length > 1 && (
        <>
          <StageArrow
            side="left"
            label={prevLabel}
            disabled={activeIndex <= 0}
            onClick={() => onActiveChange(Math.max(0, activeIndex - 1))}
          />
          <StageArrow
            side="right"
            label={nextLabel}
            disabled={activeIndex >= panels.length - 1}
            onClick={() => onActiveChange(Math.min(panels.length - 1, activeIndex + 1))}
          />

          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 10,
              zIndex: 2,
              display: 'flex',
              justifyContent: 'center',
              gap: 0.75,
            }}
          >
            {panels.map((panel, index) => {
              const current = index === activeIndex;
              return (
                <Box
                  key={panel.id}
                  component="button"
                  type="button"
                  aria-label={panel.name}
                  aria-current={current || undefined}
                  onClick={() => onActiveChange(index)}
                  sx={{
                    width: current ? 20 : 6,
                    height: 6,
                    p: 0,
                    border: 0,
                    borderRadius: 3,
                    cursor: 'pointer',
                    backgroundColor: current ? brand.ink : 'rgba(26,26,26,0.22)',
                    transition: `width ${motion.base} ${motion.easeOutSoft}, background-color ${motion.fast} linear`,
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                  }}
                />
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}

function firstWord(name: string | undefined): string {
  if (!name) return '';
  const words = name.split(/\s+/);
  // A one-word ghost; two words when the first is an article-sized bite.
  return words[0].length <= 3 ? words.slice(0, 2).join(' ') : words[0];
}

/** Frosted-glass step arrow, floating on the wash. */
function StageArrow({
  side,
  label,
  disabled,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeftRoundedIcon : ChevronRightRoundedIcon;
  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      sx={{
        position: 'absolute',
        top: '50%',
        [side]: { xs: 10, sm: 20 },
        transform: 'translateY(-50%)',
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        border: '1px solid rgba(255,255,255,0.65)',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(8px)',
        color: brand.ink,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        boxShadow: shadow.soft,
        transition: `opacity ${motion.fast} linear, transform ${motion.base} ${motion.easeOutSoft}, box-shadow ${motion.base} ${motion.easeOutSoft}`,
        '@media (hover: hover)': {
          '&:hover:not(:disabled)': {
            boxShadow: shadow.lift,
            transform: 'translateY(-50%) scale(1.06)',
          },
        },
        '&:active:not(:disabled)': { transform: 'translateY(-50%) scale(0.94)' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Icon aria-hidden />
    </Box>
  );
}

/**
 * The cup, cross-faded when the choice underneath it changes, riding a slow
 * drift so the stage never reads as a still.
 *
 * Swapping `src` on a single element makes the cup blink white for a frame on
 * every press of Hot/Iced — the one interaction this screen is built around —
 * so the outgoing frame is held underneath until the incoming one has decoded.
 * Plain <img> rather than next/image on purpose: these files are already
 * encoded to exactly the size they render at (see scripts/fetch-drink-art), so
 * the optimiser has nothing to add and its URL indirection would defeat the
 * preloading in MenuStudio.
 */
function StageImage({ src, alt, eager }: { src: string; alt: string; eager: boolean }) {
  const [frames, setFrames] = useState<{ current: string; outgoing: string | null }>({
    current: src,
    outgoing: null,
  });

  useEffect(() => {
    setFrames((previous) =>
      previous.current === src ? previous : { current: src, outgoing: previous.current },
    );
  }, [src]);

  return (
    // No transform or animation on this wrapper: either would create a
    // stacking context and cut the blended imgs off from the stage behind.
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {frames.outgoing && (
        <StageFrame
          key={frames.outgoing}
          src={frames.outgoing}
          alt=""
          fading
          eager
          onDone={() => setFrames((previous) => ({ ...previous, outgoing: null }))}
        />
      )}
      <StageFrame key={frames.current} src={frames.current} alt={alt} eager={eager} />
    </Box>
  );
}

function StageFrame({
  src,
  alt,
  eager,
  fading = false,
  onDone,
}: {
  src: string;
  alt: string;
  eager: boolean;
  fading?: boolean;
  onDone?: () => void;
}) {
  const scene = isSceneFrame(src);
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onAnimationEnd={onDone}
      sx={{
        position: 'absolute',
        // A photograph is given a frame and inset from the edges; a cut-out
        // fills the stage and blends into it.
        ...(scene
          ? {
              inset: '0 auto',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(64%, 300px)',
              height: '100%',
              objectFit: 'cover',
              borderRadius: `${radius.xl}px`,
              boxShadow: shadow.lift,
            }
          : {
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              // See the layer notes at the top of the file: multiply is what
              // lets the studio white behind every cup disappear into the
              // stage and the watermark show through.
              mixBlendMode: 'multiply',
            }),
        // Fade and drift ride the same property; the drift is only for
        // cut-outs — a framed photograph should hang still (and owns its
        // transform for centring anyway).
        animation: fading
          ? `stage-out ${motion.base} ${motion.easeOutSoft} forwards`
          : scene
            ? `stage-in ${motion.base} ${motion.easeOutSoft}`
            : `stage-in ${motion.base} ${motion.easeOutSoft}, stage-drift 7s ease-in-out ${motion.base} infinite alternate`,
        '@keyframes stage-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        '@keyframes stage-out': {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
        '@keyframes stage-drift': {
          from: { transform: 'translateY(3px)' },
          to: { transform: 'translateY(-5px)' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: fading ? 0 : 1 },
      }}
    />
  );
}

/** Stand-in for a drink the café has not photographed yet. */
function EmptyPlate({ label }: { label: string }) {
  return (
    <Box
      sx={{
        width: 'min(60vw, 240px)',
        aspectRatio: '3 / 4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        borderRadius: 999,
        border: '1px dashed rgba(26,26,26,0.25)',
        backgroundColor: 'rgba(255,255,255,0.35)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Typography variant="h6" component="p" sx={{ color: brand.ink45, textAlign: 'center' }}>
        {label}
      </Typography>
    </Box>
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
