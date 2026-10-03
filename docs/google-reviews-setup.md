# Google Maps: reviews and opening hours

Three things on the site are read live from the café's Google presence:

- the **rating and review count** on the home page — Places API;
- the **opening hours** in the footer, on every page — Places API;
- the **review cards** — the café's own Business Profile, falling back to Places.

Change the hours on Google Maps and the site follows within six hours. Nothing
is edited in the codebase. Until the APIs are configured, the reviews band
renders our own photography with our own captions and a visible "placeholder
layout" notice, and the footer shows the static hours from the dictionary — the
page is never broken, and a caption of ours is never passed off as a review.

Rating and hours come from **one** Place Details call, deduped per render and
cached across requests, so adding the hours cost nothing. The Business Profile
call runs alongside it rather than after it.

Code: [`src/server/places/googlePlaces.ts`](../src/server/places/googlePlaces.ts)
(rating, hours, Places reviews),
[`src/server/places/businessProfile.ts`](../src/server/places/businessProfile.ts)
(our own reviews),
[`src/server/places/reviewFormat.ts`](../src/server/places/reviewFormat.ts)
(which reviews show, and how dates read),
[`src/shared/lib/openingHours.ts`](../src/shared/lib/openingHours.ts) (grouping
seven days into "Mon – Fri" rows) and
[`src/components/marketing/ReviewsSection.tsx`](../src/components/marketing/ReviewsSection.tsx).

## Why there are two review sources

Places stopped returning review text for this project. The symptom is a clean
200 response with the `reviews` and `photos` keys simply absent.

What that is **not**, all checked against the live API:

| Ruled out | Evidence |
| --- | --- |
| A bad place ID | Returns "Easy Beans Coffee, C. Pizarro 8", 4.9★, no duplicate listing |
| A missing billing tier | A `*` field mask returns 48 fields, including Enterprise+Atmosphere ones like `servesBrunch` and `allowsDogs` |
| Too small a listing | The same key returns no reviews for the Statue of Liberty (112,296 ratings) |
| A code bug | `photos` is absent too, and every other field arrives |

