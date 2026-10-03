import type { MetadataRoute } from 'next';
import { LANGS } from '@/i18n/config';
import { RETAIL_COLLECTIONS } from '@/features/shop/retail';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easybeans.es';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // Product pages are omitted: the catalog is live, so a static sitemap would
  // advertise items that may already be off sale.
  // /menu is not listed: it redirects to /order, which is the menu now.
  const paths = [
    '',
    '/order',
    '/shop',
    ...RETAIL_COLLECTIONS.map((slug) => `/shop/${slug}`),
    '/about',
  ];

  return LANGS.flatMap((lang) =>
    paths.map((path) => ({
      url: `${siteUrl}/${lang}${path}`,
      lastModified: now,
      changeFrequency:
        path === '/order' || path.startsWith('/shop')
          ? ('weekly' as const)
          : ('monthly' as const),
      priority: path === '' ? 1 : 0.7,
      // Each URL advertises its counterpart so search engines pair the locales.
      alternates: {
        languages: Object.fromEntries(
          LANGS.map((code) => [code, `${siteUrl}/${code}${path}`]),
        ),
      },
    })),
  );
}
