import 'server-only';
import { randomInt } from 'node:crypto';

/**
 * Codes are read off a phone screen and typed at a counter, so the alphabet
 * drops every pair people mix up: O/0, I/1/L, S/5, Z/2 keeps Z but loses 2's
 * lookalike. What is left is unambiguous when handwritten on a receipt.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRTUVWXY346789';
const CODE_LENGTH = 6;
const PREFIX = 'EB';

/** ~387 million codes — collisions are handled by a retry, not by praying. */
export function generateOfferCode(): string {
  let body = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${PREFIX}-${body}`;
}

/**
 * Accepts what a customer actually types — lowercase, stray spaces, the dash
 * missing, or the prefix forgotten entirely — and returns the stored form.
 */
export function normaliseOfferCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[\s-]/g, '');
  const body = cleaned.startsWith(PREFIX) ? cleaned.slice(PREFIX.length) : cleaned;
  return `${PREFIX}-${body}`;
}
