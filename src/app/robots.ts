import type { MetadataRoute } from 'next';
import { LANGS } from '@/i18n/config';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easybeans.es';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Order status/confirmation pages are private (token URLs) and /admin is
      // internal. The order paths are locale-prefixed, so both trees are listed.
      disallow: [
        ...LANGS.flatMap((lang) => [
          `/${lang}/order/status/`,
          `/${lang}/order/confirmation`,
        ]),
        '/admin',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
