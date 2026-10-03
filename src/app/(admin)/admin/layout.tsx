import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { fontVariables } from '@/theme/fonts';

/**
 * Admin's own root layout. It sits outside the `(site)` locale tree because the
 * board is internal, single-language, and ships its own MUI theme — so it never
 * loads the café shell, the cart, or the site dictionaries.
 */
export const metadata: Metadata = {
  title: 'Task board · Easy Beans Coffee',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
