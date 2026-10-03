'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { formatEuros } from '@/features/order/lib/price';
import { brand, motion, radius } from '@/theme/brand';
import type { PricedGroup } from '../priceBook';
import type { Lang, OptionRef } from '../types';

/**
 * One modifier list, as a list: milks, syrups, purées, the extra shot. Every
 * choice is a full-width row — name on the left, surcharge on the right, a
 * ring that fills with a check when chosen. No fills and no cards: the sheet
 * stays quiet so the photography above it carries the colour.
 *
 * Required lists (Square's `minSelected > 0` — every milk drink has one)
 * behave as radios: pressing the chosen one again does nothing, because a
 * latte has to be made with some milk. Optional lists toggle freely up to
 * their ceiling, and once the ceiling is reached the unchosen rows go quiet
 * rather than failing silently on press.
 *
 * A `longList` group (the syrups) shows its first four rows on a phone and
 * puts the rest behind "show more" — ten rows of syrup would be half the
 * screen. Wider screens always show everything, and a folded row that is
 * already chosen shows regardless: a hidden selection reads as a hidden
 * charge.
 */

/** Rows a long list shows on a phone before asking. */
const PHONE_ROWS = 4;

/** The syrup list is long; more than three in one drink is a milkshake. */
const LONG_LIST_MAX = 3;

export function OptionRail({
  option: optionRef,
  group,
  chosen,
  onChange,
  lang,
  accent,
  moreLabel,
  lessLabel,
}: {
  option: OptionRef;
  group: PricedGroup;
  /** Modifier names, not ids — see features/menu/compose. */
  chosen: string[];
  onChange: (next: string[]) => void;
  lang: Lang;
  accent: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const single = group.maxSelected === 1;
  const required = group.minSelected > 0;
  const max = optionRef.longList ? Math.min(group.maxSelected, LONG_LIST_MAX) : group.maxSelected;
  const atCeiling = !single && chosen.length >= max;
  const folds = Boolean(optionRef.longList) && group.modifiers.length > PHONE_ROWS + 1;
  const hiddenCount = group.modifiers.length - PHONE_ROWS;

  const toggle = (name: string) => {
    const isChosen = chosen.includes(name);
    if (single) {
      // A required single-choice list cannot be emptied; an optional one can.
      if (isChosen) onChange(required ? chosen : []);
      else onChange([name]);
      return;
    }
    if (isChosen) onChange(chosen.filter((entry) => entry !== name));
    else if (!atCeiling) onChange([...chosen, name]);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}
      >
        <Typography variant="h6" component="h3" sx={{ color: accent }}>
          {optionRef.label[lang]}
        </Typography>
        {!required && chosen.length > 0 && (
          <Box
            component="button"
            type="button"
            onClick={() => onChange([])}
            sx={{
              border: 0,
              background: 'none',
              p: 0,
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: brand.ink45,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              fontFamily: 'inherit',
            }}
          >
            {lang === 'es' ? 'Quitar' : 'Clear'}
          </Box>
        )}
      </Box>

      <Box role={single ? 'radiogroup' : 'group'} aria-label={optionRef.label[lang]}>
        {group.modifiers.map((modifier, index) => {
          const selected = chosen.includes(modifier.name);
          const muted = atCeiling && !selected;
          // Folded rows stay in the DOM — identical markup on server and
          // client, so no hydration flicker — and phone-only CSS hides them.
          const folded = folds && index >= PHONE_ROWS && !expanded && !selected;

          return (
            <Box
              key={modifier.id}
              component="button"
              type="button"
              role={single ? 'radio' : 'checkbox'}
              aria-checked={selected}
              disabled={muted}
              onClick={() => toggle(modifier.name)}
              sx={{
                display: folded ? { xs: 'none', sm: 'flex' } : 'flex',
                alignItems: 'center',
                gap: 1.5,
                width: '100%',
                px: 0.5,
                py: 1.4,
                border: 0,
                borderBottom: `1px solid ${brand.ink06}`,
                background: 'none',
                cursor: muted ? 'default' : 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                opacity: muted ? 0.4 : 1,
                transition: `opacity ${motion.fast} linear, background-color ${motion.fast} linear`,
                '@media (hover: hover)': {
                  '&:hover:not(:disabled)': { backgroundColor: brand.ink06 },
                },
              }}
            >
              {/* The ring: empty when open, filled with a check when chosen. */}
              <Box
                aria-hidden
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  borderRadius: '50%',
                  border: selected ? 'none' : `1.5px solid ${brand.ink12}`,
                  backgroundColor: selected ? accent : 'transparent',
                  color: brand.white,
                  transition: `background-color ${motion.fast} ${motion.easeStandard}`,
                }}
              >
                {selected && <CheckRoundedIcon sx={{ fontSize: '0.95rem' }} />}
              </Box>

              <Typography
                component="span"
                sx={{
                  flexGrow: 1,
                  fontSize: '0.9375rem',
                  fontWeight: selected ? 500 : 400,
                  color: brand.ink,
                }}
              >
                {modifier.name}
              </Typography>

              {modifier.cents > 0 && (
                <Typography component="span" sx={{ fontSize: '0.8125rem', color: brand.ink45 }}>
                  +{formatEuros(modifier.cents, lang)}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {folds && (
        <Box
          component="button"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          sx={{
            display: { xs: 'inline-flex', sm: 'none' },
            alignItems: 'center',
            gap: 0.5,
            mt: 1.25,
            px: 1.75,
            py: 0.9,
            border: `1px solid ${brand.ink12}`,
            borderRadius: radius.pill,
            background: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.8125rem',
            color: brand.ink70,
          }}
        >
          {expanded ? lessLabel : `${moreLabel} (+${hiddenCount})`}
          <ExpandMoreRoundedIcon
            sx={{
              fontSize: '1.1rem',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: `transform ${motion.base} ${motion.easeOutSoft}`,
            }}
            aria-hidden
          />
        </Box>
      )}
    </Box>
  );
}

/**
 * A rail for something on the menu but not yet at the counter. It states the
 * fact and offers nothing to press — the composer refuses the group anyway
 * (see features/menu/compose), so this is honest rather than decorative.
 */
export function ComingSoonRail({
  option: optionRef,
  lang,
  accent,
  soonLabel,
}: {
  option: OptionRef;
  lang: Lang;
  accent: string;
  soonLabel: string;
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="h6" component="h3" sx={{ color: accent }}>
          {optionRef.label[lang]}
        </Typography>
        <Typography
          component="span"
          sx={{
            px: 1.25,
            py: 0.4,
            borderRadius: radius.pill,
            backgroundColor: brand.limewashTint,
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: brand.ink45,
          }}
        >
          {soonLabel}
        </Typography>
      </Box>
    </Box>
  );
}
