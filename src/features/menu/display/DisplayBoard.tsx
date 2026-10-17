'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import logo from '@/assets/logo.png';
import { cafeDay, type PriceBook } from '@/features/menu/priceBook';
import { resolveArt } from '@/features/menu/drinkArt';
import { formatMenuPrice } from '@/features/order/lib/price';
import type { DayHours } from '@/shared/lib/openingHours';
import { clockLabel, openState } from '@/shared/lib/openNow';
import { brand, radius } from '@/theme/brand';
import { buildDisplayBoard, type DisplaySection, type RowPrice } from './boardData';

/**
 * The menu as the café's own wall: one portrait screen carrying the whole
 * board. The speciality drinks lead in a washed panel with their photography;
 * everything else runs underneath as a two-column list in the brand's cream.
 *
 * It is left running for weeks, so it looks after itself:
 * - prices re-read from Square once an hour (via /api/display-menu), and only
 *   while the café is open — a closed café costs Square nothing overnight;
 * - opening hours re-read once per café day (via /api/ordering-hours) to run
 *   that cadence; the schedule itself is never shown on the wall;
 * - every fetch failure keeps the last good data on screen. The board never
 *   blanks.
 */

/** How often the board checks the clock for the hourly/daily work above. */
const TICK_MS = 30_000;

const POPPINS = 'var(--font-poppins), sans-serif';

const INSTAGRAM_HANDLE = '@easy.beans.coffee';

/** The one photograph on the board: the ube latte can beside the specials. */
const PANEL_ART = resolveArt('ube-latte', 'iced', 'can');

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
  const speciality = board.find((section) => section.id === 'speciality');
  const rest = board.filter((section) => section.id !== 'speciality');
  const hasTempPair = board.some((section) => section.hasTempPair);

  // Refresh bookkeeping lives in refs: ticks read and write it without
  // re-arming the interval.
  const hoursRef = useRef(initialHours);
  const hoursDayRef = useRef<string | null>(null);
  const priceHourRef = useRef<string | null>(null);

  useEffect(() => {
    const hourKey = (ms: number) =>
      `${cafeDay(ms, timezone)}T${new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        hour12: false,
      }).format(ms)}`;

    // The server just rendered this hour's snapshot and today's hours; the
    // first client fetches are owed at the next hour / next day, not now.
    const mountedAt = Date.now();
    hoursDayRef.current = cafeDay(mountedAt, timezone);
    priceHourRef.current = hourKey(mountedAt);
    setNowMs(mountedAt);

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

      // Prices: once per hour, and only between opening hours.
      const key = hourKey(ms);
      if (key !== priceHourRef.current && openState(hoursRef.current, ms, timezone).open) {
        priceHourRef.current = key;
        fetch('/api/display-menu')
          .then((res) => (res.ok ? res.json() : null))
          .then((fresh: PriceBook | null) => {
            if (fresh && Array.isArray(fresh.items)) setBook(fresh);
          })
          .catch(() => {});
      }
    };

    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        backgroundColor: brand.cream,
        color: brand.ink,
        overflow: 'hidden',
        '@keyframes board-in': {
          from: { opacity: 0, transform: 'translateY(2vh)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes board-drift': {
          from: { transform: 'translateY(-1.2%)' },
          to: { transform: 'translateY(1.2%)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& *': { animation: 'none !important', transition: 'none !important' },
        },
      }}
    >
      <Header nowMs={nowMs} timezone={timezone} legend={hasTempPair} />

      <Box
        sx={{
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          px: 'clamp(16px, 3.5vw, 56px)',
          gap: 'clamp(6px, 1vh, 16px)',
        }}
      >
        {speciality && <SpecialityPanel section={speciality} />}

        {/* The rest of the board in two hand-balanced columns: the split is
            chosen so the whole list fits one screen with nothing under the
            fold, which CSS multicol cannot promise with unequal sections. */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            columnGap: 'clamp(16px, 3vw, 48px)',
            alignItems: 'start',
            animation: 'board-in 700ms cubic-bezier(.16,1,.3,1) 150ms both',
          }}
        >
          {splitColumns(rest).map((column, index) => (
            <Box key={index} sx={{ minWidth: 0 }}>
              {column.map((section) => (
                <SectionList key={section.id} section={section} />
              ))}
            </Box>
          ))}
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}

/** The hand-tuned column split that keeps the whole list above the fold. */
const COLUMNS: string[][] = [
  ['coffee', 'smoothies', 'food'],
  ['cold', 'bakery'],
];

