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
  // The Business Agent's details (its address, WhatsApp, a closure ten days ahead: outside the week
  // ordering follows, inside the two weeks the footer warns about). The hours are the ones above.
  agent: {
    address: 'Calle Prueba 7, 29670 Villa E2E, Málaga',
    street: 'Calle Prueba 7',
    town: '29670 Villa E2E',
    whatsapp: '+34 611 000 999',
    whatsappUrl: 'https://wa.me/34611000999',
    email: 'e2e@easybeans.example',
    closureInDays: 10,
    closureReason: 'Closed for the e2e party',
  },
  // Numeric ids, like Instagram's own: the café TV asks for a post's picture by its id.
  posts: [
    { id: '9000000000000001', permalink: 'https://www.instagram.com/p/E2E-POST-1/', caption: 'Feed post one' },
    { id: '9000000000000002', permalink: 'https://www.instagram.com/p/E2E-POST-2/', caption: 'Feed post two' },
    { id: '9000000000000003', permalink: 'https://www.instagram.com/reel/E2E-REEL-3/', caption: 'Feed reel three' },
  ],
};

