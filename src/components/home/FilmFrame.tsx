'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import { brand } from '@/theme/brand';

interface Props {
  src: string;
  poster: string;
  label: string;
}

/**
 * The hero film in a portrait frame — the shape it was shot in — so it is never
 * cropped to a letterbox. Muted, inline, looping; starts paused for anyone who
 * asked their OS for reduced motion. No on-screen control: the film is part of
 * the picture, not a player.
 */
export function FilmFrame({ src, poster, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) videoRef.current?.pause();
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
    </Box>
  );
}
