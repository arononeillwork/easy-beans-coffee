import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Providers } from '@/app/providers';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FirstVisitPopup } from '@/components/marketing/FirstVisitPopup';
import { CartProvider } from '@/features/order/client/CartProvider';
import { CartDrawer } from '@/features/order/client/CartDrawer';
import { LANGS, isLang } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';
import { brand } from '@/theme/brand';
import { fontVariables } from '@/theme/fonts';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easybeans.es';

/** Both locales are prerendered at build time — nothing here is request-dependent. */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: brand.cream,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = getDictionary(lang);

  return {
    metadataBase: new URL(siteUrl),
    title: { default: t.meta.title, template: '%s · Easy Beans Coffee' },
    description: t.meta.description,
    icons: { icon: '/favicon.png' },
    // Google Search Console ownership — carried over from the old index.html,
    // where both tags were added. Removing either un-verifies that property.
    verification: {
      google: ['5wJ6LO5FE6k_gqdzrvbkLb5FzkO04-RaXGdRm29dw_s', 'XtRjZ4pGpzk3aWLANTGvWxNBSlYAQaINMgPgsSIRYTk'],
    },
    alternates: {
      canonical: `/${lang}`,
      languages: { es: '/es', en: '/en' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Easy Beans Coffee',
      locale: lang === 'en' ? 'en_IE' : 'es_ES',
      alternateLocale: lang === 'en' ? 'es_ES' : 'en_IE',
      // JPEG at the OG spec ratio — not every scraper accepts WebP.
      images: [{ url: '/media/og-hero.jpg', width: 1200, height: 630 }],
    },
  };
}

/**
 * Root layout for the public site. Admin has its own (see `(admin)/admin`)
 * because it ships a separate theme and never needs the café shell.
 */
export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <html lang={lang} className={fontVariables}>
      <body>
        <AppRouterCacheProvider>
          <Providers lang={lang} t={t}>
            <CartProvider>
              <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
                <AnnouncementBar />
                <Header />
                <Box component="main" sx={{ flexGrow: 1 }}>
                  {children}
                </Box>
                <Footer t={t} lang={lang} />
                <FirstVisitPopup />
                <CartDrawer />
              </Box>
            </CartProvider>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
