// Values the stand-in feeds serve; shared by mockFeeds.mjs and feeds.spec.ts.
// Deliberately unlike the café's real data, so a pass can only come from the feed.
export const FIXTURE = {
  rating: 4.6,
  total: 37,
  // Mon–Fri 7:45–16:15, Sat 10:00–14:00, Sunday closed.
  weekdayOpen: { hour: 7, minute: 45 },
  weekdayClose: { hour: 16, minute: 15 },
  saturdayOpen: { hour: 10, minute: 0 },
  saturdayClose: { hour: 14, minute: 0 },
  posts: [
    { id: 'e2e1', permalink: 'https://www.instagram.com/p/E2E-POST-1/', caption: 'Feed post one' },
    { id: 'e2e2', permalink: 'https://www.instagram.com/p/E2E-POST-2/', caption: 'Feed post two' },
    { id: 'e2e3', permalink: 'https://www.instagram.com/reel/E2E-REEL-3/', caption: 'Feed reel three' },
  ],
};

