import { brand } from '@/theme/brand';
import type { Drink, Family, StageHue } from './types';

/**
 * The colour a drink brings with it.
 *
 * Moving along the drinks rail should feel like moving through the palette, not
 * through a slideshow — so each family owns a wash for the stage behind the cup
 * and a glow beneath it, and both cross-fade as you scroll. That is the whole
 * mechanism.
 *
 * Two rules from the brand guidelines are load-bearing here. One: the five
 * colours come in *one at a time*, never together, which is why a family gets a
 * single hue and the rest of the screen stays cream. Two: Rose Pink is a fill
 * and never a text colour, so `accent` is always one of the deep steps —
 * `rosePinkDeep` or `matchaGreenDeep` — and never the display pink itself.
 */
export interface FamilyPalette {
  /** Page wash behind the stage. Always a tint; never a saturated fill. */
  wash: string;
  /** Radial glow under the cup, at low opacity. This one may be a display colour. */
  glow: string;
  /** Text-safe accent for the eyebrow and the tagline. */
  accent: string;
}

const PALETTES: Record<Family, FamilyPalette> = {
  coffee: { wash: brand.roseWash, glow: brand.rosePink, accent: brand.rosePinkDeep },
  matcha: { wash: brand.matchaTint, glow: brand.matchaGreen, accent: brand.matchaGreenDeep },
  ube: { wash: brand.lilacTint, glow: brand.ubeLilac, accent: brand.rosePinkDeep },
  chai: { wash: brand.rosePinkTint, glow: brand.rosePink, accent: brand.rosePinkDeep },
  // The café's own material, not a brand colour — used here only as a wash
  // behind a photograph, never as a fill for graphics.
  chocolate: { wash: brand.limewashTint, glow: brand.greyLimewash, accent: brand.rosePinkDeep },
  fruit: { wash: brand.rosePinkTint, glow: brand.rosePink, accent: brand.rosePinkDeep },
  leaf: { wash: brand.matchaTint, glow: brand.matchaGreen, accent: brand.matchaGreenDeep },
  bottle: { wash: brand.limewashTint, glow: brand.greyLimewash, accent: brand.rosePinkDeep },
};

/**
 * Per-hue stage palettes. One deliberate exception to one-colour-at-a-time:
 * the ube matcha is two colours in one glass, and washing it in either alone
 * looked wrong in the cafe's own photography — so it stands on the lilac wash
 * under the matcha glow, the same layering as the drink.
 */
const STAGE_PALETTES: Record<StageHue, FamilyPalette> = {
  ...PALETTES,
  ubeMatcha: { wash: brand.lilacTint, glow: brand.matchaGreen, accent: brand.matchaGreenDeep },
};

export function paletteFor(family: Family): FamilyPalette {
  return PALETTES[family];
}

/** The stage colour a drink carries: its assigned hue, else its family's. */
export function paletteForDrink(drink: Drink): FamilyPalette {
  return STAGE_PALETTES[drink.hue ?? drink.family];
}
