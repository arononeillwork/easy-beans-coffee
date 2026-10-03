'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Stars } from '../Stars';
import { brand, motion, radius, shadow } from '@/theme/brand';

export type ReviewCard = {
  id: string;
  photo: string;
  alt: string;
  /** The words under the photo: a real Google review, or our own caption. */
  text: string;
  /** Set only on a real review. `null` marks the line as our caption, not a quote. */
  author: string | null;
  /** Date line under the name: "12 Mar 2026 · 2 months ago". */
  meta: string | null;
  rating: number | null;
  url: string | null;
  /** Google requires crediting whoever took a Places photo. */
  credit: string | null;
  creditUrl: string | null;
};

/** Avatar tints, cycled. Ink on lilac, white on the two darker ones. */
const AVATARS = [
  { bg: brand.rosePinkDeep, fg: brand.white },
  { bg: brand.matchaGreen, fg: brand.white },
  { bg: brand.ubeLilac, fg: brand.ink },
] as const;

/**
 * Photo on top, words underneath.
 *
 * Scroll-snap row rather than an index-swapping slider: touch and keyboard
 * scrolling work on their own, and the arrows are an enhancement on top. Three
 * cards at a time on desktop, one on mobile.
 *
 * A card carries either a review or one of our captions, never both, and the
 * two are drawn differently on purpose — a caption gets no avatar, no stars and
 * no quote marks, so nothing of ours can read as something a customer said.
 */
export function ReviewCarousel({
  cards,
  prevLabel,
  nextLabel,
  linkLabel,
  creditLabel,
}: {
  cards: ReviewCard[];
  prevLabel: string;
  nextLabel: string;
  linkLabel: string;
  creditLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 2);
    // 2px slack: sub-pixel widths never land exactly on `max`.
    setAtEnd(el.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  const page = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : el.clientWidth;
    el.scrollBy({ left: step * direction, behavior: 'smooth' });
  };

  const hasPaging = cards.length > 1;

  return (
    <Box>
      <Box
        ref={trackRef}
        onScroll={sync}
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          // Room for the focus ring and the hover lift on the cards.
          px: '3px',
          mx: '-3px',
          pb: 1.5,
        }}
      >
        {cards.map((card, i) => {
          const avatar = AVATARS[i % AVATARS.length];
          return (
            <Box
              key={card.id}
              component="figure"
              sx={{
                flex: {
                  xs: '0 0 82%',
                  sm: '0 0 calc(50% - 8px)',
                  md: '0 0 calc(33.333% - 11px)',
                },
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                m: 0,
                overflow: 'hidden',
                backgroundColor: brand.white,
                borderRadius: `${radius.lg}px`,
                border: `1px solid ${brand.ink06}`,
                transition: `box-shadow ${motion.base} ${motion.easeOutSoft}`,
                '&:hover': { boxShadow: shadow.soft },
                '&:hover img': { transform: 'scale(1.03)' },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  aspectRatio: '4 / 3',
                  overflow: 'hidden',
                  backgroundColor: brand.roseWash,
                }}
              >
                <Image
                  src={card.photo}
                  alt={card.alt}
                  fill
                  sizes="(max-width: 600px) 82vw, (max-width: 900px) 50vw, 33vw"
                  style={{
                    objectFit: 'cover',
                    transition: `transform ${motion.slow} ${motion.easeOutSoft}`,
                  }}
                />

                {card.rating === null ? null : (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 1,
                      py: 0.25,
                      borderRadius: `${radius.pill}px`,
                      backgroundColor: 'rgba(255,255,255,.92)',
                    }}
                  >
                    <Stars value={card.rating} size={15} label={`${card.rating} / 5`} />
                  </Box>
                )}
              </Box>

              <Box
                component="figcaption"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.25,
                  p: 2.5,
                  flexGrow: 1,
                }}
              >
                {card.author ? (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      aria-hidden
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: avatar.bg,
                        color: avatar.fg,
                        fontFamily: 'var(--font-poppins)',
                        fontWeight: 600,
                      }}
                    >
                      {card.author.charAt(0).toUpperCase()}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 500, lineHeight: 1.3 }} noWrap>
                        {card.author}
                      </Typography>
                      {card.meta ? (
                        <Typography variant="caption" sx={{ color: brand.ink45 }}>
                          {card.meta}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                ) : null}

                <Typography
                  variant={card.author ? 'body2' : 'subtitle1'}
                  sx={{
                    color: card.author ? brand.ink70 : brand.ink,
                    fontWeight: card.author ? 400 : 500,
                    display: '-webkit-box',
                    WebkitLineClamp: card.author ? 5 : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {card.author ? `“${card.text}”` : card.text}
                </Typography>

                {/* Nothing to link or credit on a plain caption — skip the row
                    rather than leave a band of dead space under one line. */}
                {card.url || card.credit ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="baseline"
                    justifyContent="space-between"
                    sx={{ mt: 'auto', pt: 0.5 }}
                  >
                    {card.url ? (
                      <Box
                        component="a"
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: '0.8125rem',
                          color: brand.rosePinkDeep,
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {linkLabel}
                      </Box>
                    ) : (
                      <span />
                    )}

                    {/* Google's terms: a Places photo must name who took it. */}
                    {card.credit ? (
                      <Typography variant="caption" sx={{ color: brand.ink45 }} noWrap>
                        {creditLabel}{' '}
                        {card.creditUrl ? (
                          <Box
                            component="a"
                            href={card.creditUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: 'inherit' }}
                          >
                            {card.credit}
                          </Box>
                        ) : (
                          card.credit
                        )}
                      </Typography>
                    ) : null}
                  </Stack>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </Box>

      {hasPaging ? (
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          <IconButton
            aria-label={prevLabel}
            onClick={() => page(-1)}
            disabled={atStart}
            sx={{ border: `1px solid ${brand.ink12}`, backgroundColor: brand.white }}
          >
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label={nextLabel}
            onClick={() => page(1)}
            disabled={atEnd}
            sx={{ border: `1px solid ${brand.ink12}`, backgroundColor: brand.white }}
          >
            <ArrowForwardRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ) : null}
    </Box>
  );
}
