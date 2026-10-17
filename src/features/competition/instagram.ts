/**
 * Turns whatever someone types or pastes into a bare Instagram username:
 * "@Jane.Doe", "jane.doe", or a copied profile link like
 * "https://www.instagram.com/jane.doe?igsh=abc123" all become "jane.doe".
 * Returns null when there is no usable username in the input. Shared by the
 * form (live preview) and the API route (the value actually stored).
 */
const HANDLE_RE = /^[a-z0-9._]{1,30}$/;
const NOT_PROFILES = new Set(['p', 'reel', 'reels', 'tv', 'explore', 'accounts', 'direct', 'share']);

export function parseInstagramHandle(input: string): string | null {
  let s = input.trim();
  if (!s) return null;

  const link = s.match(/(?:instagram\.com|instagr\.am)\/([^?#\s]*)/i);
  if (link) {
    const parts = link[1].split('/').filter(Boolean);
    // instagram.com/stories/<name>/… is still a profile.
    const first = parts[0]?.toLowerCase() === 'stories' ? parts[1] : parts[0];
    if (!first || NOT_PROFILES.has(first.toLowerCase())) return null;
    s = first;
  }

  s = s.replace(/^@+/, '').toLowerCase();
  return HANDLE_RE.test(s) ? s : null;
}
