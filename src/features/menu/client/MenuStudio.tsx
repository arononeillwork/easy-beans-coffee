'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import TakeoutDiningOutlinedIcon from '@mui/icons-material/TakeoutDiningOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BakeryDiningOutlinedIcon from '@mui/icons-material/BakeryDiningOutlined';
import { visuallyHidden } from '@mui/utils';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useCartContext } from '@/features/order/client/CartProvider';
import { formatEuros, formatMenuPrice } from '@/features/order/lib/price';
import { PREP_TIME_MIN } from '@/features/order/lib/pickupTimes';
import { normalizeName } from '@/features/shop/retail';
import { brand, motion, radius, shadow } from '@/theme/brand';
import {
  availableTemps,
  composePrice,
  initialChoice,
  resolveOptions,
  serveIsPriced,
  serveNote,
  tempIsChoice,
  toCartLine,
} from '../compose';
import { artFolderFor, displayNameFor, framesToPreload, resolveArt } from '../drinkArt';
import { DRINKS, GROUPS, SECTIONS, drinksInSection, groupOf } from '../drinks';
import { indexPriceBook, lowestCents, type PriceBook } from '../priceBook';
import { paletteForDrink } from '../palette';
import type { DrinkChoice, MenuGroup, Section, Serve, Temp } from '../types';
import { DrinkStage, type StagePanel } from './DrinkStage';
import { ComingSoonRail, OptionRail } from './OptionRail';
import { DrinkRail, SectionRail, type RailDrink } from './Rails';
import { RailArrow, useRailOverflow } from './ScrollArrows';
import { SegmentedChoice, type SegmentOption } from './SegmentedChoice';

/**
 * The menu, as one screen you build a drink on.
 *
 * The old board was a grid of cards that opened a dialog. This is the opposite
 * shape: the drink is always on screen at full size, and every choice — hot or
 * iced, the vessel, the milk, the syrup — changes the photograph in front of
 * you rather than a line of text in a modal. Choosing caramel does not tick a
 * box; it turns the cup into a caramel latte, because the café shot one.
 *
 * Two sources feed it and they are deliberately separate. What the menu *is*
 * ships with the site (features/menu/drinks, and the photography under
 * public/media/drinks). What it *costs* comes from Square, once a day, through
 * a price book the page is handed already resolved — see server/square/
 * priceCache. Nothing here fetches on mount, and nothing renders a Square CDN
 * URL.
 */
