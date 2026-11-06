# Easy Beans Coffee — Website + Collection Ordering

Next.js 15 (App Router, TypeScript, MUI) site for the café in San Pedro de Alcántara, with a
Square-powered collection-ordering module at `/order`.

## Stack

- **Next.js 15 / React 19 / MUI 7** — marketing site + API routes, deployed on Vercel
- **Square** — single source of truth for catalog & prices; hosted checkout (CreatePaymentLink
  with an itemized PICKUP order); webhooks drive order status
- **Supabase** — operational data only: `orders`, `webhook_events`, `email_signups`, `ToDo` (admin)
- **common-lib/** — vendored submodule (never edited here), consumed via the `@common-lib` alias
- **Playwright** — basic e2e tests with builder-pattern helpers (`tests/e2e/builders`)

## Develop

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Square sandbox values
npm run dev                  # http://localhost:3000
npm test                     # Playwright (starts dev server itself)
npm run seed:catalog         # seed the Square SANDBOX catalog
npm run media:drinks         # pull the drink photography from Drive and encode it
```

## Key routes

| Route | What |
| --- | --- |
| `/` | Marketing site (ES default, EN toggle) |
| `/menu` | Redirects to `/order` — the menu and ordering are one screen |
| `/shop` | Retail collections (beans, matcha & chai, gift sets) from Square |
| `/shop/[collection]` · `/shop/[collection]/[handle]` | Product grid and product page |
| `/order` | The drink studio: build a drink, then cart → Square hosted checkout |
| `/order/status/[token]` | Live order status (polls; webhook-fed) |
| `/admin` | Internal todo board (Supabase `ToDo`) |
| `/admin/website` | Owner's website desk: domains + Cloudflare DNS editor, and the website studio (redesign / generate a site, regenerate, buy the build-out) |
| `/display-menu` | The in-café TV (portrait): the newest Instagram post, whole, with the handle under it; checks for a newer post every 2 minutes and reloads itself when it changes. The menu board (`features/menu/display`) is kept for when the screen goes back to the menu |
| `/api/menu·prices·checkout·orders/[token]/status·webhooks/square·signup` | Server endpoints |

## The menu

`/order` is the drink studio: one screen showing one drink at full size, which you swipe
sideways to change and reconfigure in place — hot or iced, sit in / takeaway / can, milk,
syrup, purée, cold foam. Choosing caramel on a latte does not tick a box, it turns the cup
on screen into the caramel latte, because the café shoots one.

What the menu *is* ships with the site: `src/features/menu/drinks.ts` (names, copy, which
options each drink takes) and the photography under `public/media/drinks/`, pulled from the
café's Drive library by `npm run media:drinks`. **Square is asked only what things cost**,
once per café day, through `src/server/square/priceCache.ts`. An unreachable Square costs the
prices, never the board. Checkout still re-validates every cent against the live catalog.

### What's on the menu comes from the Business Agent

The café's back office, the Business Agent, keeps the menu once and sends it everywhere: Google Maps,
the screens, the printed menus and this site. The site follows its list — an item taken off the menu
there leaves `/order`, and one added there appears (with a "photo soon" plate until it gets an entry
in `drinks.ts`). Square still prices and takes every order. See `docs/menu.md`.

### Newsletter sign-ups go to the Business Agent too

Every sign-up (the subscribe popup, the newsletter section, the shop page and competition entries)
is kept here in `email_signups` and sent on to the Business Agent, where the person is on the café's
Customers with a yes to marketing and the ticked topics as tags (Learning English, Offers…), so its
campaigns can pick them. Unsubscribes and deleted accounts take that yes back there. It needs the
website key in `BUSINESS_AGENT_NEWSLETTER_KEY` (`docs/production-deploy.md`); without it, or when the
agent is down, sign-ups here carry on as before. `src/server/businessAgent/newsletter.ts`.

## Docs

- `docs/menu.md` — the drink studio, the photography pipeline and the price book
- `docs/shop.md` — how retail stock is modelled, badged and fulfilled
- `docs/google-reviews-setup.md` — Places API key/place id: live reviews + footer opening hours
- `docs/social-feed-setup.md` — Instagram/TikTok tokens for the live post grid
- `docs/square-sandbox-setup.md` — end-to-end sandbox walkthrough
- `docs/production-deploy.md` — Vercel env + go-live steps
- `docs/website-admin.md` — `/admin/website`: domain & DNS editing and the website studio
- `docs/printer-profile-setup.md` — automatic kitchen tickets
- `docs/troubleshooting.md`, `docs/launch-checklist.md`

## Brand

The site implements **Edition 01 (April 2026)**: Rose Pink `#F79BA4` leads, Grey Limewash holds
the ground, Poppins for display and Figtree for text. Tokens live in `src/theme/brand.ts` and
are applied in `src/theme/theme.ts` — there is no CSS layer. Rose Pink is a fill, never a text
colour; use `rosePinkDeep` for type.

The earlier earth-tone guidelines (`EB_Brand_Guidelines.pdf`) are superseded.

Delivery is still "coming soon" — the extension point is marked in
`src/server/square/checkout.ts` (DELIVERY fulfillment). The shop is collection-only by design.
