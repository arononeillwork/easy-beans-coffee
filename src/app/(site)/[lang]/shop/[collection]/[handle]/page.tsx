import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LANGS, isLang } from '@/i18n/config';
import { getCatalogOrNull } from '@/server/square/catalogCache';
import { ProductDetail } from '@/features/shop/client/ProductDetail';
import { ProductFallback } from '@/features/shop/client/ProductFallback';
import { RETAIL_COLLECTIONS, shopCollections } from '@/features/shop/retail';
import type { MenuResponse, RetailCollectionSlug } from '@/features/order/types';

/** Stock and prices are regenerated in the background every five minutes. */
export const revalidate = 300;

/**
 * Every product in the catalog is prerendered, so a click from a collection
 * grid lands on finished HTML. The catalog is live, so a product seeded after
 * the last regeneration is not in this list — `dynamicParams` (on by default)
 * renders it on demand and it joins the prerendered set from then on.
 */
export async function generateStaticParams() {
  const menu = await getCatalogOrNull();
  if (!menu) return [];

  const { categories, isPlaceholder } = shopCollections(menu);
  if (isPlaceholder) return [];

  return LANGS.flatMap((lang) =>
    categories.flatMap((category) =>
      category.retailSlug
        ? category.items.flatMap((item) =>
            item.slug ? [{ lang, collection: category.retailSlug!, handle: item.slug }] : [],
          )
        : [],
    ),
  );
}

/** The product as the given catalog has it, or undefined if it is not in there. */
function resolveProduct(menu: MenuResponse, collection: RetailCollectionSlug, handle: string) {
  const shop = shopCollections(menu);
  const category = shop.categories.find((c) => c.retailSlug === collection);
  const item = category?.items.find((i) => i.slug === handle);
  if (!item) return undefined;

  return {
    item,
    related: (category?.items ?? []).filter((i) => i.id !== item.id).slice(0, 4),
    isPlaceholder: shop.isPlaceholder,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; collection: string; handle: string }>;
}): Promise<Metadata> {
  const { lang, collection, handle } = await params;
  if (!isLang(lang)) return {};
  if (!RETAIL_COLLECTIONS.includes(collection as RetailCollectionSlug)) return {};

  const menu = await getCatalogOrNull();
  // No catalog on the server means the page fills itself in client-side; there
  // is nothing to describe yet, and the layout's defaults still apply.
  if (!menu) return {};

  const product = resolveProduct(menu, collection as RetailCollectionSlug, handle);
  if (!product) return {};

  return {
    title: product.item.name,
    description: product.item.description,
    alternates: {
      canonical: `/${lang}/shop/${collection}/${handle}`,
      languages: Object.fromEntries(
        LANGS.map((code) => [code, `/${code}/shop/${collection}/${handle}`]),
      ),
    },
    ...(product.item.imageUrl ? { openGraph: { images: [{ url: product.item.imageUrl }] } } : {}),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ lang: string; collection: string; handle: string }>;
}) {
  const { lang, collection, handle } = await params;
  if (!isLang(lang)) notFound();
  if (!RETAIL_COLLECTIONS.includes(collection as RetailCollectionSlug)) notFound();
  const slug = collection as RetailCollectionSlug;

  const menu = await getCatalogOrNull();
  // Square unreachable or unconfigured at render time — resolve in the browser
  // rather than serving placeholder stock as if it were the real product.
  if (!menu) return <ProductFallback collection={slug} handle={handle} />;

  const product = resolveProduct(menu, slug, handle);
  // The catalog is live, so a product can disappear between render and click.
  // Treating that as "not found" is honest; the collection page still lists
  // whatever is actually on sale.
  if (!product) notFound();

  return (
    <ProductDetail
      item={product.item}
      collection={slug}
      related={product.related}
      isPlaceholder={product.isPlaceholder}
    />
  );
}
