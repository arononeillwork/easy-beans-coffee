/**
 * The competition poster, art-directed per screen shape: the tall version on
 * phones and portrait screens, the wide one everywhere else. A plain <picture>
 * because next/image cannot swap the source by media query.
 */
export function CompetitionPoster({
  alt,
  fit = 'width',
  priority = true,
}: {
  alt: string;
  /** `width`: full width, natural height. `screen`: fill the viewport, no crop. */
  fit?: 'width' | 'screen';
  priority?: boolean;
}) {
  const imgStyle: React.CSSProperties =
    fit === 'screen'
      ? { width: '100vw', height: '100vh', objectFit: 'contain', display: 'block' }
      : { width: '100%', height: 'auto', display: 'block' };

  return (
    <picture>
      <source
        media="(max-width: 899px), (orientation: portrait)"
        srcSet="/media/competition/competition-portrait.webp"
        type="image/webp"
        width={1520}
        height={2688}
      />
      <source srcSet="/media/competition/competition-landscape.webp" type="image/webp" width={2688} height={1520} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/media/competition/competition-landscape.png"
        alt={alt}
        width={2688}
        height={1520}
        fetchPriority={priority ? 'high' : 'auto'}
        style={imgStyle}
      />
    </picture>
  );
}
