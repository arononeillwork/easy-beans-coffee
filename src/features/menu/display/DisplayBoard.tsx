'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import logo from '@/assets/logo.png';
import { cafeDay, type PriceBook } from '@/features/menu/priceBook';
import type { DayHours } from '@/shared/lib/openingHours';
import { clockLabel } from '@/shared/lib/openNow';
import { brand } from '@/theme/brand';
import { buildDisplayBoard, type DisplayRow, type DisplaySection, type RowPrice } from './boardData';
import { priceReadDueMs } from './refreshSchedule';
import type { Section } from '@/features/menu/types';

/**
 * The menu as the café's own wall: one portrait screen in the language of the
 * printed menus — rounded outlined cards on cream, caliente/frío price
 * columns, the Especiales card filled matcha green and Comida filled rose.
 * Spanish-first, like the print.
 *
 * It is left running for weeks, so it looks after itself:
 * - items and prices re-read from Square once per day, an hour after the café
 *   opens (via /api/display-menu) — when the morning's price edits in Square
 *   have actually been made. A day the café does not open reads nothing;
 * - opening hours re-read once per café day (via /api/ordering-hours) to run
 *   that cadence; the schedule itself is never shown on the wall;
 * - every fetch failure keeps the last good data on screen. The board never
 *   blanks.
 */

/** How often the board checks the clock for the hourly/daily work above. */
const TICK_MS = 30_000;

const POPPINS = 'var(--font-poppins), sans-serif';

const INSTAGRAM_HANDLE = '@easy.beans.coffee';

/** The printed menus' dark roast brown — names and prices. */
const ESPRESSO = '#3B2A20';
/** Card outline: the same brown, light enough to frame without shouting. */
const CARD_BORDER = 'rgba(59, 42, 32, 0.30)';
const ESPRESSO_SOFT = 'rgba(59, 42, 32, 0.62)';

/**
 * How each section dresses, copied from the printed menus: its card title,
 * the title's colour, whether the card carries the caliente/frío columns,
 * and the two filled highlight cards (Especiales green, Comida rose).
 */
const CARD_STYLE: Record<Section, {
  title: string;
  color: string;
  tempCols?: boolean;
  fill?: string;
  outline?: string;
  desc?: 'tagline' | 'options' | 'both';
}> = {
  coffee: { title: 'Clásicos', color: ESPRESSO, tempCols: true },
  speciality: { title: 'Especiales', color: brand.matchaGreenDeep, tempCols: true, fill: brand.matchaTint },
  smoothies: { title: 'Smoothies', color: brand.rosePinkDeep, desc: 'tagline' },
  cold: { title: 'Bebidas Frías', color: ESPRESSO, desc: 'options' },
  bakery: { title: 'Bollería', color: ESPRESSO },
  food: { title: 'Comida', color: brand.rosePinkDeep, fill: brand.rosePinkTint, outline: 'rgba(247, 155, 164, 0.75)', desc: 'both' },
};

/** The hand-tuned column split that keeps the whole list above the fold. */
const COLUMNS: Section[][] = [
  ['coffee', 'speciality', 'food'],
  ['smoothies', 'cold', 'bakery'],
];

/**
 * The sticker strip along the bottom, exactly as the printed menus sign off:
 * die-cut illustrations with the white border and pink shadow. The croissant,
 * açaí bowl and chia jar are cut from the café's own artwork; the iced can
 * was drawn to match it. Aspect ratios are the files' real ones, so the row
 * lays out before the images arrive.
 */
const STICKERS: Array<{ src: string; alt: string; ratio: string; height: string; tilt: number }> = [
  { src: '/media/display/croissant.webp', alt: 'Croissant', ratio: '266 / 230', height: 'clamp(30px, 5.4vh, 96px)', tilt: -4 },
  { src: '/media/display/acai-bowl.webp', alt: 'Açaí bowl', ratio: '269 / 291', height: 'clamp(36px, 6.6vh, 116px)', tilt: 3 },
  { src: '/media/display/coffee-can.webp', alt: 'Iced latte in a can glass', ratio: '262 / 560', height: 'clamp(46px, 8.6vh, 150px)', tilt: -3 },
  { src: '/media/display/chia-jar.webp', alt: 'Chia pudding jar', ratio: '204 / 282', height: 'clamp(36px, 6.6vh, 116px)', tilt: 4 },
];

