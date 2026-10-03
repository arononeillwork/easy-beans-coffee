import 'server-only';
import { en, type SiteContent } from './content/en';
import { es } from './content/es';
import type { Lang } from './config';

export type { SiteContent };

/**
 * Server-only copy lookup. The `server-only` guard is the thing that keeps the
 * win from regressing: both dictionaries stay out of the browser bundle, and
 * only the active locale's copy crosses the RSC boundary as serialized props.
 */
export function getDictionary(lang: Lang): SiteContent {
  return lang === 'en' ? en : es;
}
