/**
 * The five allergens on the café's counter sign (Lista de alérgenos), drawn as
 * flat single-colour glyphs so they read at 18px on a tinted circle.
 *
 * Plain SVG, not MUI SvgIcon: these render inside server components on every
 * page load, and there is no reason to ship a client component for a shape.
 */
import type { AllergenId } from '@/i18n/allergens';

type GlyphProps = { size?: number };

function Svg({ size = 18, children }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block' }}
    >
      {children}
    </svg>
  );
}

/** Gluten — an ear of wheat. */
function GlutenGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <rect x="11.2" y="10" width="1.6" height="11" rx="0.8" />
      <ellipse cx="12" cy="4.6" rx="1.6" ry="2.6" />
      <ellipse cx="8.9" cy="8.2" rx="1.5" ry="2.4" transform="rotate(-30 8.9 8.2)" />
      <ellipse cx="15.1" cy="8.2" rx="1.5" ry="2.4" transform="rotate(30 15.1 8.2)" />
      <ellipse cx="8.6" cy="12.7" rx="1.5" ry="2.4" transform="rotate(-30 8.6 12.7)" />
      <ellipse cx="15.4" cy="12.7" rx="1.5" ry="2.4" transform="rotate(30 15.4 12.7)" />
    </Svg>
  );
}

/** Lácteos — a milk bottle. */
function MilkGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M9.25 2h5.5a.75.75 0 0 1 0 1.5h-.25v1.72l1.83 2.9c.44.7.67 1.5.67 2.33V20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9.55c0-.83.23-1.63.67-2.33l1.83-2.9V3.5h-.25a.75.75 0 0 1 0-1.5Zm-1.3 10.5v3h8.1v-3h-8.1Z" />
    </Svg>
  );
}

/** Huevos — an egg. */
function EggGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.4c3.5 0 6.4 5 6.4 9.4A6.4 6.4 0 0 1 5.6 11.8C5.6 7.4 8.5 2.4 12 2.4Z" />
    </Svg>
  );
}

/** Frutos secos — a peanut in its shell. */
function NutsGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.6a4.3 4.3 0 0 1 3.6 6.65 5 5 0 1 1-7.2 0A4.3 4.3 0 0 1 12 2.6Z" />
    </Svg>
  );
}

/** Soja — a soybean pod. */
function SoyGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <g transform="rotate(-38 12 12)">
        <rect
          x="8.4"
          y="3"
          width="7.2"
          height="18"
          rx="3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="7.4" r="1.85" />
        <circle cx="12" cy="12" r="1.85" />
        <circle cx="12" cy="16.6" r="1.85" />
      </g>
    </Svg>
  );
}

export const ALLERGEN_GLYPHS: Record<AllergenId, (props: GlyphProps) => React.ReactElement> = {
  gluten: GlutenGlyph,
  milk: MilkGlyph,
  egg: EggGlyph,
  nuts: NutsGlyph,
  soy: SoyGlyph,
};
