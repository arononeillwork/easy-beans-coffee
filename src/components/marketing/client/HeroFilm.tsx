'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import { brand, radius } from '@/theme/brand';

interface Props {
  src: string;
  /** Still of the pour, shown until the film takes over — and instead of it
   *  for anyone who asked the OS for reduced motion. */
  poster: string;
  /** Pre-blurred, pre-darkened colour field for the widescreen margins. */
  backdrop: string;
  label: string;
  playLabel: string;
  pauseLabel: string;
}

/**
 * The home hero's film: the drink being made, start to finish.
 *
 * The footage is shot the way the café posts — portrait, 720×1280 — and a
 * phone is exactly that shape, so there it simply fills the screen. A laptop
 * is the opposite shape, and stretching a portrait frame across it would keep
 * about a quarter of the picture at double the zoom. So on wide screens the
 * film stands at its own aspect, placed right of centre where the drink sits
 * opposite the copy, over a backdrop made from its own pour frame blurred
 * down to pure colour — baked into the file, so the page pays for no filters.
 *
 * House rules from LazyVideo apply: the loop is muted and inline, it starts
 * paused for anyone who asked for reduced motion, and there is always a
 * visible way to stop it. The one difference is urgency — this is the first
 * thing on the site, so there is no lazy-attach; the film IS the hero.
 */
export function HeroFilm({ src, poster, backdrop, label, playLabel, pauseLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  // Honour the OS-level motion preference for the initial state only; the
  // button still lets anyone start it deliberately.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      videoRef.current?.pause();
      setPlaying(false);
    }
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
    <Box sx={{ position: 'absolute', inset: 0, backgroundColor: brand.ink, overflow: 'hidden' }}>
      {/* Phones: the poster fills the slot until the film's first frame. */}
      <Image
        src={poster}
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: 'cover' }}
      />
      {/* Wide screens: the blurred colour field takes over the margins. */}
      <Box
        component="img"
        src={backdrop}
        alt=""
        aria-hidden
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      <Box
        component="video"
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        aria-label={label}
        sx={{
          position: 'absolute',
          // Portrait screens: cover, edge to edge.
          inset: { xs: 0, md: 'auto' },
          width: { xs: '100%', md: 'auto' },
          height: '100%',
          objectFit: { xs: 'cover', md: 'contain' },
          // Wide screens: the film stands at its own aspect, right of centre,
          // opposite the copy — the drink where the reader's eye lands.
          top: { md: 0 },
          left: { md: '62%' },
          transform: { md: 'translateX(-50%)' },
          boxShadow: { md: '0 0 80px rgba(0,0,0,0.45)' },
          display: 'block',
        }}
      />

      {/* The stop control. An autoplaying loop must be stoppable, and the
          bottom-left corner already belongs to the headline. */}
      <Box
        component="button"
        type="button"
        onClick={toggle}
        aria-label={playing ? pauseLabel : playLabel}
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          border: '1px solid rgba(247,236,228,0.35)',
          cursor: 'pointer',
          borderRadius: `${radius.pill}px`,
          backgroundColor: 'rgba(26,26,26,0.45)',
          color: brand.cream,
          backdropFilter: 'blur(8px)',
          transition: 'background-color 200ms',
          '&:hover': { backgroundColor: 'rgba(26,26,26,0.65)' },
          '&:focus-visible': { outline: `2px solid ${brand.cream}`, outlineOffset: 2 },
        }}
      >
        {playing ? (
          <PauseRoundedIcon sx={{ fontSize: 20 }} />
        ) : (
          <PlayArrowRoundedIcon sx={{ fontSize: 20 }} />
        )}
      </Box>
    </Box>
  );
}
