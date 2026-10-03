import { createTheme } from '@mui/material/styles';

/**
 * Visual tokens for the /admin task board: rose panels on a limewash-green page,
 * matcha for "done", and one accent each for the two hand-driven flags —
 * amber for the star, lilac for a pin.
 *
 * Site fonts come from the next/font CSS variables set on <html> in the root
 * layout, with a system stack behind them so the board never waits on a font.
 */
export const ink = '#0F1A15';
export const muted = '#6C7C74';
export const line = '#E3E9E4';
export const page = '#F2F5F1';
export const card = '#FFFFFF';

export const rose = '#F8E2E4';
export const roseMid = '#F1C9CE';
export const roseDeep = '#E0A8AF';
export const roseInk = '#7A4E55';

export const matcha = '#4FA25A';
export const red = '#E0473F';
export const amber = '#DE9327';
export const slate = '#92A29A';

/** Pinned rows get a lilac outline — the only lilac on the board, so it reads instantly. */
export const lilac = '#B7A3D8';
export const lilacDeep = '#7C63A8';
export const lilacTint = '#F3EEFA';

export const softShadow = '0 1px 2px rgba(15,26,21,.05), 0 10px 28px -18px rgba(15,26,21,.35)';
export const hoverShadow = '0 10px 26px -12px rgba(15,26,21,.3)';

export type GroupTint = {
  /** Panel and sticky-title background. Opaque, so rows scroll cleanly under the title. */
  bg: string;
  /** Border and count-badge fill — the same hue, a shade deeper. */
  edge: string;
  /** Title text. Dark enough to read on `bg`. */
  ink: string;
};

/**
 * One light tint per group, so a category reads as a note running behind its
 * jobs.
 */
export const groupTint: Record<string, GroupTint> = {
  // Each `ink` also fills its filter chip when selected, so every
  // one is dark enough to carry white text.
  legal: { bg: '#E7ECF3', edge: '#C9D4E3', ink: '#2F4C73' },
  staff: { bg: '#E1F2EE', edge: '#BFE0D8', ink: '#1F6559' },
  shop: { bg: '#FCEBDF', edge: '#F0D0BA', ink: '#8A4520' },
  buying: { bg: '#F9F1D8', edge: '#ECDCA8', ink: '#6F5610' },
  menu: { bg: '#E7F3E2', edge: '#CAE3C1', ink: '#3D6A33' },
  tech: { bg: '#ECEDFB', edge: '#D2D5F2', ink: '#3E418C' },
  design: { bg: '#F3EBFA', edge: '#DDCDEF', ink: '#5E3A86' },
  content: { bg: '#E2F1F9', edge: '#BFDFEF', ink: '#1D5E82' },
  marketing: { bg: '#FBE6F0', edge: '#F0C6DA', ink: '#8A2F5D' },
  ideas: { bg: '#F1F4DA', edge: '#DCE2AA', ink: '#4E5A12' },
};

/** Category accent — the dot on chips and row pills. One hue per category. */
export const areaColor: Record<string, string> = {
  legal: '#2F4C73',
  staff: '#21907F',
  shop: '#D46A2E',
  buying: '#C2961C',
  menu: '#4C9A3F',
  tech: '#5257C8',
  design: '#8E52C4',
  content: '#2A8FC4',
  marketing: '#CC4A8B',
  ideas: '#8A9A1B',
};

/** For a group key the map doesn't know — a hand-edited row, say. */
export const fallbackTint: GroupTint = { bg: '#F7F9F6', edge: line, ink: ink };

export function tintOf(key: string): GroupTint {
  return groupTint[key] ?? fallbackTint;
}

const body = 'var(--font-figtree), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const display = 'var(--font-poppins), Montserrat, sans-serif';

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: roseMid, light: rose, dark: roseInk, contrastText: ink },
    secondary: { main: matcha, dark: '#3E8447', light: '#E8F1E6', contrastText: '#fff' },
    success: { main: matcha, contrastText: '#fff' },
    warning: { main: amber },
    error: { main: red },
    background: { default: page, paper: card },
    text: { primary: ink, secondary: muted, disabled: '#A8B3AC' },
    divider: line,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: body,
    fontSize: 15,
    fontWeightMedium: 550,
    fontWeightBold: 650,
    h1: {
      fontFamily: display,
      fontWeight: 600,
      fontSize: 'clamp(1.875rem, 8vw, 2.625rem)',
      letterSpacing: '-0.035em',
      lineHeight: 1,
    },
    h2: { fontFamily: display, fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.015em' },
    overline: {
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.13em',
      lineHeight: 1.4,
      textTransform: 'uppercase',
    },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 9 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: card,
          '& fieldset': { borderColor: line },
          '&:hover fieldset': { borderColor: '#C9D3CB' },
          '&.Mui-focused fieldset': { borderColor: matcha, borderWidth: 1 },
        },
        input: { '&::placeholder': { color: '#A8B3AC', opacity: 1 } },
      },
    },
    MuiMenu: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        paper: {
          border: `1px solid ${line}`,
          borderRadius: 14,
          boxShadow: '0 18px 40px -14px rgba(15,26,21,.35)',
          minWidth: 172,
        },
        list: { padding: 6 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          gap: 9,
          fontSize: 14,
          '&.Mui-selected': { fontWeight: 600, backgroundColor: '#F1F5F1' },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(15,26,21,.92)',
          fontSize: 12,
          borderRadius: 8,
          padding: '6px 10px',
        },
      },
    },
  },
});
