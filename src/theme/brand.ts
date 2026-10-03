/**
 * Easy Beans Coffee brand tokens — Edition 01, April 2026.
 *
 * Five colours, nothing else. Rose Pink leads, Grey Limewash holds everything
 * together, and Rose Wash, Ube Lilac and Matcha Green come in one at a time.
 * More cream and limewash than colour, always.
 *
 * Rose Pink is display only — for text use the deep step, rosePinkDeep.
 */
export const brand = {
  // --- The five ---
  rosePink: '#F79BA4',
  rosePinkDeep: '#A85A68',
  greyLimewash: '#C6C2BB',
  roseWash: '#F3DED3',
  ubeLilac: '#B7A3D8',
  matchaGreen: '#6B8E4E',
  matchaGreenDeep: '#4F6C39',

  // --- Grounds ---
  cream: '#F7ECE4',
  white: '#FFFFFF',
  ink: '#1A1A1A',
  ink70: 'rgba(26, 26, 26, 0.70)',
  ink45: 'rgba(26, 26, 26, 0.45)',
  ink12: 'rgba(26, 26, 26, 0.12)',
  ink06: 'rgba(26, 26, 26, 0.06)',

  // --- Tints, mixed from the five. Fills and hovers only ---
  rosePinkTint: '#FDE3E6',
  rosePinkPress: '#E9838D',
  limewashTint: '#E7E5E1',
  limewashDeep: '#8E8A83',
  lilacTint: '#EAE2F5',
  matchaTint: '#E8EEDF',

  // --- Materials seen in the café, not brand colours.
  //     Never a fill for graphics ---
  materialSageCeramic: '#8FBFA8',
  materialTerrazzo: '#F6EDE7',
} as const;

/**
 * Semantic aliases. Components should reach for these rather than naming a
 * colour directly, so a palette change stays in this file.
 */
export const surface = {
  page: brand.cream,
  card: brand.white,
  panel: brand.roseWash,
  muted: brand.limewashTint,
  ground: brand.greyLimewash,
  inverse: brand.ink,
} as const;

export const text = {
  body: brand.ink,
  muted: brand.ink70,
  faint: brand.ink45,
  accent: brand.rosePinkDeep,
  onDark: brand.cream,
  onPink: brand.ink,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const shadow = {
  none: 'none',
  hairline: `0 0 0 1px ${brand.ink12}`,
  insetHairline: `inset 0 0 0 1px ${brand.ink12}`,
  soft: '0 1px 2px rgba(26,26,26,.05), 0 6px 18px rgba(26,26,26,.05)',
  lift: '0 2px 4px rgba(26,26,26,.06), 0 16px 40px rgba(26,26,26,.08)',
} as const;

export const motion = {
  fast: '150ms',
  base: '240ms',
  slow: '400ms',
  easeStandard: 'cubic-bezier(.4,0,.2,1)',
  easeOutSoft: 'cubic-bezier(.16,1,.3,1)',
} as const;
