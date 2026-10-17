'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import { useLanguage } from '@/i18n/LanguageProvider';
import { LANGS, isLang, type Lang } from '@/i18n/config';
import { brand, motion } from '@/theme/brand';
import { Flag } from '@/components/icons/Flags';

const NAMES: Record<Lang, string> = { es: 'Español', en: 'English' };

/**
 * Switching language is a navigation, not state: `/es/menu` ↔ `/en/menu`.
 * That is what lets both locales be prerendered and cached as static HTML.
 *
 * Shown as flags: flags only in the desktop header; `labelled` (the phone
 * menu) puts the language name beside each flag.
 */
export function LangToggle({ labelled = false }: { labelled?: boolean }) {
  const { lang } = useLanguage();
  const pathname = usePathname();

  return (
    <Box
      component="nav"
      aria-label="Language"
      // Language names are already in their own language; never translate them.
      translate="no"
      sx={{ display: 'flex', alignItems: 'center', gap: labelled ? 1 : 0.5 }}
    >
      {LANGS.map((code) => {
        const current = code === lang;
        return (
          <Box
            key={code}
            component={Link}
            href={swapLocale(pathname, code)}
            hrefLang={code}
            lang={code}
            aria-label={NAMES[code]}
            aria-current={current ? 'true' : undefined}
            title={NAMES[code]}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              p: labelled ? '6px 14px 6px 6px' : '3px',
              borderRadius: 999,
              textDecoration: 'none',
              color: brand.ink,
              fontSize: '0.9375rem',
              fontWeight: current ? 600 : 400,
              border: labelled ? `1px solid ${current ? brand.ink : brand.ink12}` : 'none',
              boxShadow: !labelled && current ? `0 0 0 2px ${brand.rosePink}` : 'none',
              opacity: current || labelled ? 1 : 0.55,
              transition: `opacity ${motion.fast} linear, box-shadow ${motion.fast} linear`,
              '&:hover': { opacity: 1 },
            }}
          >
            <Flag lang={code} size={labelled ? 24 : 22} />
            {labelled && NAMES[code]}
          </Box>
        );
      })}
    </Box>
  );
}

/** `/en/shop/beans` + `es` → `/es/shop/beans`. Falls back to the locale root. */
function swapLocale(pathname: string, next: Lang): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isLang(segments[0])) {
    segments[0] = next;
    return `/${segments.join('/')}`;
  }
  return `/${next}`;
}