export function DisplayBoard({
  initialBook,
  initialHours,
  timezone,
}: {
  initialBook: PriceBook;
  initialHours: DayHours[];
  timezone: string;
}) {
  const [book, setBook] = useState(initialBook);
  // Clock state is mount-only so the server and first client render agree.
  const [nowMs, setNowMs] = useState<number | null>(null);

  const board = useMemo(() => buildDisplayBoard(book), [book]);

  // Refresh bookkeeping lives in refs: ticks read and write it without
  // re-arming the interval.
  const hoursRef = useRef(initialHours);
  const hoursDayRef = useRef<string | null>(null);
  /** Café day whose Square read is done (or not owed). */
  const priceDayRef = useRef<string | null>(null);

  useEffect(() => {
    const mountedAt = Date.now();
    setNowMs(mountedAt);
    hoursDayRef.current = cafeDay(mountedAt, timezone);

    // Is today's read already done? Only when the snapshot the server handed
    // us was itself taken after today's due moment — a cached page from
    // before it still owes the read, or the morning's price edits would be
    // missed. A day the café does not open owes nothing.
    const dueAtMount = priceReadDueMs(hoursRef.current, mountedAt, timezone);
    const snapshotMs = Date.parse(initialBook.fetchedAt) || 0;
    priceDayRef.current =
      dueAtMount === null || (mountedAt >= dueAtMount && snapshotMs >= dueAtMount)
        ? cafeDay(mountedAt, timezone)
        : null;

    const tick = () => {
      const ms = Date.now();
      setNowMs(ms);

      // Opening hours: once per café day. The day marker moves first so a
      // failed read waits for tomorrow instead of hammering every tick —
      // yesterday's hours are the known-good fallback in the meantime.
      const day = cafeDay(ms, timezone);
      if (day !== hoursDayRef.current) {
        hoursDayRef.current = day;
        fetch('/api/ordering-hours')
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { hours?: DayHours[] } | null) => {
            if (Array.isArray(data?.hours) && data.hours.length > 0) hoursRef.current = data.hours;
          })
          .catch(() => {});
      }

      // Items and prices: once per café day, an hour after opening. A closed
      // day owes nothing and is marked done without a fetch.
      if (day !== priceDayRef.current) {
        const due = priceReadDueMs(hoursRef.current, ms, timezone);
        if (due === null) {
          priceDayRef.current = day;
        } else if (ms >= due) {
          priceDayRef.current = day;
          fetch('/api/display-menu')
            .then((res) => (res.ok ? res.json() : null))
            .then((fresh: PriceBook | null) => {
              if (fresh && Array.isArray(fresh.items)) setBook(fresh);
            })
            .catch(() => {});
        }
      }
    };

    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [timezone, initialBook]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto auto',
        backgroundColor: brand.cream,
        color: ESPRESSO,
        overflow: 'hidden',
        '@keyframes board-in': {
          from: { opacity: 0, transform: 'translateY(2vh)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes sticker-bob': {
          from: { transform: 'translateY(-2.5%) rotate(var(--tilt))' },
          to: { transform: 'translateY(2.5%) rotate(var(--tilt))' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& *': { animation: 'none !important', transition: 'none !important' },
        },
      }}
    >
      <Header nowMs={nowMs} timezone={timezone} />

      {/* Two hand-balanced columns of cards: the split is chosen so the whole
          list fits one screen with nothing under the fold. */}
      <Box
        sx={{
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          columnGap: 'clamp(14px, 2.6vw, 40px)',
          alignItems: 'start',
          px: 'clamp(16px, 3.5vw, 56px)',
          animation: 'board-in 700ms cubic-bezier(.16,1,.3,1) both',
        }}
      >
        {splitColumns(board).map((column, index) => (
          <Box key={index} sx={{ minWidth: 0 }}>
            {column.map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
          </Box>
        ))}
      </Box>

      <StickerStrip />
      <Footer />
    </Box>
  );
}

/** The illustrations row above the footer — the menu's one playful moment. */
function StickerStrip() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-evenly',
        px: 'clamp(16px, 6vw, 90px)',
        pt: 'clamp(2px, 0.4vh, 8px)',
      }}
    >
      {STICKERS.map((sticker, index) => (
        <Box
          key={sticker.src}
          sx={{
            position: 'relative',
            height: sticker.height,
            aspectRatio: sticker.ratio,
            '--tilt': `${sticker.tilt}deg`,
            transform: `rotate(${sticker.tilt}deg)`,
            animation: 'sticker-bob 5.5s ease-in-out infinite alternate',
            animationDelay: `${index * 800}ms`,
          }}
        >
          <Image src={sticker.src} alt={sticker.alt} fill sizes="12vh" style={{ objectFit: 'contain' }} />
        </Box>
      ))}
    </Box>
  );
}

