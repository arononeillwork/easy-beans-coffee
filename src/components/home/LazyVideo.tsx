'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import { brand, radius, shadow } from '@/theme/brand';

interface Props {
  src: string;
  /** Still frame, served through the image optimizer and shown until the video takes over. */
  poster: string;
  label: string;
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
 * Visitors who asked for reduced motion get it paused from the start rather
 * than autoplaying behind their preference.
 */
export function LazyVideo({ src, poster, label, maxWidth = 360 }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  // Honour the OS-level motion preference.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
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
    </Box>
  );
}
