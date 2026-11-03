/**
 * The in-café TV (easybeanscoffee.com/display-menu). For now it shows one
 * picture and nothing else: the coffee + Chia Seed Parfait offer poster,
 * filling the whole screen. A landscape screen gets the widescreen poster, a
 * portrait one the tall poster, each made for that shape, so nothing is boxed
 * in or cut off.
 *
 * The menu board (features/menu/display/DisplayBoard) is unchanged and goes
 * back here when the offer comes off.
 */
const WIDE = '/media/display/chia-parfait-offer-en-wide.jpg';
const TALL = '/media/display/chia-parfait-offer-en.jpg';

export default function DisplayMenuPage() {
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <picture>
        <source media="(orientation: portrait)" srcSet={TALL} />
        {/* eslint-disable-next-line @next/next/no-img-element -- one full-screen picture, shown as it is */}
        <img src={WIDE} alt="Special offer: buy any coffee and get a Chia Seed Parfait for only €3 extra"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </picture>
    </main>
  );
}
