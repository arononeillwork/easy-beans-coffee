'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Lang } from './config';
import type { SiteContent } from './content/en';

interface LanguageContextValue {
  lang: Lang;
  t: SiteContent;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Locale comes from the route segment, so the server picks the dictionary and
 * hands it down. There is no `setLang` — switching language is a navigation
 * (see LangToggle), which is what lets every page prerender per locale.
 *
 * Client islands still read copy through `useLanguage()`; they receive the
 * already-serialized active dictionary rather than importing both.
 */
export function LanguageProvider({
  lang,
  t,
  children,
}: {
  lang: Lang;
  t: SiteContent;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ lang, t }), [lang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useLanguage must be used within a <LanguageProvider>');
  }
  return value;
}
