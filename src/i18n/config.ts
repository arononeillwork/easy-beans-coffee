/**
 * Locale lives in the URL (`/es/menu`, `/en/menu`) so every page can be
 * prerendered per language and served from cache. Spanish stays the default —
 * it is the SEO language for a café in San Pedro.
 */
export const LANGS = ['es', 'en'] as const;

export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'es';

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

/**
 * Prefixes an app-relative path with the active locale.
 * `('en', '/menu')` → `/en/menu`, `('es', '/')` → `/es`.
 */
export function localePath(lang: Lang, path: string): string {
  if (path === '/') return `/${lang}`;
  return `/${lang}${path}`;
}