The likeliest cause is that Google applies [different Places functionality to
EEA billing accounts](https://developers.google.com/maps/comms/eea/places),
effective 8 July 2025. That is not something the code can work around.

Reading the profile the café **owns** sidesteps it, and is better regardless:
Places caps at five reviews with no sort parameter, while the Business Profile
returns all of them.

## Environment variables

Add these to `.env.local` (and to the Vercel project for production):

```bash
# Rating, review count, opening hours — Places API
GOOGLE_PLACES_API_KEY=AIza...
GOOGLE_PLACE_ID=ChIJ...

# Review cards — the café's own Business Profile
GOOGLE_BUSINESS_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_BUSINESS_CLIENT_SECRET=GOCSPX-...
GOOGLE_BUSINESS_REFRESH_TOKEN=1//...
GOOGLE_BUSINESS_LOCATION=accounts/123456789/locations/987654321
```

All of them are server-only — they are read inside a server component and never
reach the browser. Do not prefix any with `NEXT_PUBLIC_`.

The four `GOOGLE_BUSINESS_*` values are optional: leave them unset and the band
falls back to Places, then to our own captions.

### Getting the API key

1. Google Cloud console → **APIs & Services → Library** → enable **Places API (New)**.
2. **Credentials → Create credentials → API key**.
3. Restrict it: *API restrictions* → Places API (New). Leave *Application
   restrictions* set to **None** — this key is used server-to-server, so an HTTP
   referrer restriction would block it.
4. Billing must be enabled on the project. Place Details with the `reviews`
   field is billed at the Enterprise SKU; the six-hour cache below keeps this to
   roughly 120 calls a month per locale.

### Getting the place ID

Search the café at <https://developers.google.com/maps/documentation/places/web-service/place-id>,
or open the listing on Google Maps → Share → the `place_id` in the URL. It looks
like `ChIJ...` and is not the same as the CID number in a Maps share link.

## Connecting the Business Profile

This is the slow one. Step 1 is a wait, not a task.

### 1. Get the project approved (about 14 days)

Google gates the Business Profile APIs behind a manual review. Submit the
[access request form](https://support.google.com/business/contact/api_default)
— choose *Application for Basic API Access* — **from an email address that is
listed as an owner or manager of the Easy Beans profile**, or it is rejected.

To check where a request stands, open the Cloud project's quota page for the
Business Profile APIs: **0 QPM means not approved yet, 300 QPM means approved.**

### 2. Enable the APIs

In the same Cloud project, enable **Google My Business API** and **My Business
Account Management API**.

### 3. Create an OAuth client

**Credentials → Create credentials → OAuth client ID → Web application.** Add

```
http://localhost:5858/oauth2callback
```

as an authorised redirect URI — that is the port the setup script listens on.
Put the client id and secret in `.env.local` as `GOOGLE_BUSINESS_CLIENT_ID` and
`GOOGLE_BUSINESS_CLIENT_SECRET`.

### 4. Run the setup script, once

```bash
npm run auth:google-business
```

It prints a consent URL. Open it **signed in as an owner of the profile**,
approve, and the script prints the refresh token and every location the account
manages, each with its `GOOGLE_BUSINESS_LOCATION=` line ready to copy.

The refresh token does not expire on its own, so this is a one-time step, not
part of any deploy. It *is* a credential — treat it like the Square token.

Running this before step 1 completes still works up to a point: consent
succeeds and the refresh token prints, then listing accounts fails with a 403.
That is what "not approved yet" looks like. Keep the token and re-run the
script once approval lands to get the location id.

## Opening hours

The footer asks for `regularOpeningHours` and renders the periods itself rather
than printing Google's seven `weekdayDescriptions` lines: consecutive days with
identical hours collapse into one row, the week starts on Monday, and a day with
two spans reads "8:00 – 14:00, 17:00 – 20:00". Days Google reports as shut show
the dictionary's "Closed" / "Cerrado".

One important limitation: **this does not drive the order slot picker.**
`openingWindow()` in
[`src/features/order/lib/pickupTimes.ts`](../src/features/order/lib/pickupTimes.ts)
still holds a static Mon–Fri 8–18 / Sat 9–18 / Sun 9–16 table, because it
validates orders on the server and runs inside the client picker, where a
third-party call has no business being. If the Google hours change, update that
function to match — otherwise a customer can book a collection for a time the
café is shut.

## What the section does with the data

- **Rating and count** come straight from the place (`rating`, `userRatingCount`),
  and stay live even when no review text is available.
- **Which reviews show** is decided in `reviewFormat.ts`, and is the same rule
  whichever source supplied them: 4- and 5-star reviews, newest first, capped at
  **six**; if fewer than three clear 4 stars, everything shows best-rated first.
  Six is the loading-speed dial — every card carries a photo, so seventeen
  reviews would mean seventeen images. Covered by `tests/unit/reviewFormat.test.ts`.
- **Star-only ratings** never become cards. They count towards the 4.9 but
  there is nothing to print, and the band is a wall of words.
- **Dates**: each card shows the absolute date for the active locale plus
  relative phrasing ("2 months ago") — Places returns that phrasing ready-made,
  Business Profile does not, so it is derived.
- **Language**: the Places request passes `languageCode` (`es` or `en`) so
  Google returns its translation where it has one. Business Profile returns
  both halves of a translated review in one string, and the card shows the
  translated half. Either way, expect a bilingual row.
- **Caching**: `revalidate` is six hours on both sources, so the home page stays
  effectively static. A failed or slow call never blocks the page; it falls
  through to the next source and logs a warning.

## Attribution

Google requires that Places content be shown as coming from Google. The section
does this with the "Google reviews" heading, the reviewer's own name, and a
"Read on Google" link per card. If you restyle it, keep those three.
