import { Figtree, Poppins } from 'next/font/google';

/**
 * Brand Edition 01 typefaces. Shared by both root layouts (site and admin) so
 * the font files are fetched and subset once at build time.
 */
export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

export const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-figtree',
  display: 'swap',
});

export const fontVariables = `${poppins.variable} ${figtree.variable}`;
