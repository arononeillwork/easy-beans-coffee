'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme/theme';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import type { Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';

/**
 * The site's client-side context floor. `lang`/`t` are resolved on the server
 * from the route segment, so only the active locale's copy is serialized here.
 */
export function Providers({
  lang,
  t,
  children,
}: {
  lang: Lang;
  t: SiteContent;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider lang={lang} t={t}>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );
}
