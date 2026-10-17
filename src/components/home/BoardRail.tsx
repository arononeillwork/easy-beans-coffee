'use client';

import Box from '@mui/material/Box';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useRailOverflow } from '@/features/menu/client/ScrollArrows';
import { brand, motion, shadow } from '@/theme/brand';

/** Where the rail's first tile starts, matching the page container on desktop. */
const GUTTER = { xs: '16px', md: 'max(24px, calc((100vw - 1200px) / 2 + 24px))' };

/**
 * The home page's sideways run of drinks, with a quiet arrow on each side that
 * has more to show. Swiping still works; the arrows are for everyone who does
 * not think to swipe a web page, and they fade out at either end.
 */
export function BoardRail({
  children,
  prevLabel,
  nextLabel,
}: {
  children: React.ReactNode;
  prevLabel: string;
  nextLabel: string;
}) {
  const { scroller, overflow, page } = useRailOverflow<HTMLUListElement>('board');

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component="ul"
        ref={scroller}
        sx={{
          listStyle: 'none',
          m: 0,
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: { xs: '64%', sm: '38%', md: 'calc((min(100vw, 1200px) - 48px - 3 * 20px) / 4)' },
          gap: { xs: 1.5, md: 2.5 },
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: GUTTER,
          px: GUTTER,
          pb: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {children}
      </Box>
      <BoardArrow side="left" label={prevLabel} visible={overflow.back} onClick={() => page(-1)} />
      <BoardArrow side="right" label={nextLabel} visible={overflow.ahead} onClick={() => page(1)} />
    </Box>
  );
}

function BoardArrow({
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
      data-testid={`board-arrow-${side}`}
      sx={{
        position: 'absolute',
        // Centred on the photographs, not on photo + caption.
        top: 'calc(50% - 22px)',
        [side]: { xs: 8, md: 'max(10px, calc((100vw - 1200px) / 2 + 4px))' },
        transform: 'translateY(-50%)',
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        p: 0,
        border: `1px solid ${brand.ink06}`,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(6px)',
        color: brand.ink70,
        boxShadow: shadow.soft,
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: `opacity ${motion.base} ${motion.easeOutSoft}`,
        '@media (hover: hover)': {
          '&:hover': { color: brand.ink, backgroundColor: brand.white },
        },
        '&:active': { transform: 'translateY(-50%) scale(0.94)' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Icon sx={{ fontSize: '1.4rem' }} aria-hidden />
    </Box>
  );
}
