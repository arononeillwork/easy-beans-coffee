'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useLanguage } from '@/i18n/LanguageProvider';
import { LANGS, isLang, type Lang } from '@/i18n/config';

/**
 * Switching language is a navigation, not state: `/es/menu` ↔ `/en/menu`.
 * That is what lets both locales be prerendered and cached as static HTML.
 */
export function LangToggle() {
  const { lang } = useLanguage();
  const pathname = usePathname();

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={lang}
      aria-label="Language"
      sx={{
        '& .MuiToggleButton-root': {
          border: 'none',
          px: 1,
          py: 0.25,
          fontSize: '0.72rem',
          letterSpacing: '0.18em',
          color: 'text.secondary',
          '&.Mui-selected': {
            color: 'text.primary',
            backgroundColor: 'transparent',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
          },
        },
      }}
    >
      {LANGS.map((code) => (
        <ToggleButton
          key={code}
          value={code}
          component={Link}
          href={swapLocale(pathname, code)}
          hrefLang={code}
          aria-label={code === 'es' ? 'Español' : 'English'}
          selected={code === lang}
        >
          {code.toUpperCase()}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
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
