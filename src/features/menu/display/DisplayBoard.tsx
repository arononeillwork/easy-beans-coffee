'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import logo from '@/assets/logo.png';
import { cafeDay, type PriceBook } from '@/features/menu/priceBook';
import { isSceneFrame } from '@/features/menu/drinkArt';
import { formatMenuPrice } from '@/features/order/lib/price';
import type { DayHours } from '@/shared/lib/openingHours';
import { clockLabel, openState } from '@/shared/lib/openNow';
import { brand } from '@/theme/brand';
import { buildDisplayPages, type DisplayPage, type DisplayRow, type RowPrice } from './boardData';

/**
 * The menu as the café's own wall: a portrait screen cycling through the
 * board's sections, each page washed in its section's colour with the
 * photography doing the selling.
 *
 * It is left running for weeks, so it looks after itself:
 * - prices re-read from Square once an hour (via /api/display-menu), and only
 *   while the café is open — a closed café costs Square nothing overnight;
 * - opening hours re-read once per café day (via /api/ordering-hours), so a
 *   bank-holiday closure set on Google reaches the wall by morning;
 * - every fetch failure keeps the last good data on screen. The board never
 *   blanks.
 */

/** How long each section holds the screen. */
const PAGE_MS = 12_000;
/** How often the board checks the clock for the hourly/daily work above. */
const TICK_MS = 30_000;

const POPPINS = 'var(--font-poppins), sans-serif';

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
  const [hours, setHours] = useState(initialHours);
  const [pageIndex, setPageIndex] = useState(0);
  // Clock state is mount-only so the server and first client render agree.
  const [nowMs, setNowMs] = useState<number | null>(null);

  const pages = useMemo(() => buildDisplayPages(book), [book]);
  const page = pages[pageIndex % pages.length] ?? pages[0];

  // Refresh bookkeeping lives in refs: ticks read and write it without
  // re-arming the interval.
  const hoursRef = useRef(hours);
  hoursRef.current = hours;
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
            if (Array.isArray(data?.hours) && data.hours.length > 0) setHours(data.hours);
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

  // The carousel. Its own interval so a data refresh never stutters the page
  // rhythm.
  useEffect(() => {
    const interval = setInterval(() => setPageIndex((index) => index + 1), PAGE_MS);
    return () => clearInterval(interval);
  }, []);

  if (!page) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        backgroundColor: page.palette.wash,
        color: brand.ink,
        overflow: 'hidden',
        '@keyframes board-page-in': {
          from: { opacity: 0, transform: 'translateY(2.5vh)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes board-row-in': {
          from: { opacity: 0, transform: 'translateX(2vw)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        '@keyframes board-hero-drift': {
          from: { transform: 'translateY(-1.2%)' },
          to: { transform: 'translateY(1.2%)' },
        },
        '@keyframes board-progress': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& *': { animation: 'none !important', transition: 'none !important' },
        },
      }}
    >
      <Header nowMs={nowMs} timezone={timezone} />
      <PageView key={pageIndex % pages.length} page={page} />
      <Footer pages={pages} activeIndex={pageIndex % pages.length} />
    </Box>
  );
}

/**
 * Logo and wordmark left; café-time clock right. The opening hours stay out
 * of the picture on purpose — the café's own wall should not announce when it
 * is closed. The schedule still runs the refresh cadence behind the scenes.
 */
