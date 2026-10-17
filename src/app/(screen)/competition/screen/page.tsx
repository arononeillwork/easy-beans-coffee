import { CompetitionPoster } from '@/features/competition/CompetitionPoster';

/**
 * In-café display version of the competition poster (TV / monitor). Same
 * layout as the web page, full screen, QR code always visible. Open
 * easybeanscoffee.com/competition/screen on the display's browser.
 */
export default function CompetitionScreenPage() {
  return <CompetitionPoster lang="en" variant="screen" />;
}
