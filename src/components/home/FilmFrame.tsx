'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import { brand } from '@/theme/brand';

interface Props {
  src: string;
  poster: string;
  label: string;
  playLabel: string;
  pauseLabel: string;
}

/**
 * The hero film in a portrait frame — the shape it was shot in — so it is never
 * cropped to a letterbox. Muted, inline, looping; starts paused for anyone who
 * asked their OS for reduced motion; always has a visible stop control.
 */
export function FilmFrame({ src, poster, label, playLabel, pauseLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

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
    <Box sx={{ position: 'absolute', inset: 0, backgroundColor: brand.roseWash }}>
      <Image src={poster} alt="" fill priority sizes="(max-width: 900px) 100vw, 42vw" style={{ objectFit: 'cover' }} />
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
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <Box
        component="button"
        type="button"
        onClick={toggle}
        aria-label={playing ? pauseLabel : playLabel}
        sx={{
          position: 'absolute',
          right: 14,
          bottom: 14,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          border: 0,
          cursor: 'pointer',
          borderRadius: '50%',
          backgroundColor: 'rgba(247,236,228,0.9)',
          color: brand.ink,
          '&:hover': { backgroundColor: brand.cream },
          '&:focus-visible': { outline: `2px solid ${brand.rosePinkDeep}`, outlineOffset: 2 },
        }}
      >
        {playing ? <PauseRoundedIcon sx={{ fontSize: 20 }} /> : <PlayArrowRoundedIcon sx={{ fontSize: 20 }} />}
      </Box>
    </Box>
  );
}
