/**
 * The in-café TV (easybeanscoffee.com/display-menu), turned vertical. For now
 * it shows one picture and nothing else: the coffee + Chia Seed Parfait offer
 * poster in its vertical version (2160×3840), filling the whole screen, and
 * upright even when the TV still sends the browser a landscape picture (see
 * Poster). It reloads itself when the picture changes (ReloadOnChange).
 *
 * The widescreen version (chia-parfait-offer-en-wide.jpg) is kept for when the
 * TV goes back to landscape, and the menu board (features/menu/display/
 * DisplayBoard) is unchanged for when the offer comes off.
 */
import { Poster } from './Poster';
import { ReloadOnChange } from './ReloadOnChange';

const POSTER = '/media/display/chia-parfait-offer-en-vertical.jpg';

export default function DisplayMenuPage() {
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <Poster src={POSTER} alt="Special offer: buy any coffee and get a Chia Seed Parfait for only €3 extra" />
      <ReloadOnChange poster={POSTER} />
    </main>
  );
}
