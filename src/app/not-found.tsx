import Link from 'next/link';
import { DEFAULT_LANG } from '@/i18n/config';
import { brand } from '@/theme/brand';
import { fontVariables } from '@/theme/fonts';

/**
 * Global 404.
 *
 * The site has two root layouts — `(site)/[lang]` and `(admin)` — so a 404
 * raised above either of them has no root to render into, and Next falls back
 * to the Pages-router error document. That fallback is what breaks
 * prerendering with "<Html> should not be imported outside of pages/_document".
 * Supplying this file, with its own `<html>`/`<body>`, is the documented fix.
 *
 * Deliberately plain: no MUI, no theme provider, no dictionary. A 404 should
 * be the fastest page on the site, and it has to render even when the thing
 * that failed is the layout above it.
 */
export default function NotFound() {
  return (
    <html lang={DEFAULT_LANG} className={fontVariables}>
      <body style={{ margin: 0, backgroundColor: brand.cream, color: brand.ink }}>
        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'var(--font-figtree), system-ui, sans-serif',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: brand.rosePinkDeep,
            }}
          >
            Easy Beans Coffee
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-poppins), system-ui, sans-serif',
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            404
          </h1>
          <p style={{ margin: 0, maxWidth: '32ch', color: brand.ink70 }}>
            Esta página no existe · This page doesn’t exist
          </p>
          <Link
            href={`/${DEFAULT_LANG}`}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '999px',
              backgroundColor: brand.rosePink,
              color: brand.ink,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Volver al inicio · Back home
          </Link>
        </main>
      </body>
    </html>
  );
}
