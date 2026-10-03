'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { brand, motion, radius, shadow } from '@/theme/brand';

/**
 * The studio's primary switch: hot or iced, sit in or takeaway, still or
 * sparkling. A track in limewash with a white thumb that slides under the
 * chosen half.
 *
 * Built as a real radiogroup rather than a row of buttons so arrow keys move
 * between the options and a screen reader announces "2 of 3" — this is the
 * control the whole screen turns on, and it has to work without a pointer. The
 * thumb is a single absolutely-positioned element that transforms between
 * slots, so the movement is one GPU transition rather than N cross-fades.
 */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Optional glyph, drawn before the label. */
  icon?: React.ReactNode;
}

export function SegmentedChoice<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (next: T) => void;
  size?: 'sm' | 'md';
}) {
  if (options.length < 2) return null;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const move = (delta: number) => {
    const next = options[(index + delta + options.length) % options.length];
    onChange(next.value);
  };

  return (
    <Box
      role="radiogroup"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          move(-1);
        }
      }}
      sx={{
        position: 'relative',
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: '1fr',
        p: 0.5,
        borderRadius: radius.pill,
        backgroundColor: brand.limewashTint,
        boxShadow: shadow.insetHairline,
      }}
    >
      {/* The thumb. One element, moved by transform — see the note above. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 4,
          width: `calc((100% - 8px) / ${options.length})`,
          borderRadius: radius.pill,
          backgroundColor: brand.white,
          boxShadow: shadow.soft,
          transform: `translateX(${index * 100}%)`,
          transition: `transform ${motion.base} ${motion.easeOutSoft}`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      />

      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              minWidth: 0,
              px: size === 'sm' ? 1.5 : 2,
              py: size === 'sm' ? 0.85 : 1.15,
              border: 0,
              borderRadius: radius.pill,
              background: 'none',
              cursor: 'pointer',
              color: selected ? brand.ink : brand.ink70,
              transition: `color ${motion.fast} ${motion.easeStandard}`,
              '& svg': { fontSize: size === 'sm' ? '1rem' : '1.125rem' },
            }}
          >
            {option.icon}
            <Typography
              component="span"
              sx={{
                fontSize: size === 'sm' ? '0.8125rem' : '0.9375rem',
                fontWeight: selected ? 500 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {option.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