function splitColumns(sections: DisplaySection[]): DisplaySection[][] {
  const columns = COLUMNS.map((ids) =>
    ids.flatMap((id) => sections.filter((section) => section.id === id)),
  );
  // A section the split does not know lands in the second column rather than
  // vanishing — visible and fixable, like the rest of the board's failures.
  const known = new Set<string>(COLUMNS.flat());
  columns[columns.length - 1].push(...sections.filter((section) => !known.has(section.id)));
  return columns;
}

/** The round badge big on the left, the café-time clock on the right. */
function Header({ nowMs, timezone }: { nowMs: number | null; timezone: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 'clamp(16px, 3.5vw, 56px)',
        pt: 'clamp(6px, 1vh, 16px)',
        pb: 'clamp(5px, 0.8vh, 12px)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.2vw, 20px)' }}>
        <Image src={logo} alt="Easy Beans Coffee" style={{ width: 'clamp(44px, 6.2vh, 88px)', height: 'auto' }} priority />
        <Box
          sx={{
            fontFamily: POPPINS,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            fontSize: 'clamp(1.2rem, 3vh, 2.3rem)',
            lineHeight: 1,
          }}
        >
          Easy Beans
        </Box>
      </Box>
      {nowMs !== null && (
        <Box sx={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 'clamp(1.2rem, 3.2vh, 2.5rem)', fontVariantNumeric: 'tabular-nums' }}>
          {clockLabel(new Date(nowMs).toISOString(), timezone)}
        </Box>
      )}
    </Box>
  );
}

/**
 * One section as the print draws it: a bold coloured title sitting above a
 * rounded, outlined card. Prices right-aligned; the coffee cards carry the
 * caliente/frío column pair.
 */
function SectionCard({ section }: { section: DisplaySection }) {
  const style = CARD_STYLE[section.id] ?? { title: section.label.es, color: ESPRESSO };
  const tempCols = style.tempCols === true && section.rows.some((row) => row.tempAxis);

  return (
    <Box sx={{ mb: 'clamp(5px, 0.85vh, 14px)', minWidth: 0 }}>
      <Box
        sx={{
          color: style.color,
          fontFamily: POPPINS,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontSize: 'clamp(0.74rem, 1.7vh, 1.2rem)',
          mb: 'clamp(2px, 0.4vh, 7px)',
          pl: 'clamp(2px, 0.3vw, 6px)',
        }}
      >
        {style.title}
      </Box>

      <Box
        sx={{
          border: `1px solid ${style.outline ?? CARD_BORDER}`,
          borderRadius: 'clamp(12px, 1.8vh, 22px)',
          backgroundColor: style.fill ?? 'transparent',
          px: 'clamp(10px, 1.6vw, 26px)',
          py: 'clamp(4px, 0.7vh, 12px)',
        }}
      >
        {tempCols && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: PRICE_COL_GAP, mb: 'clamp(1px, 0.2vh, 4px)' }}>
            <ColLabel>caliente</ColLabel>
            <ColLabel>frío</ColLabel>
          </Box>
        )}
        {section.rows.map((row) => (
          <Row key={row.id} row={row} tempCols={tempCols} desc={style.desc} />
        ))}
      </Box>
    </Box>
  );
}

/** Both price columns share this width so the numbers rule up vertically. */
const PRICE_COL_WIDTH = 'clamp(32px, 3.5vw, 60px)';

