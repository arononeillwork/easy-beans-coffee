'use client';

import { useEffect, useRef, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatMenuPrice } from '@/features/order/lib/price';
import { brand, motion, radius, shadow } from '@/theme/brand';
import { isSceneFrame } from '../drinkArt';
import type { Lang } from '../types';
import { RailArrow, useRailOverflow } from './ScrollArrows';

/**
 * The two horizontal rails that navigate the board: which part of the menu, and
 * which drink within it.
 *
 * Both keep the chosen entry scrolled into view whenever it changes from
 * elsewhere — swiping the stage moves the drink rail, and switching section
 * resets it — because a selected thing off-screen reads as no selection at all.
 */

function useKeepInView(activeIndex: number, scroller: RefObject<HTMLDivElement | null>) {
  const items = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const target = items.current[activeIndex];
    const root = scroller.current;
    if (!target || !root) return;

    const left = target.offsetLeft - root.clientWidth / 2 + target.clientWidth / 2;
    root.scrollTo({
      left: Math.max(0, left),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [activeIndex, scroller]);

  return items;
}

const RAIL_SX = {
  display: 'flex',
  gap: 1,
  overflowX: 'auto',
  scrollSnapType: 'x proximity',
  scrollbarWidth: 'none' as const,
  '&::-webkit-scrollbar': { display: 'none' },
};

/**
 * The parts of the chosen half of the menu — Coffee · Speciality · Smoothies ·
 * Cold Drinks, or Bakery · Food. Few enough per group to show whole, so the
 * row centres and wraps instead of scrolling.
 */
export function SectionRail<T extends string>({
  label,
  sections,
  value,
  onChange,
}: {
  label: string;
  sections: Array<{ id: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <Box
      role="tablist"
      aria-label={label}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 1,
        px: { xs: 2.5, sm: 3 },
        py: 1.5,
      }}
    >
      {sections.map((section) => {
        const selected = section.id === value;
        return (
          <Box
            key={section.id}
            component="button"
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(section.id)}
            sx={{
              flex: '0 0 auto',
              px: 2.25,
              py: 1,
              border: '1px solid',
              borderColor: selected ? 'transparent' : brand.ink12,
              borderRadius: radius.pill,
              backgroundColor: selected ? brand.ink : brand.white,
              color: selected ? brand.cream : brand.ink70,
              boxShadow: selected ? shadow.soft : 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.8125rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: `background-color ${motion.fast} ${motion.easeStandard}, color ${motion.fast} ${motion.easeStandard}`,
            }}
          >
            {section.label}
          </Box>
        );
      })}
    </Box>
  );
}

export interface RailDrink {
  id: string;
  name: string;
  thumb: string | null;
  fromCents: number | undefined;
  soldOut: boolean;
}

/**
 * The drinks in the current section, as thumbnails.
 *
 * This is the same selection the stage swipe makes, offered as a list — a
 * customer who knows they want the cortado should not have to swipe past eight
 * drinks to reach it.
 */
export function DrinkRail({
  label,
  drinks,
  activeIndex,
  onSelect,
  lang,
  soldOutLabel,
  scrollBackLabel,
  scrollAheadLabel,
}: {
  label: string;
  drinks: RailDrink[];
  activeIndex: number;
  onSelect: (index: number) => void;
  lang: Lang;
  soldOutLabel: string;
  scrollBackLabel: string;
  scrollAheadLabel: string;
}) {
  const { scroller, overflow, page } = useRailOverflow(drinks);
  const items = useKeepInView(activeIndex, scroller);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={scroller}
        role="listbox"
        aria-label={label}
        sx={{ ...RAIL_SX, px: { xs: 2.5, sm: 3 }, pb: 0.5, pt: 1.5, justifyContent: { md: 'safe center' } }}
      >
        {drinks.map((drink, index) => {
          const selected = index === activeIndex;
          return (
            <Box
              key={drink.id}
              ref={(node: HTMLElement | null) => {
                items.current[index] = node;
              }}
              component="button"
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(index)}
              sx={{
                scrollSnapAlign: 'center',
                flex: '0 0 auto',
                width: 76,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                p: 0.75,
                border: '1px solid',
                // The rail rides on the drink's wash, so the chips are frosted
                // glass and the chosen one lifts off it as a solid card.
                borderColor: selected ? 'transparent' : 'rgba(255,255,255,0.55)',
                borderRadius: `${radius.lg}px`,
                // No backdrop-filter: it would isolate the multiply-blended
                // thumbnail from the wash and leave a white box in the chip.
                backgroundColor: selected ? brand.white : 'rgba(255,255,255,0.38)',
                boxShadow: selected ? shadow.lift : 'none',
                transform: selected ? 'translateY(-3px)' : 'none',
                opacity: drink.soldOut ? 0.45 : 1,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: `background-color ${motion.fast} ${motion.easeStandard}, box-shadow ${motion.base} ${motion.easeOutSoft}, transform ${motion.base} ${motion.easeOutSoft}`,
                '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 42,
                  height: 46,
                  backgroundImage: drink.thumb ? `url(${drink.thumb})` : 'none',
                  backgroundColor: drink.thumb ? 'transparent' : brand.limewashTint,
                  borderRadius: isSceneFrame(drink.thumb) || !drink.thumb ? `${radius.sm}px` : 0,
                  backgroundSize: isSceneFrame(drink.thumb) ? 'cover' : 'contain',
                  backgroundPosition: 'center bottom',
                  backgroundRepeat: 'no-repeat',
                  mixBlendMode: drink.thumb && !isSceneFrame(drink.thumb) ? 'multiply' : 'normal',
                }}
              />
              <Typography
                component="span"
                sx={{
                  // Fixed two-line box: a "Cortado Doble" must not stand taller
                  // than a "Latte" and push its own price out of the rail.
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '2.4em',
                  fontSize: '0.6875rem',
                  lineHeight: 1.2,
                  fontWeight: selected ? 500 : 400,
                  color: brand.ink,
                  textAlign: 'center',
                }}
              >
                {drink.name}
              </Typography>
              <Typography
                component="span"
                sx={{ fontSize: '0.625rem', color: brand.ink45, whiteSpace: 'nowrap' }}
              >
                {drink.soldOut
                  ? soldOutLabel
                  : drink.fromCents !== undefined
                    ? formatMenuPrice(drink.fromCents, lang)
                    : '·'}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* The scroll affordance: a rail longer than the screen says so. */}
      <RailArrow side="left" label={scrollBackLabel} visible={overflow.back} onClick={() => page(-1)} />
      <RailArrow side="right" label={scrollAheadLabel} visible={overflow.ahead} onClick={() => page(1)} />
    </Box>
  );
}
