import { createTheme } from '@mui/material/styles';

/**
 * Reusable visual tokens for the admin UI — a warm "coffee" identity that ties
 * the Tasks app to the Easy Beans Coffee brand (espresso + caramel on cream).
 */
export const pageGradient =
  'radial-gradient(1200px 600px at 100% -10%, #f3e7d6 0%, rgba(243,231,214,0) 55%), ' +
  'radial-gradient(1000px 500px at -10% 110%, #ecdcc6 0%, rgba(236,220,198,0) 50%), ' +
  'linear-gradient(180deg, #f8f2e9 0%, #f1e7d8 100%)';
export const headerGradient = 'linear-gradient(135deg, #8a6650 0%, #6f4e37 55%, #543a29 100%)';
export const accentGradient = 'linear-gradient(135deg, #e0a458 0%, #c8823a 100%)';

/** Frosted-glass surface used for the sticky header. */
export const glassBg = 'rgba(255, 251, 244, 0.72)';
export const glassBorder = '1px solid rgba(111, 78, 55, 0.12)';

/** Warm-tinted shadows so depth reads as part of the palette, not grey. */
export const softShadow = '0 1px 2px rgba(74,52,40,0.05), 0 4px 14px rgba(74,52,40,0.06)';
export const hoverShadow = '0 10px 30px rgba(74,52,40,0.16)';

/** Modern warm theme for the /admin To Do app (espresso accent, caramel stars). */
export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6f4e37', light: '#8a6650', dark: '#543a29', contrastText: '#fff' },
    secondary: { main: '#d99a4e', light: '#e0a458', dark: '#c8823a' },
    background: { default: '#f4ead9', paper: '#fffdf8' },
    text: { primary: '#3b2f2a', secondary: '#7a6a5f' },
    success: { main: '#5a8a5b' },
    divider: 'rgba(59,47,42,0.10)',
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", sans-serif',
    h3: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 12, paddingTop: 10, paddingBottom: 10 } },
    },
    MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: 'rgba(111,78,55,0.04)',
          transition: 'background-color .15s ease',
          '& fieldset': { borderColor: 'transparent' },
          '&:hover fieldset': { borderColor: 'rgba(111,78,55,0.22)' },
          '&.Mui-focused': { backgroundColor: 'rgba(111,78,55,0.02)' },
          '&.Mui-focused fieldset': { borderColor: '#6f4e37', borderWidth: 1 },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: 'rgba(59,47,42,0.92)', fontSize: 12, borderRadius: 8, padding: '6px 10px' },
      },
    },
  },
});
