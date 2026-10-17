import { useId } from 'react';
import Box from '@mui/material/Box';
import type { Lang } from '@/i18n/config';

/**
 * Round flags for the language switch: Spain for Spanish, the Union Jack for
 * English. Inline SVG rather than emoji, because Windows draws flag emoji as
 * two letters ("ES", "GB") — the very thing these replace.
 */
export function Flag({ lang, size = 22 }: { lang: Lang; size?: number }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: 'inline-flex',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(26,26,26,0.12)',
        '& svg': { width: '100%', height: '100%', display: 'block' },
      }}
    >
      {lang === 'es' ? <SpainFlag /> : <UnionFlag />}
    </Box>
  );
}

function SpainFlag() {
  return (
    <svg viewBox="0 0 30 30" preserveAspectRatio="xMidYMid slice">
      <rect width="30" height="30" fill="#AA151B" />
      <rect y="7.5" width="30" height="15" fill="#F1BF00" />
    </svg>
  );
}

function UnionFlag() {
  // Clip-path ids must be unique per instance: the flag is drawn in the
  // header and again in the phone menu.
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="15 0 30 30" preserveAspectRatio="xMidYMid slice">
      <clipPath id={`${id}s`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