function Header({ nowMs, timezone }: { nowMs: number | null; timezone: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 'clamp(16px, 4vw, 56px)',
        pt: 'clamp(12px, 2.5vh, 36px)',
        pb: 'clamp(8px, 1.2vh, 20px)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1vw, 16px)' }}>
        <Image src={logo} alt="" style={{ width: 'clamp(40px, 5.5vh, 76px)', height: 'auto' }} priority />
        <Box
          sx={{
            fontFamily: POPPINS,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            fontSize: 'clamp(1rem, 2.4vh, 1.8rem)',
            lineHeight: 1.05,
          }}
        >
          Easy Beans
          <Box component="span" sx={{ display: 'block', fontWeight: 500, color: brand.ink70, fontSize: '0.62em' }}>
            Coffee · San Pedro
          </Box>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        {nowMs !== null && (
          <Box sx={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 'clamp(1.1rem, 3vh, 2.2rem)', fontVariantNumeric: 'tabular-nums' }}>
            {clockLabel(new Date(nowMs).toISOString(), timezone)}
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** One section: masthead with the hero photograph, then the priced rows. */
function PageView({ page }: { page: DisplayPage }) {
  // Past nine rows the taglines go and everything tightens, so the fridge
  // section fits the same screen as the four smoothies.
  const dense = page.rows.length > 9;
  const scene = page.hero !== null && isSceneFrame(page.hero.src);
  // One tagline repeated down the page (bakery's "From the counter") says
  // nothing the blurb hasn't; show taglines only where they differentiate.
  const taglines = new Set(page.rows.map((row) => row.tagline?.en ?? ''));
  const showTaglines = !dense && taglines.size > 1;
  // Keep the left edge straight when only some rows are photographed.
  const reserveThumb = page.rows.some((row) => row.art !== null);

  return (
    <Box
      sx={{
        minHeight: 0,
        // Without this the grid track takes the widest row's min-content —
        // one long nowrap name (bakery) then pushes the whole board past the
        // screen edge instead of ellipsizing.
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        px: 'clamp(16px, 4vw, 56px)',
        pb: 'clamp(8px, 1.5vh, 24px)',
        animation: 'board-page-in 700ms cubic-bezier(.16,1,.3,1) both',
      }}
    >
      {/* Masthead */}
      <Box sx={{ position: 'relative', flex: '0 0 auto', minHeight: page.hero ? 'clamp(120px, 24vh, 360px)' : 'auto', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ position: 'relative', zIndex: 2, maxWidth: page.hero ? '58%' : '100%' }}>
          <Box sx={{ color: page.palette.accent, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: 'clamp(0.65rem, 1.5vh, 1rem)' }}>
            Menú · Menu
          </Box>
          <Box
            component="h1"
            sx={{
              m: 0,
              fontFamily: POPPINS,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
              fontSize: 'clamp(2.2rem, 8.5vh, 7rem)',
            }}
          >
            {page.label.en}
          </Box>
          <Box sx={{ mt: 'clamp(2px, 0.8vh, 12px)', color: brand.ink70, fontSize: 'clamp(0.85rem, 2vh, 1.4rem)' }}>
            {page.label.es !== page.label.en && <Box component="span" sx={{ fontWeight: 600, color: brand.ink }}>{page.label.es} — </Box>}
            {page.blurb.es} · {page.blurb.en}
          </Box>
        </Box>

        {page.hero && (
          <Box sx={{ position: 'absolute', inset: 0, left: 'auto', width: '46%', zIndex: 1 }}>
            {/*
             * The drifting box paints the page wash itself: the animation makes
             * it a stacking context, which would otherwise cut the photo's
             * multiply blend off from the page behind it and leave the studio
             * white visible as a rectangle. With the wash inside the box, the
             * blend — and the ghost type reading through the white ground —
             * both happen against it.
             */}
            <Box
              sx={{
                position: 'absolute',
                inset: scene ? '4% 0' : 0,
                animation: 'board-hero-drift 6s ease-in-out infinite alternate',
                borderRadius: scene ? 'clamp(12px, 2vh, 28px)' : 0,
                overflow: 'hidden',
                backgroundColor: scene ? undefined : page.palette.wash,
                boxShadow: scene ? '0 2px 4px rgba(26,26,26,.06), 0 16px 40px rgba(26,26,26,.12)' : 'none',
              }}
            >
              {!scene && (
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: POPPINS,
                    fontWeight: 600,
                    letterSpacing: '-0.04em',
                    fontSize: 'clamp(3rem, 16vh, 12rem)',
                    color: page.palette.glow,
                    opacity: 0.4,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {page.label.en}
                </Box>
              )}
              <Image
                src={page.hero.src}
                alt={page.hero.alt}
                fill
                priority
                sizes="46vw"
                style={scene ? { objectFit: 'cover' } : { objectFit: 'contain', mixBlendMode: 'multiply' }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Hot/iced legend, only where a row prices the pair */}
      {page.hasTempPair && (
        <Box sx={{ alignSelf: 'flex-end', color: brand.ink45, fontSize: 'clamp(0.65rem, 1.5vh, 1rem)', mt: 'clamp(4px, 1vh, 14px)' }}>
          caliente · hot&nbsp;&nbsp;/&nbsp;&nbsp;frío · iced
        </Box>
      )}

      {/* Rows. Capped per row so a two-dish page sits at the top instead of
          stretching its lines across the whole screen. */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', mt: 'clamp(4px, 1vh, 16px)' }}>
        {page.rows.map((row, index) => (
          <Row
            key={row.id}
            row={row}
            dense={dense}
            index={index}
            accent={page.palette.accent}
            wash={page.palette.wash}
            showTagline={showTaglines}
            reserveThumb={reserveThumb}
          />
        ))}
      </Box>
    </Box>
  );
}

function Row({
  row,
  dense,
  index,
  accent,
  wash,
  showTagline,
  reserveThumb,
}: {
  row: DisplayRow;
  dense: boolean;
  index: number;
  accent: string;
  wash: string;
  showTagline: boolean;
  reserveThumb: boolean;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        maxHeight: '12vh',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(8px, 1.4vw, 24px)',
        borderBottom: `1px solid ${brand.ink12}`,
        '&:last-of-type': { borderBottom: 'none' },
        opacity: row.soldOut ? 0.45 : 1,
        animation: `board-row-in 500ms cubic-bezier(.16,1,.3,1) both`,
        animationDelay: `${120 + index * 55}ms`,
      }}
    >
      {(row.art || reserveThumb) && (
        // Wash painted here for the same stacking-context reason as the hero:
        // the row's entrance animation isolates the thumbnail's blend. An
        // unphotographed row keeps the empty slot so the names stay aligned.
        <Box
          sx={{
            position: 'relative',
            alignSelf: 'center',
            aspectRatio: '1',
            flexShrink: 0,
            height: dense ? 'min(5.5vh, 80%)' : 'min(8vh, 86%)',
            backgroundColor: wash,
          }}
        >
          {row.art && (
            <Image src={row.art} alt="" fill sizes="8vh" style={{ objectFit: 'contain', mixBlendMode: 'multiply' }} />
          )}
        </Box>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            fontFamily: POPPINS,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            fontSize: dense ? 'clamp(0.85rem, 2.4vh, 1.5rem)' : 'clamp(0.95rem, 2.9vh, 1.9rem)',
            lineHeight: 1.1,
            // Roomy pages wrap a long name onto a second line; tight ones
            // ellipsize, because thirteen rows have no second line to give.
            ...(dense
              ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
              : {}),
          }}
        >
          {row.name.en}
          {row.name.es !== row.name.en && (
            <Box component="span" sx={{ fontFamily: 'inherit', fontWeight: 500, color: brand.ink45, fontSize: '0.7em' }}>
              {' '}· {row.name.es}
            </Box>
          )}
        </Box>
        {showTagline && row.tagline && (
          <Box sx={{ color: brand.ink70, fontSize: 'clamp(0.7rem, 1.8vh, 1.1rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.tagline.es} · {row.tagline.en}
          </Box>
        )}
      </Box>
      <Box aria-hidden sx={{ flex: 1, borderBottom: `2px dotted ${brand.ink12}`, alignSelf: 'center', mt: '0.5em' }} />
      <Price price={row.price} soldOut={row.soldOut} dense={dense} accent={accent} />
    </Box>
  );
}

function Price({ price, soldOut, dense, accent }: { price: RowPrice; soldOut: boolean; dense: boolean; accent: string }) {
  const size = dense ? 'clamp(0.85rem, 2.4vh, 1.5rem)' : 'clamp(0.95rem, 2.9vh, 1.9rem)';
  if (soldOut) {
    return (
      <Box sx={{ color: accent, fontWeight: 600, fontSize: `calc(${size} * 0.75)`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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

/** Where we are in the cycle: section dots, the site, and the page timer. */
function Footer({ pages, activeIndex }: { pages: DisplayPage[]; activeIndex: number }) {
  return (
    <Box sx={{ position: 'relative', px: 'clamp(16px, 4vw, 56px)', pb: 'clamp(10px, 1.8vh, 28px)', pt: 'clamp(6px, 1vh, 16px)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 'clamp(6px, 0.8vw, 12px)' }}>
          {pages.map((entry, index) => (
            <Box
              key={entry.section}
              sx={{
                width: 'clamp(8px, 1.2vh, 14px)',
                height: 'clamp(8px, 1.2vh, 14px)',
                borderRadius: '50%',
                backgroundColor: index === activeIndex ? brand.ink : brand.ink12,
                transition: 'background-color 400ms',
              }}
            />
          ))}
        </Box>
        <Box sx={{ color: brand.ink70, fontWeight: 500, fontSize: 'clamp(0.7rem, 1.7vh, 1.1rem)' }}>
          easybeanscoffee.com
        </Box>
      </Box>
      {/* Time left on this page, as a hairline filling along the bottom. */}
      <Box
        key={activeIndex}
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 'clamp(3px, 0.4vh, 6px)',
          backgroundColor: brand.ink,
          opacity: 0.18,
          transformOrigin: 'left',
          animation: `board-progress ${PAGE_MS}ms linear both`,
        }}
      />
    </Box>
  );
}
