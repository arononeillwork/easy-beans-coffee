/**
 * TikTok's mark is not in @mui/icons-material, so it lives here as plain SVG.
 * Single-colour (currentColor) rather than the brand's cyan/red split: the
 * logo sits inside our own pills and chips, where two extra colours would
 * break the five-colour palette.
 */
export function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M16.5 2h-3.1v13.6a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.04.78.12v-3.1a5.9 5.9 0 0 0-.78-.06 5.7 5.7 0 1 0 5.7 5.7V9.1a7 7 0 0 0 4.1 1.32V7.33a4 4 0 0 1-4.1-3.9V2Z" />
    </svg>
  );
}