function splitColumns(sections: DisplaySection[]): DisplaySection[][] {
  const columns = COLUMNS.map((ids) =>
    ids.flatMap((id) => sections.filter((section) => section.id === id)),
  );
  // A section the split does not know lands in the second column rather than
  // vanishing — visible and fixable, like the rest of the board's failures.
  const known = new Set(COLUMNS.flat());
  columns[columns.length - 1].push(...sections.filter((section) => !known.has(section.id)));
  return columns;
}

/** Big logo top left; café-time clock top right. Nothing else. */
function Header({ nowMs, timezone, legend }: { nowMs: number | null; timezone: string; legend: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 'clamp(16px, 3.5vw, 56px)',
        pt: 'clamp(10px, 1.6vh, 26px)',
        pb: 'clamp(6px, 0.9vh, 14px)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.2vw, 20px)' }}>
        <Image src={logo} alt="Easy Beans Coffee" style={{ width: 'clamp(52px, 7.5vh, 104px)', height: 'auto' }} priority />
        <Box
          sx={{
            fontFamily: POPPINS,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            fontSize: 'clamp(1.1rem, 2.8vh, 2.1rem)',
            lineHeight: 1.05,
          }}
        >
          Easy Beans
          <Box component="span" sx={{ display: 'block', fontWeight: 500, color: brand.ink70, fontSize: '0.58em' }}>
            Coffee · San Pedro
          </Box>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        {nowMs !== null && (
          <Box sx={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 'clamp(1.2rem, 3.4vh, 2.6rem)', fontVariantNumeric: 'tabular-nums' }}>
            {clockLabel(new Date(nowMs).toISOString(), timezone)}
          </Box>
        )}
        {legend && (
          <Box sx={{ color: brand.ink45, fontSize: 'clamp(0.6rem, 1.4vh, 0.95rem)' }}>
            caliente · hot&nbsp;&nbsp;/&nbsp;&nbsp;frío · iced
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * The speciality drinks, set apart: a rose-washed panel with each drink's own
 * photograph and tagline, and the ube can standing beside the list. The one
 * colour moment on an otherwise cream board, per the brand rules.
 */
function SpecialityPanel({ section }: { section: DisplaySection }) {
  return (
    <Box
      sx={{
        backgroundColor: brand.roseWash,
        borderRadius: `${radius.xl}px`,
        px: 'clamp(14px, 2.4vw, 36px)',
        py: 'clamp(8px, 1.3vh, 20px)',
        display: 'grid',
        gridTemplateColumns: PANEL_ART ? 'minmax(0, 1fr) clamp(90px, 17vh, 240px)' : 'minmax(0, 1fr)',
        columnGap: 'clamp(12px, 2vw, 32px)',
        animation: 'board-in 700ms cubic-bezier(.16,1,.3,1) both',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <SectionHeading section={section} accent={brand.rosePinkDeep} />
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {section.rows.map((row) => (
            <Box
              key={row.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(8px, 1vw, 18px)',
                py: 'clamp(1px, 0.25vh, 4px)',
                borderBottom: `1px solid ${brand.ink06}`,
                '&:last-of-type': { borderBottom: 'none' },
                opacity: row.soldOut ? 0.45 : 1,
              }}
            >
              {/* Wash painted on the thumb so the photo's multiply blend sees
                  it even inside the panel's animated stacking context. */}
              <Box
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  flexShrink: 0,
                  height: 'clamp(20px, 2.9vh, 42px)',
                  backgroundColor: brand.roseWash,
                }}
              >
                {row.art && (
                  <Image src={row.art} alt="" fill sizes="6vh" style={{ objectFit: 'contain', mixBlendMode: 'multiply' }} />
                )}
              </Box>
              <Box
                sx={{
                  minWidth: 0,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  fontSize: 'clamp(0.85rem, 2.2vh, 1.5rem)',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.name.en}
                {row.name.es !== row.name.en && (
                  <Box component="span" sx={{ fontWeight: 500, color: brand.ink45, fontSize: '0.72em' }}>
                    {' '}· {row.name.es}
                  </Box>
                )}
              </Box>
              <Leader />
              <Price price={row.price} soldOut={row.soldOut} size="clamp(0.85rem, 2.2vh, 1.5rem)" />
            </Box>
          ))}
        </Box>
      </Box>

      {PANEL_ART && (
        <Box sx={{ position: 'relative', backgroundColor: brand.roseWash, animation: 'board-drift 6s ease-in-out infinite alternate' }}>
          <Image src={PANEL_ART} alt="Iced ube latte in a can" fill priority sizes="18vh" style={{ objectFit: 'contain', mixBlendMode: 'multiply' }} />
        </Box>
      )}
    </Box>
  );
}

/** One of the plain sections: a small heading, then name — leader — price. */
function SectionList({ section }: { section: DisplaySection }) {
  return (
    <Box sx={{ breakInside: 'avoid', mb: 'clamp(8px, 1.3vh, 20px)' }}>
      <SectionHeading section={section} accent={brand.rosePinkDeep} />
      {section.rows.map((row) => (
        <Box
          key={row.id}
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'clamp(6px, 0.8vw, 14px)',
            py: 'clamp(1px, 0.18vh, 3px)',
            opacity: row.soldOut ? 0.45 : 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {/* One line per dish, whatever the name's length — the board's
                height budget is exact and a wrapped row spends someone
                else's line. */}
            <Box
              sx={{
                fontWeight: 600,
                fontSize: 'clamp(0.68rem, 1.5vh, 1.05rem)',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.name.en}
              {row.name.es !== row.name.en && (
                <Box component="span" sx={{ fontWeight: 500, color: brand.ink45, fontSize: '0.75em' }}>
                  {' '}· {row.name.es}
                </Box>
              )}
            </Box>
            {row.options && (
              <Box sx={{ color: brand.ink70, fontSize: 'clamp(0.58rem, 1.3vh, 0.9rem)', lineHeight: 1.25 }}>
                {row.options.en}
              </Box>
            )}
          </Box>
          <Leader />
          <Price price={row.price} soldOut={row.soldOut} size="clamp(0.68rem, 1.5vh, 1.05rem)" />
        </Box>
      ))}
    </Box>
  );
}

/** Small-caps section label — deliberately not a headline. */
function SectionHeading({
  section,
  accent,
  showBlurb = false,
}: {
  section: DisplaySection;
  accent: string;
  /** Only the featured panel earns the blurb; the list stays terse. */
  showBlurb?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 'clamp(6px, 0.8vw, 14px)',
        mb: 'clamp(3px, 0.5vh, 8px)',
        pb: 'clamp(2px, 0.35vh, 5px)',
        borderBottom: `1px solid ${brand.ink12}`,
      }}
    >
      <Box
        sx={{
          color: accent,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontSize: 'clamp(0.56rem, 1.3vh, 0.9rem)',
          whiteSpace: 'nowrap',
        }}
      >
        {section.label.es}
        {section.label.es !== section.label.en && ` · ${section.label.en}`}
      </Box>
      {showBlurb && (
        <Box sx={{ color: brand.ink45, fontSize: 'clamp(0.55rem, 1.3vh, 0.9rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {section.blurb.es} · {section.blurb.en}
        </Box>
      )}
    </Box>
  );
}

function Leader() {
  return <Box aria-hidden sx={{ flex: 1, borderBottom: `2px dotted ${brand.ink12}`, alignSelf: 'center', mt: '0.4em', minWidth: 'clamp(8px, 1vw, 20px)' }} />;
}

function Price({ price, soldOut, size }: { price: RowPrice; soldOut: boolean; size: string }) {
  if (soldOut) {
    return (
      <Box sx={{ color: brand.rosePinkDeep, fontWeight: 600, fontSize: `calc(${size} * 0.72)`, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
        Agotado · Sold out
      </Box>
    );
  }
  const label = (cents: number | undefined) => (cents === undefined ? '—' : formatMenuPrice(cents));
  const text =
    price.hot !== undefined || price.iced !== undefined
      ? `${label(price.hot)} / ${label(price.iced)}`
      : label(price.one);
  return (
    <Box sx={{ fontFamily: POPPINS, fontWeight: 600, fontSize: size, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {text}
    </Box>
  );
}

/** Instagram handle left, the site right. */
function Footer() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 'clamp(16px, 3.5vw, 56px)',
        py: 'clamp(6px, 1vh, 16px)',
      }}
    >
      <Box sx={{ color: brand.rosePinkDeep, fontWeight: 600, fontSize: 'clamp(0.75rem, 1.9vh, 1.25rem)' }}>
        {INSTAGRAM_HANDLE}
      </Box>
      <Box sx={{ color: brand.ink70, fontWeight: 500, fontSize: 'clamp(0.7rem, 1.7vh, 1.1rem)' }}>
        easybeanscoffee.com
      </Box>
    </Box>
  );
}
