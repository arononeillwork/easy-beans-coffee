import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LANGS, isLang } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';
import { getCatalogOrNull } from '@/server/square/catalogCache';
import { ShopView } from '@/features/shop/client/ShopView';

/** Stock and prices are regenerated in the background every five minutes. */
export const revalidate = 300;

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
  return {
    title: t.shop.headline,
    description: t.shop.body,
    alternates: {
      canonical: `/${lang}/shop`,
      languages: { es: '/es/shop', en: '/en/shop' },
    },
  };
}

/**
 * Shop landing. Products and prices come from the live Square catalog —
 * nothing is hardcoded — and are prerendered into the HTML.
 */
export default async function ShopPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const menu = await getCatalogOrNull();

  return <ShopView initialMenu={menu} />;
}
