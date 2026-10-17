import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { fontVariables } from '@/theme/fonts';

/**
 * Bare root layout for the in-café display: no header, footer, cart, offer bar
 * or popups — just the poster filling the screen.
 */
export const metadata: Metadata = {
  title: 'Easy Beans Coffee',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#FAF0E5' };

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <head>
        <style>{'*,*::before,*::after{box-sizing:border-box}'}</style>
      </head>
      <body style={{ margin: 0, background: '#FAF0E5', overflow: 'hidden', cursor: 'none', fontFamily: 'var(--font-figtree), sans-serif' }}>
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
