'use client';

import { createTheme } from '@mui/material/styles';
import { brand, radius, shadow, text } from './brand';

const display = 'var(--font-poppins), Montserrat, sans-serif';
const body = 'var(--font-figtree), Helvetica, Arial, sans-serif';

/**
 * Site-wide MUI theme. Fonts are provided by next/font CSS variables set on
 * <html> in the root layout (--font-poppins, --font-figtree).
 *
 * Rose Pink is a fill, never a text colour — palette.primary.main is safe on
 * buttons and chips because contrastText is ink, but anything rendering pink
 * *type* must use palette.primary.dark (rosePinkDeep).
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brand.rosePink,
      dark: brand.rosePinkDeep,
      light: brand.rosePinkTint,
      contrastText: brand.ink,
    },
    secondary: {
      main: brand.matchaGreen,
      dark: brand.matchaGreenDeep,
      light: brand.matchaTint,
      contrastText: brand.white,
    },
    background: { default: brand.cream, paper: brand.white },
    text: { primary: brand.ink, secondary: brand.ink70 },
    divider: brand.ink12,
  },
  typography: {
    fontFamily: body,
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    // Display sizes are fluid; the guidelines' 56/48 is the desktop anchor.
    h1: {
      fontFamily: display,
      fontWeight: 600,
      fontSize: 'clamp(2.75rem, 6vw, 5.25rem)',
      letterSpacing: '-0.03em',
      lineHeight: 1.02,
    },
    h2: {
      fontFamily: display,
      fontWeight: 600,
      fontSize: 'clamp(1.875rem, 3.8vw, 3.125rem)',
      letterSpacing: '-0.03em',
      lineHeight: 1.06,
    },
    h3: {
      fontFamily: display,
      fontWeight: 500,
      fontSize: 'clamp(1.75rem, 3.2vw, 2.625rem)',
      letterSpacing: '-0.025em',
      lineHeight: 1.12,
    },
    h4: {
      fontFamily: display,
      fontWeight: 500,
      fontSize: '1.5rem',
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h5: {
      fontFamily: display,
      fontWeight: 500,
      fontSize: '1.25rem',
      letterSpacing: '-0.015em',
      lineHeight: 1.25,
    },
    // Eyebrow. Uppercase is reserved for eyebrows and tags — never sentences.
    h6: {
      fontFamily: body,
      fontWeight: 600,
      fontSize: '0.6875rem',
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      lineHeight: 1,
    },
    subtitle1: { fontFamily: body, fontWeight: 500, fontSize: '1.125rem', lineHeight: 1.55 },
    body1: { fontWeight: 400, fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontWeight: 400, fontSize: '0.9375rem', lineHeight: 1.6 },
    caption: { fontWeight: 400, fontSize: '0.8125rem', lineHeight: 1.5 },
    button: { fontFamily: body, fontWeight: 500, textTransform: 'none', letterSpacing: 0 },
    overline: {
      fontWeight: 600,
      fontSize: '0.6875rem',
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
    },
  },
  shape: { borderRadius: radius.md },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.pill,
          paddingInline: 30,
          paddingBlock: 15,
          fontSize: '1rem',
          lineHeight: 1,
        },
        sizeSmall: { paddingInline: 20, paddingBlock: 10, fontSize: '0.9375rem' },
        outlined: { borderWidth: 1 },
        containedPrimary: {
          '&:hover': { backgroundColor: brand.rosePinkPress },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { rounded: { borderRadius: radius.lg } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: radius.lg, backgroundImage: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radius.pill, fontWeight: 500 },
      },
    },
    MuiLink: {
      defaultProps: { underline: 'hover' },
      styleOverrides: {
        root: { color: text.accent, textDecorationColor: brand.rosePink },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        // Focus ring uses the text-safe pink so it reads against cream.
        ':focus-visible': { outline: `2px solid ${brand.rosePinkDeep}`, outlineOffset: 2 },
      },
    },
  },
});

export { shadow };
