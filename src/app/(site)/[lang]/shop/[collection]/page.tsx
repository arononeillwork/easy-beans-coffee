import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LANGS, isLang } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';
import { getCatalogOrNull } from '@/server/square/catalogCache';
import { CollectionView } from '@/features/shop/client/CollectionView';
import { RETAIL_COLLECTIONS } from '@/features/shop/retail';
import type { RetailCollectionSlug } from '@/features/order/types';

/** Stock and prices are regenerated in the background every five minutes. */
export const revalidate = 300;

const COPY_KEY: Record<RetailCollectionSlug, 'beans' | 'matchaChai' | 'bundles'> = {
  beans: 'beans',
  'matcha-chai': 'matchaChai',
  'gift-sets': 'bundles',
};

/** Three collections × two locales — a bounded set, so all six prerender. */
export function generateStaticParams() {
  return LANGS.flatMap((lang) =>
    RETAIL_COLLECTIONS.map((collection) => ({ lang, collection })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; collection: string }>;
}): Promise<Metadata> {
  const { lang, collection } = await params;
  if (!isLang(lang) || !RETAIL_COLLECTIONS.includes(collection as RetailCollectionSlug)) {
    return {};
  }
  const copy = getDictionary(lang).shop.categories[COPY_KEY[collection as RetailCollectionSlug]];
  return {
    title: copy.name,
    description: copy.blurb,
    alternates: {
      canonical: `/${lang}/shop/${collection}`,
      languages: Object.fromEntries(
        LANGS.map((code) => [code, `/${code}/shop/${collection}`]),
      ),
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ lang: string; collection: string }>;
}) {
  const { lang, collection } = await params;
  if (!isLang(lang)) notFound();
  if (!RETAIL_COLLECTIONS.includes(collection as RetailCollectionSlug)) notFound();
  const menu = await getCatalogOrNull();

  return <CollectionView slug={collection as RetailCollectionSlug} initialMenu={menu} />;
}
