import Image from 'next/image';

/**
 * The in-café TV (easybeanscoffee.com/display-menu). For now it shows one
 * picture and nothing else: the coffee + Chia Seed Parfait offer poster,
 * whole, over a blurred copy of itself so a TV of any shape is filled.
 *
 * The menu board (features/menu/display/DisplayBoard) is unchanged and goes
 * back here when the offer comes off.
 */
const POSTER = '/media/display/chia-parfait-offer-en.jpg';

export default function DisplayMenuPage() {
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <Image src={POSTER} alt="" aria-hidden fill sizes="100vw" priority
        style={{ objectFit: 'cover', filter: 'blur(40px) brightness(0.7)', transform: 'scale(1.15)' }} />
      <Image src={POSTER} alt="Special offer: buy any coffee and get a Chia Seed Parfait for only €3 extra" fill sizes="100vw" priority
        style={{ objectFit: 'contain' }} />
    </main>
  );
}