/** Daylight between caliente and frío, so €3,80 €4,80 never reads as one number. */
const PRICE_COL_GAP = 'clamp(5px, 0.7vw, 12px)';


/**
 * Menu-wall numbers, as the eye wants them: whole euros bare ("4"), the rest
 * with both cents ("4.50"). The sign would repeat forty times on one screen,
 * so it is left to the board's context — exactly like a chalkboard.
 */
function displayPrice(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

function ColLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ width: PRICE_COL_WIDTH, textAlign: 'right', color: ESPRESSO_SOFT, fontSize: 'clamp(0.52rem, 1.2vh, 0.82rem)', fontWeight: 500 }}>
      {children}
    </Box>
  );
}

function Row({ row, tempCols, desc }: { row: DisplayRow; tempCols: boolean; desc?: 'tagline' | 'options' | 'both' }) {
  const description =
    desc === 'options'
      ? row.options?.es ?? null
      : desc === 'tagline'
        ? row.tagline?.es ?? null
        : desc === 'both'
          ? [row.tagline?.es, row.options?.es].filter(Boolean).join(' — ') || null
          : null;

  return (
    <Box
      sx={{
        py: 'clamp(1px, 0.2vh, 4px)',
        borderBottom: `1px solid ${brand.ink06}`,
        '&:last-of-type': { borderBottom: 'none' },
        opacity: row.soldOut ? 0.45 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(6px, 0.8vw, 14px)' }}>
        {/* Long names wrap, exactly as the printed card does — "Tostada,
            mantequilla y mermelada" takes two lines there too. */}
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: 'clamp(0.64rem, 1.5vh, 1.05rem)',
            lineHeight: 1.2,
          }}
        >
          {row.name.es}
        </Box>
        <RowPriceCells price={row.price} soldOut={row.soldOut} tempCols={tempCols} />
      </Box>
      {description && (
        <Box sx={{ color: ESPRESSO_SOFT, fontSize: 'clamp(0.55rem, 1.2vh, 0.85rem)', lineHeight: 1.28, pr: 'clamp(6px, 0.8vw, 14px)' }}>
          {description}
        </Box>
      )}
    </Box>
  );
}

function RowPriceCells({ price, soldOut, tempCols }: { price: RowPrice; soldOut: boolean; tempCols: boolean }) {
  const size = 'clamp(0.64rem, 1.5vh, 1.05rem)';
  if (soldOut) {
    return (
      <Box sx={{ color: brand.rosePinkDeep, fontWeight: 600, fontSize: `calc(${size} * 0.78)`, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
        Agotado
      </Box>
    );
  }

  const cell = (cents: number | undefined) => (cents === undefined ? '—' : displayPrice(cents));

  if (tempCols) {
    // A single-priced drink in a column card (espresso, tea) sits under
    // caliente, exactly as the printed menu sets it.
    const hot = price.hot ?? price.one;
    return (
      <Box sx={{ display: 'flex', gap: PRICE_COL_GAP }}>
        {[hot, price.iced].map((cents, index) => (
          <Box
            key={index}
            sx={{
              width: PRICE_COL_WIDTH,
              textAlign: 'right',
              fontWeight: 600,
              fontSize: size,
              fontVariantNumeric: 'tabular-nums',
              color: cents === undefined ? ESPRESSO_SOFT : ESPRESSO,
            }}
          >
            {cell(cents)}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ fontWeight: 600, fontSize: size, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {cell(price.one ?? price.hot ?? price.iced)}
    </Box>
  );
}

/** Instagram handle left, the site right — the print's sign-off. */
function Footer() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 'clamp(16px, 3.5vw, 56px)',
        py: 'clamp(5px, 0.8vh, 13px)',
      }}
    >
      <Box sx={{ color: brand.rosePinkDeep, fontWeight: 600, fontSize: 'clamp(0.75rem, 1.8vh, 1.2rem)' }}>
        {INSTAGRAM_HANDLE}
      </Box>
      <Box sx={{ color: ESPRESSO_SOFT, fontWeight: 500, fontSize: 'clamp(0.7rem, 1.6vh, 1.05rem)' }}>
        easybeanscoffee.com
      </Box>
    </Box>
  );
}
