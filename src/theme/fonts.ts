import localFont from 'next/font/local';

/**
 * Brand Edition 01 typefaces, self-hosted. The files are the Latin subsets
 * from @fontsource (SIL Open Font License), checked in under ./fonts so a
 * build never depends on reaching Google Fonts — and the browser fetches them
 * from our own domain. Shared by both root layouts (site and admin).
 */
export const poppins = localFont({
  src: [
    { path: './fonts/poppins-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/poppins-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
});

export const figtree = localFont({
  src: [
    { path: './fonts/figtree-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/figtree-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/figtree-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-figtree',
  display: 'swap',
});

export const fontVariables = `${poppins.variable} ${figtree.variable}`;