export function MenuStudio({ priceBook }: { priceBook: PriceBook }) {
  const { t, lang } = useLanguage();
  const labels = t.menuPage.studio;
  const cart = useCartContext();

  const prices = useMemo(() => indexPriceBook(priceBook), [priceBook]);
  const itemFor = useCallback(
    (squareName: string) => prices.get(normalizeName(squareName)),
    [prices],
  );

  const [section, setSection] = useState<Section>('coffee');
  const [index, setIndex] = useState(0);
  /**
   * Every drink keeps the build you gave it. Coming back to the latte you were
   * halfway through configuring and finding it reset to whole milk would make
   * the swipe feel destructive, which is the opposite of what it is for.
   */
  const [choices, setChoices] = useState<Record<string, DrinkChoice>>({});
  const [justAdded, setJustAdded] = useState(false);

  const sectionDrinks = useMemo(() => drinksInSection(section), [section]);
  const drink = sectionDrinks[Math.min(index, sectionDrinks.length - 1)];
  const item = drink ? itemFor(drink.square) : undefined;

  const choiceFor = useCallback(
    (drinkId: string) => {
      const found = DRINKS.find((entry) => entry.id === drinkId);
      if (!found) return null;
      return choices[drinkId] ?? initialChoice(found, itemFor(found.square));
    },
    [choices, itemFor],
  );

  const choice = drink ? (choices[drink.id] ?? initialChoice(drink, item)) : null;

  const update = useCallback((next: DrinkChoice) => {
    setChoices((previous) => ({ ...previous, [next.drinkId]: next }));
    setJustAdded(false);
  }, []);

  // ── Derived: what the stage shows and what it costs ───────────────────────

  const temps = drink ? availableTemps(drink, item) : [];
  const art = drink && choice ? artFolderFor(drink, choice) : '';
  const artSrc = choice ? resolveArt(art, choice.temp, choice.serve) : null;
  const price = drink && choice ? composePrice(drink, item, choice) : null;
  const options = drink ? resolveOptions(drink, item) : [];
  const optionByName = new Map(options.map((entry) => [entry.ref.square, entry]));
  const name = drink && choice ? displayNameFor(drink, choice)[lang] : '';

  /**
   * Warm every frame this drink can switch to. Without it the first press of
   * Hot/Iced shows a blank cup for a beat — on the one control the screen is
   * built around — because the file has not been asked for yet.
   */
  useEffect(() => {
    if (!drink) return;
    const frames = framesToPreload(drink, temps);
    const images = frames.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
    return () => {
      for (const img of images) img.src = '';
    };
    // `temps` is derived from drink + prices and is stable across renders of
    // the same drink; keying on the id keeps this to one run per selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drink?.id]);

  const panels: StagePanel[] = useMemo(
    () =>
      sectionDrinks.map((entry) => {
        const entryChoice = choiceFor(entry.id);
        const folder = entryChoice ? artFolderFor(entry, entryChoice) : entry.id;
        return {
          id: entry.id,
          src: entryChoice ? resolveArt(folder, entryChoice.temp, entryChoice.serve) : null,
          name: (entryChoice ? displayNameFor(entry, entryChoice) : entry.name)[lang],
          alt: labels.photoAlt
            .replace('{drink}', entry.name[lang])
            .replace('{serve}', labels[entryChoice?.serve ?? 'sitIn']),
          palette: paletteForDrink(entry),
        };
      }),
    [sectionDrinks, choiceFor, labels, lang],
  );

  const railDrinks: RailDrink[] = useMemo(
    () =>
      sectionDrinks.map((entry) => {
        const entryItem = itemFor(entry.square);
        const entryChoice = choiceFor(entry.id);
        const folder = entryChoice ? artFolderFor(entry, entryChoice) : entry.id;
        return {
          id: entry.id,
          name: entry.name[lang],
          thumb: resolveArt(folder, entryChoice?.temp ?? null, 'sitIn'),
          fromCents: lowestCents(entryItem),
          soldOut: entryItem?.soldOut ?? false,
        };
      }),
    [sectionDrinks, itemFor, choiceFor, lang],
  );

  const changeSection = useCallback((next: Section) => {
    setSection(next);
    setIndex(0);
    setJustAdded(false);
  }, []);

  /**
   * The group is not its own state: it is read off the section, so the two can
   * never disagree. Switching group lands on that group's first section.
   */
  const group = groupOf(section);
  const changeGroup = useCallback(
    (next: MenuGroup) => {
      const first = GROUPS.find((entry) => entry.id === next)?.sections[0];
      if (first) changeSection(first);
    },
    [changeSection],
  );

  const selectDrink = useCallback((next: number) => {
    setIndex(next);
    setJustAdded(false);
  }, []);

  // ── Adding to the order ───────────────────────────────────────────────────

  const addTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(addTimer.current), []);

  // The flavour pick row scrolls sideways; keyed per drink so the arrows
  // re-measure when the row's content changes underneath them.
  const pickRail = useRailOverflow(drink?.id ?? null);

  const add = () => {
    if (!drink || !choice) return;
    const line = toCartLine(drink, item, choice, lang, artSrc);
    if (!line) return;
    cart.addLine(line);
    setJustAdded(true);
    clearTimeout(addTimer.current);
    addTimer.current = setTimeout(() => setJustAdded(false), 2200);
  };

  if (!drink || !choice) return null;

  const canAdd = price?.variationId !== undefined && !price.soldOut;
  const totalCents = price?.unitCents !== undefined ? price.unitCents * choice.quantity : undefined;
  const palette = paletteForDrink(drink);
  const note = serveNote(drink, choice, lang);

  const tempOptions: SegmentOption<Temp>[] = temps.map((temp) => ({
    value: temp,
    label: labels[temp],
    icon: temp === 'hot' ? <LocalCafeOutlinedIcon /> : <AcUnitRoundedIcon />,
  }));

  const serveOptions: SegmentOption<Serve>[] = drink.serves.map((serve) => ({
    value: serve,
    label: labels[serve],
    icon: SERVE_ICONS[serve],
  }));

  const groupOptions: SegmentOption<MenuGroup>[] = GROUPS.map((entry) => ({
    value: entry.id,
    label: entry.label[lang],
    icon: entry.id === 'drinks' ? <LocalCafeOutlinedIcon /> : <BakeryDiningOutlinedIcon />,
  }));

  const groupSections =
    GROUPS.find((entry) => entry.id === group)?.sections.flatMap((id) => {
      const found = SECTIONS.find((entry) => entry.id === id);
      return found ? [{ id: found.id, label: found.label[lang] }] : [];
    }) ?? [];

  return (
    <Box
      component="section"
      sx={{
        pb: { xs: 17, md: 10 },
        // Laptop: the drink on the left, every decision on the right, the way
        // a product page reads. The phone keeps the single column.
        display: { md: 'grid' },
        gridTemplateColumns: { md: 'minmax(0, 1.05fr) minmax(0, 0.95fr)' },
        columnGap: { md: 4 },
        rowGap: { md: 2 },
        alignItems: { md: 'start' },
        maxWidth: { md: 1200 },
        mx: { md: 'auto' },
        px: { md: 3 },
      }}
    >
      {/* The heading stays for screen readers; on screen the crumb trail is
          the opening move, with nothing above it. */}
      <Typography variant="h1" sx={visuallyHidden}>
        {labels.eyebrow}
      </Typography>

      {/* The crumb trail: drinks or food first, then which part of that half.
          Both rows centred, the second changing with the first. */}
      <Box sx={{ gridColumn: { md: '1 / -1' }, pt: { xs: 2, md: 3 } }}>
        <Box sx={{ width: 'fit-content', mx: 'auto', px: 2.5 }}>
          <SegmentedChoice
            label={labels.groupLabel}
            value={group}
            options={groupOptions}
            onChange={changeGroup}
            size="sm"
          />
        </Box>
        <SectionRail
          label={labels.sectionLabel}
          value={section}
          onChange={changeSection}
          sections={groupSections}
        />
      </Box>

      {/* The washed band: title, stage and rail share the drink's own colour
          and cross-fade as one surface. Title before image before options —
          the reading order of a menu board — and the name changes with the
          flavour chosen, renaming the cup as the cup changes. */}
      <Box
        sx={{
          backgroundColor: palette.wash,
          transition: `background-color ${motion.slow} ${motion.easeOutSoft}`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          pt: 2.5,
          pb: { xs: 7, md: 3 },
          // On a laptop the band is a rounded panel that keeps the drink in
          // view while the options on the right scroll.
          gridColumn: { md: '1' },
          borderRadius: { md: '32px' },
          overflow: { md: 'hidden' },
          position: { md: 'sticky' },
          top: { md: 88 },
        }}
      >
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Typography
            variant="h2"
            sx={{ fontSize: 'clamp(2.1rem, 7.5vw, 3.2rem)', lineHeight: 1.02, mb: 0.75 }}
          >
            {name}
          </Typography>
          <Typography variant="h6" component="p" sx={{ color: palette.accent }}>
            {drink.tagline[lang]}
          </Typography>
        </Container>

        <DrinkStage
          panels={panels}
          activeIndex={Math.min(index, sectionDrinks.length - 1)}
          onActiveChange={selectDrink}
          emptyLabel={labels.photoSoon}
          prevLabel={labels.prevDrink}
          nextLabel={labels.nextDrink}
        />

        <DrinkRail
          label={labels.drinkLabel}
          drinks={railDrinks}
          activeIndex={Math.min(index, sectionDrinks.length - 1)}
          onSelect={selectDrink}
          lang={lang}
          soldOutLabel={labels.soldOut}
          scrollBackLabel={labels.scrollBack}
          scrollAheadLabel={labels.scrollAhead}
        />
      </Box>

      {/* The sheet: everything decidable, on a white card drawn up over the
          wash — the app-like bottom sheet, without the app. */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: { xs: 640, md: 'none' },
          mx: { xs: 'auto', md: 0 },
          mt: { xs: -4.5, md: 0 },
          gridColumn: { md: '2' },
          px: { xs: 2.5, sm: 4 },
          pt: 4,
          pb: 4.5,
          backgroundColor: brand.white,
          borderRadius: { xs: '28px 28px 0 0', sm: '32px' },
          boxShadow: shadow.soft,
        }}
      >
        <Typography
          color="text.secondary"
          sx={{ maxWidth: '38ch', mx: 'auto', textAlign: 'center', mb: 3 }}
        >
          {drink.description[lang]}
        </Typography>

        {tempIsChoice(drink, item) && (
          <Box sx={{ mb: 1.5 }}>
            <SegmentedChoice
              label={labels.tempLabel}
              value={choice.temp ?? temps[0]}
              options={tempOptions}
              onChange={(temp) => update({ ...choice, temp })}
            />
          </Box>
        )}

        {drink.serves.length > 1 && (
          <Box sx={{ mb: 1 }}>
            <SegmentedChoice
              label={labels.serveLabel}
              value={choice.serve}
              options={serveOptions}
              onChange={(serve) => update({ ...choice, serve })}
            />
          </Box>
        )}

        {/* A can is the same drink at the same price, so say so rather than
            letting the vessel read as an upsell. */}
        {choice.serve === 'can' && !serveIsPriced(drink) && (
          <Typography
            sx={{ fontSize: '0.75rem', color: brand.ink45, textAlign: 'center', mb: 2 }}
          >
            {labels.canNote}
          </Typography>
        )}

        {drink.variations.by === 'pick' && (
          <Box sx={{ mb: 2.5, mt: 2 }}>
            <Typography variant="h6" component="h3" sx={{ color: palette.accent, mb: 1.25 }}>
              {drink.variations.label[lang]}
            </Typography>
            <Box sx={{ position: 'relative', mx: { xs: -2.5, sm: 0 } }}>
              <Box
                ref={pickRail.scroller}
                role="radiogroup"
                aria-label={drink.variations.label[lang]}
                sx={{
                  display: 'flex',
                  gap: 1,
                  overflowX: 'auto',
                  px: { xs: 2.5, sm: 0 },
                  pb: 1,
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {drink.variations.picks.map((pick) => {
                  const selected = choice.pickId === pick.id;
                  return (
                    <Box
                      key={pick.id}
                      component="button"
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => update({ ...choice, pickId: pick.id })}
                      sx={{
                        flex: '0 0 auto',
                        px: 1.75,
                        py: 1.1,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.875rem',
                        fontWeight: selected ? 500 : 400,
                        color: brand.ink,
                        whiteSpace: 'nowrap',
                        borderRadius: radius.pill,
                        border: '1px solid',
                        borderColor: selected ? brand.ink : brand.ink12,
                        background: 'none',
                        transition: `border-color ${motion.fast} ${motion.easeStandard}`,
                      }}
                    >
                      {pick.name[lang]}
                    </Box>
                  );
                })}
              </Box>

              {/* Same affordance as the drink rail: more flavours than fit say so. */}
              <RailArrow
                side="left"
                label={labels.scrollBack}
                visible={pickRail.overflow.back}
                onClick={() => pickRail.page(-1)}
              />
              <RailArrow
                side="right"
                label={labels.scrollAhead}
                visible={pickRail.overflow.ahead}
                onClick={() => pickRail.page(1)}
              />
            </Box>
          </Box>
        )}

        {drink.options.length > 0 && <Box sx={{ mt: 3.5 }} />}

        {/* Every rail, open by default, in the order a barista builds the
            drink. A rail Square has no priced list for simply does not render;
            one marked coming-soon renders as a statement instead of a choice.
            Keyed per drink so an opened syrup set closes again when the drink
            underneath it changes. */}
        {drink.options.map((optionRef) => {
          if (optionRef.comingSoon) {
            return (
              <ComingSoonRail
                key={`${drink.id}:${optionRef.square}`}
                option={optionRef}
                lang={lang}
                accent={palette.accent}
                soonLabel={labels.comingSoon}
              />
            );
          }
          const resolved = optionByName.get(optionRef.square);
          if (!resolved) return null;
          return (
            <OptionRail
              key={`${drink.id}:${resolved.group.id}`}
              option={optionRef}
              group={resolved.group}
              chosen={choice.options[optionRef.square] ?? []}
              onChange={(next) =>
                update({ ...choice, options: { ...choice.options, [optionRef.square]: next } })
              }
              lang={lang}
              accent={palette.accent}
              moreLabel={labels.showMore}
              lessLabel={labels.showLess}
            />
          );
        })}

        {/* Price and timing, side by side — the two facts a customer checks
            before pressing the button. */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mt: 3.5 }}>
          <StatTile
            id="price"
            icon={<LocalCafeOutlinedIcon fontSize="small" />}
            label={labels.price}
            value={
              price?.unitCents !== undefined
                ? formatMenuPrice(price.unitCents, lang)
                : labels.priceUnknown
            }
            muted={price?.unitCents === undefined}
          />
          <StatTile
            id="ready"
            icon={<AccessTimeRoundedIcon fontSize="small" />}
            label={labels.ready}
            value={
              drink.madeToOrder
                ? labels.readyMinutes.replace('{min}', String(PREP_TIME_MIN))
                : labels.readyNow
            }
          />
        </Box>

        {priceBook.stale && priceBook.items.length > 0 && (
          <Typography sx={{ fontSize: '0.6875rem', color: brand.ink45, mt: 1.5 }}>
            {labels.stalePrices.replace('{day}', priceBook.day)}
          </Typography>
        )}
      </Box>

      {/* The order bar. On a phone it floats as its own glass pill, clear of
          the screen edges, so the price and the button stay reachable however
          far down the option rails you are. */}
      <Box
        sx={{
          position: { xs: 'fixed', md: 'static' },
          left: { xs: 12, md: 'auto' },
          right: { xs: 12, md: 'auto' },
          bottom: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', md: 'auto' },
          zIndex: 10,
          gridColumn: { md: '2' },
          maxWidth: { xs: 640, md: 'none' },
          mx: { sm: 'auto', md: 0 },
          px: { xs: 1.25, md: 0 },
          pt: { xs: 1.25, md: 3 },
          pb: { xs: 1.25, md: 0 },
          borderRadius: { xs: '26px', md: 0 },
          backgroundColor: { xs: 'rgba(255, 255, 255, 0.92)', md: 'transparent' },
          backdropFilter: { xs: 'blur(14px)', md: 'none' },
          border: { xs: '1px solid rgba(255,255,255,0.7)', md: 'none' },
          boxShadow: { xs: shadow.lift, md: 'none' },
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <QuantityStepper
              label={labels.quantityLabel}
              value={choice.quantity}
              onChange={(quantity) => update({ ...choice, quantity })}
            />
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={!canAdd}
              onClick={add}
              sx={{
                flexGrow: 1,
                py: 1.75,
                boxShadow: `0 10px 28px ${brand.rosePink}66`,
                '&.Mui-disabled': { boxShadow: 'none' },
                '&:hover': { boxShadow: `0 12px 32px ${brand.rosePink}88` },
              }}
            >
              {price?.soldOut
                ? labels.soldOut
                : justAdded
                  ? labels.added
                  : totalCents !== undefined
                    ? `${labels.add} · ${formatEuros(totalCents, lang)}`
                    : labels.add}
            </Button>
          </Box>
          {note && (
            <Typography
              sx={{ fontSize: '0.6875rem', color: brand.ink45, textAlign: 'center', mt: 0.75 }}
            >
              {name} · {note}
            </Typography>
          )}
        </Container>
      </Box>
    </Box>
  );
}

const SERVE_ICONS: Record<Serve, React.ReactNode> = {
  sitIn: <StorefrontOutlinedIcon />,
  takeaway: <TakeoutDiningOutlinedIcon />,
  can: <Inventory2OutlinedIcon />,
};

function StatTile({
  id,
  icon,
  label,
  value,
  muted = false,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <Box
      data-stat={id}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.75,
        py: 1.5,
        borderRadius: '20px',
        backgroundColor: brand.cream,
      }}
    >
      <Box
        aria-hidden
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: '50%',
          backgroundColor: brand.white,
          color: brand.ink70,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" component="p" sx={{ color: brand.ink45, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: muted ? '0.875rem' : '1.375rem',
            fontWeight: 500,
            lineHeight: 1.1,
            color: muted ? brand.ink70 : brand.ink,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function QuantityStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <Box
      role="group"
      aria-label={label}
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        borderRadius: radius.pill,
        border: `1px solid ${brand.ink12}`,
        backgroundColor: brand.white,
      }}
    >
      <StepButton label="−" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1}>
        <RemoveRoundedIcon fontSize="small" />
      </StepButton>
      <Typography aria-live="polite" sx={{ minWidth: 20, textAlign: 'center', fontWeight: 500 }}>
        {value}
      </Typography>
      <StepButton label="+" onClick={() => onChange(Math.min(20, value + 1))} disabled={value >= 20}>
        <AddRoundedIcon fontSize="small" />
      </StepButton>
    </Box>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 42,
        height: 46,
        border: 0,
        background: 'none',
        borderRadius: radius.pill,
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? brand.ink12 : brand.ink70,
      }}
    >
      {children}
    </Box>
  );
}
