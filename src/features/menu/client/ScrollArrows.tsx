'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { brand, motion, shadow } from '@/theme/brand';

/**
 * The click affordance for a horizontal rail that holds more than it shows.
 *
 * A rail cut off at the screen edge only reads as scrollable to someone who
 * already knows to swipe it, so each side that has more content gets a small
 * arrow floating over the edge. The arrows appear and retire with the scroll
 * position — an arrow pointing at nothing is a broken promise — and a rail
 * short enough to show whole never grows them at all.
 *
 * Deliberately arrows and not an edge fade: the drink thumbnails are
 * multiply-blended into the wash behind them, and a mask on their scroller
 * would give it a stacking context that cuts them off from it (see Rails).
 */

/** Slack in px before an edge counts as reached — subpixel scroll positions. */
const EDGE = 4;

/**
 * Watches a rail for overflow on either side. `contentKey` names what the rail
 * currently holds; changing it re-measures and, where the rail mounts fresh
 * (the pick row), re-attaches to the new node.
 */
export function useRailOverflow(contentKey: unknown) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState({ back: false, ahead: false });

  useEffect(() => {
    const root = scroller.current;
    if (!root) {
      setOverflow((previous) =>
        previous.back || previous.ahead ? { back: false, ahead: false } : previous,
      );
      return;
    }

    const measure = () => {
      const back = root.scrollLeft > EDGE;
      const ahead = root.scrollLeft < root.scrollWidth - root.clientWidth - EDGE;
      setOverflow((previous) =>
        previous.back === back && previous.ahead === ahead ? previous : { back, ahead },
      );
    };

    measure();
    root.addEventListener('scroll', measure, { passive: true });
    // Re-measure on resize; content changes announce themselves via
    // `contentKey` re-running this effect.
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => {
      root.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [contentKey]);

  const page = useCallback((direction: -1 | 1) => {
    const root = scroller.current;
    if (!root) return;
    root.scrollBy({
      // Most of a viewport per press, so context carries across the step.
      left: direction * Math.max(root.clientWidth * 0.7, 160),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, []);

  return { scroller, overflow, page };
}

/**
 * One of the two arrows, floated over the rail's edge inside a
 * `position: relative` wrapper. Faded rather than unmounted when its side has
 * nothing more, so reaching an end does not pop layout under the pointer.
 */
export function RailArrow({
  side,
  label,
  visible,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  visible: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeftRoundedIcon : ChevronRightRoundedIcon;
  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
      sx={{
        position: 'absolute',
        top: '50%',
        [side]: 6,
        transform: 'translateY(-50%)',
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        p: 0,
        border: `1px solid ${brand.ink12}`,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.92)',
        color: brand.ink70,
        boxShadow: shadow.soft,
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: `opacity ${motion.base} ${motion.easeOutSoft}`,
        '@media (hover: hover)': {
          '&:hover': { color: brand.ink, boxShadow: shadow.lift },
        },
        '&:active': { transform: 'translateY(-50%) scale(0.94)' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Icon sx={{ fontSize: '1.25rem' }} aria-hidden />
    </Box>
  );
}
