import type { Metadata, Viewport } from 'next';
import { fontVariables } from '@/theme/fonts';

/**
 * Bare root layout for in-café digital screens: no header, footer, cart or
 * popups — just the content filling the display.
 */
export const metadata: Metadata = {
  title: 'Easy Beans Coffee',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#F7ECE4' };

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body style={{ margin: 0, background: '#F3E8DC', overflow: 'hidden', cursor: 'none' }}>{children}</body>
    </html>
  );
}
