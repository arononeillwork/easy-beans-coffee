import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LANGS, isLang } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';
import { getPriceBookOrEmpty } from '@/server/square/priceCache';
import { MenuView } from '@/features/menu/client/MenuView';

/**
 * The board itself is local, so nothing here waits on Square to draw a menu.
 * What is regenerated is the price column: hourly at the edge, over a snapshot
 * the server only re-reads once a café day. See server/square/priceCache.
 */
export const revalidate = 3600;

/** Both locales prerender — the catalog is the only request-shaped input. */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = getDictionary(lang);
  // This is the menu as well as the ordering page — /menu redirects here — so
  // the title leads with the word people actually search for.
  return {
    title: `${t.menuPage.eyebrow} · ${t.order.title}`,
    description: `${t.menuPage.headline} ${t.order.subtitle}`,
    alternates: {
      canonical: `/${lang}/order`,
      languages: { es: '/es/order', en: '/en/order' },
    },
  };
}

/**
 * The menu and collection ordering, one page: the drink studio.
 *
 * What we serve, how it is described and how it is photographed ships with the
 * site (features/menu, public/media/drinks). Square is asked only what things
 * cost, once a day, and the answer is handed down already resolved so the page
 * prerenders with prices in the HTML. An unreachable Square costs the numbers,
 * never the menu. Payment still happens on Square-hosted checkout, and
 * packaged goods still live at /shop.
 */
export default async function OrderPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const prices = await getPriceBookOrEmpty();

  return <MenuView initialPrices={prices} />;
}
