/**
 * The in-café TV (easybeanscoffee.com/display-menu), now turned vertical. For
 * now it shows one picture and nothing else: the coffee + Chia Seed Parfait
 * offer poster in its vertical version (2160×3840), filling the whole screen.
 *
 * The widescreen version (chia-parfait-offer-en-wide.jpg) is kept for when the
 * TV goes back to landscape, and the menu board (features/menu/display/
 * DisplayBoard) is unchanged for when the offer comes off.
 */
const POSTER = '/media/display/chia-parfait-offer-en-tall.jpg';

export default function DisplayMenuPage() {
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- one full-screen picture, shown as it is */}
      <img src={POSTER} alt="Special offer: buy any coffee and get a Chia Seed Parfait for only €3 extra"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    </main>
  );
}
