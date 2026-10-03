'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import { brand, radius, shadow } from '@/theme/brand';

interface Props {
  src: string;
  /** Still frame, served through the image optimizer and shown until the video takes over. */
  poster: string;
  label: string;
  /** Copy for the overlay control, so the button stays translated. */
  playLabel: string;
  pauseLabel: string;
  /** Cap on the rendered width. The films are all 720×1280. */
  maxWidth?: number;
}

/**
 * Autoplaying café film, held back until it is nearly on screen.
 *
 * The file is close to a megabyte and sits well below the fold, but a plain
 * `<video autoPlay>` starts downloading the moment the page loads — competing
 * with the hero image for bandwidth on exactly the request that decides how
 * fast the page feels. So the poster (optimized, and a fraction of the size)
 * carries the slot, and the video is attached only once the visitor has
 * scrolled within a screen of it.
 *
 * The overlay control is not decoration: an autoplaying loop needs a visible
 * way to stop it, and visitors who asked for reduced motion get it paused from
 * the start rather than autoplaying behind their preference.
 */
export function LazyVideo({
  src,
  poster,
  label,
  playLabel,
  pauseLabel,
  maxWidth = 360,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // No observer (old browser): just load it — a missing film is worse than
    // an eager one.
    if (typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Honour the OS-level motion preference for the initial state only; the
  // button still lets anyone start it deliberately.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  return (
    <Box
      ref={wrapperRef}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth,
        aspectRatio: '9 / 16',
        overflow: 'hidden',
        borderRadius: `${radius.lg}px`,
        boxShadow: shadow.lift,
        backgroundColor: brand.ink,
      }}
    >
      <Image src={poster} alt="" fill sizes={`${maxWidth}px`} style={{ objectFit: 'cover' }} />
      {active && (
        <Box
          component="video"
          ref={videoRef}
          src={src}
          autoPlay={playing}
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          aria-label={label}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}

      {/* Bottom scrim so the control keeps its contrast over any frame. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          insetInline: 0,
          bottom: 0,
          height: '34%',
          pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(26,26,26,0.6), rgba(26,26,26,0))',
        }}
      />

      {active && (
        <Box
          component="button"
          type="button"
          onClick={toggle}
          aria-label={playing ? pauseLabel : playLabel}
          sx={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.75,
            py: 1,
            border: 0,
            cursor: 'pointer',
            borderRadius: `${radius.pill}px`,
            backgroundColor: 'rgba(247,236,228,0.92)',
            color: brand.ink,
            fontFamily: 'var(--font-figtree)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            lineHeight: 1,
            transition: 'background-color 200ms',
            '&:hover': { backgroundColor: brand.white },
            '&:focus-visible': { outline: `2px solid ${brand.rosePinkDeep}`, outlineOffset: 2 },
          }}
        >
          {playing ? (
            <PauseRoundedIcon sx={{ fontSize: 18 }} />
          ) : (
            <PlayArrowRoundedIcon sx={{ fontSize: 18 }} />
          )}
          {playing ? pauseLabel : playLabel}
        </Box>
      )}
    </Box>
  );
}
