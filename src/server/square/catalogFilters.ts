import 'server-only';
import { normalizeName } from '@/features/shop/retail';
import { getCatalogExcludeRulesEnv } from '../env';

/**
 * Name rules for catalog entries that must never reach the site.
 *
 * Square stays the single source of truth, but a working POS also carries
 * scratch entries — "TEST latte", "DO NOT USE — old bundle" — that the café
 * wants to keep in Square and hide here — as do the till's promo shortcuts.
 * `SQUARE_EXCLUDE_RULES` is a comma- or
 * newline-separated list of `<op>:<text>` rules:
 *
 *   SQUARE_EXCLUDE_RULES="starts:test, contains:do not use, equals:zz"
 *
 * `op` is one of starts | ends | contains | equals; an entry with no recognised
 * op is read whole as a `starts` rule, so `test` and `starts:test` are the same
 * rule. Matching ignores case, accents and surrounding whitespace, so
 * `starts:test` drops "Test", "TEST FLAT WHITE" and " Tést v2".
 *
 * Unset falls back to {@link DEFAULT_EXCLUDE_RULES}; set the variable to an
 * empty string to read the catalog unfiltered.
 */

export type ExcludeOp = 'starts' | 'ends' | 'contains' | 'equals';

export interface ExcludeRule {
  op: ExcludeOp;
  /** Already normalized, so matching is a plain string comparison. */
  text: string;
}

/**
 * Scratch entries, the counter-only promos, and the counter-only drinks. A
 * promo is a till shortcut for a deal already made in person ("PROMO (
 * Croissant + Cafe)"); on the menu it reads as a product nobody can order, so
 * it stays in Square and off the site. "Cafe con Leche" is the same case from
 * the other direction — it is rung up at the counter, but the site's Classics
 * already sell it under the drink actually made.
 *
 * The drink rule is `equals` rather than `starts` on purpose: it hides that one
 * entry and leaves anything built on the name ("Cafe con Leche Doble") to be
 * decided on its own.
 */
export const DEFAULT_EXCLUDE_RULES = 'starts:test, starts:promo, equals:cafe con leche';

const OPS: readonly string[] = ['starts', 'ends', 'contains', 'equals'];

export function parseExcludeRules(raw: string): ExcludeRule[] {
  return raw.split(/[,\n]/).flatMap((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return [];

    const separator = trimmed.indexOf(':');
    const candidateOp = separator > 0 ? trimmed.slice(0, separator).trim().toLowerCase() : '';
    const known = OPS.includes(candidateOp);
    const text = normalizeName(known ? trimmed.slice(separator + 1) : trimmed);

    // An empty needle would match every name; drop the rule rather than the menu.
    if (!text) return [];
    return [{ op: known ? (candidateOp as ExcludeOp) : 'starts', text }];
  });
}

let cache: { raw: string; rules: ExcludeRule[] } | null = null;

/** Rules currently in force, parsed once per distinct env value. */
export function excludeRules(): ExcludeRule[] {
  const raw = getCatalogExcludeRulesEnv() ?? DEFAULT_EXCLUDE_RULES;
  if (!cache || cache.raw !== raw) {
    cache = { raw, rules: parseExcludeRules(raw) };
  }
  return cache.rules;
}

export function isExcludedName(name: string, rules: ExcludeRule[] = excludeRules()): boolean {
  if (rules.length === 0) return false;
  const value = normalizeName(name);
  if (!value) return false;
  return rules.some((rule) => matches(value, rule));
}

function matches(value: string, rule: ExcludeRule): boolean {
  switch (rule.op) {
    case 'starts':
      return value.startsWith(rule.text);
    case 'ends':
      return value.endsWith(rule.text);
    case 'contains':
      return value.includes(rule.text);
    case 'equals':
      return value === rule.text;
  }
}
