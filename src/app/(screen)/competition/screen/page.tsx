import { CompetitionPoster } from '@/features/competition/CompetitionPoster';

/**
 * Full-screen competition poster for the shop display. Portrait screens get
 * the tall artwork, landscape screens the wide one; it scales to fit without
 * cropping. The QR code is baked into both images.
 */
export default function CompetitionScreenPage() {
  return (
    <main style={{ width: '100vw', height: '100vh', display: 'grid', placeItems: 'center' }}>
      <CompetitionPoster
        fit="screen"
        alt="Win €10 on us, every month. Follow @easy.beans.coffee and sign up for news & offers. Scan to enter."
      />
    </main>
  );
}
