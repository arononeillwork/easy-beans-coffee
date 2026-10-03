# The drink studio

`/order` is the menu and the ordering flow, one screen. It shows one drink at full size, and
every choice on it changes the photograph in front of you rather than a line of text in a
modal.

## The split: local board, Square prices

The menu used to come entirely from Square, photography included. Square is a good POS and a
poor art director — about half the catalog had no picture, the ones that existed were whatever
fitted a square tile, and every page view paid a round trip to fetch URLs that then had to be
fetched again from Square's CDN.

So the menu's **identity** moved into the repo and Square kept the one thing it is
authoritative about: **the price**.

| Where | What lives there |
| --- | --- |
| `src/features/menu/drinks.ts` | Every drink: name, tagline, description (both languages), which temperatures and vessels it comes in, which Square modifier lists to show |
| `public/media/drinks/<art>/<temp>-<serve>.webp` | The photography, encoded from the café's Drive library |
| `src/features/menu/artManifest.ts` | **Generated.** Which frames exist, and which were shot in the café rather than on the sweep |
| `src/server/square/priceCache.ts` | Today's prices, read from Square once per café day |

The join between the two halves is the **item name**, normalized. `square: 'Flat White'` in
`drinks.ts` must match the item name in the POS. Rename one without the other and that drink
renders with its price withheld and cannot be ordered — a visible, harmless failure rather than
a silently wrong number.

## Prices

Prices change at a café a few times a year, so re-reading them per visit buys nothing. The
snapshot turns over when Madrid does, not on a rolling timer, so everyone on a given day is
quoted the same number.

- Browsing: `getPriceBook()` — one Square read per café day, served stale on failure.
- Prerender: the page is regenerated hourly at the edge with the snapshot already in the HTML.
- Client fallback: `GET /api/prices`, reached only when the page was built while Square was
  unreachable. That is also what the e2e specs mock.
- **Checkout is unchanged**: `getCatalogForCheckout()` still reads near-live prices and
  recomputes every cent server-side. A mid-day price change is honoured at the till even while
  the board shows the morning's snapshot.

## Adding or replacing photography

The library lives in the café's Google Drive, organised by eye — `Iced Capuccino - Sit In.png`,
one folder per drink. `scripts/drinkArtSources.ts` is the translation from those file ids to
canonical `<art>/<temp>-<serve>` frames. It is written by hand on purpose: filenames alone
cannot tell you that "Ube Matcha Sit In" is iced, or that "Matcha Vanilla Takeaway" is a
*flavour* of another drink rather than a drink of its own.

1. Add the shot to the Drive folder.
2. Add one line to `scripts/drinkArtSources.ts`.
3. Set the top-level Drive folder to **Anyone with the link → Viewer**.
4. `npm run media:drinks` — downloads, encodes, and rewrites `artManifest.ts`.
5. **Set the folder back to private.**

Masters land in `media-src/drinks/` (git-ignored, ~150 MB, never served); the encoded WebP in
`public/media/drinks/` is what ships — about 3 MB for the whole board.

### Why the encoder adjusts exposure

The stage composites each cup with `mix-blend-mode: multiply`, which makes the studio white
behind it vanish into whatever colour the stage is washed with. Multiply is exact: a sweep that
came back at 235 rather than 255 leaves a soft grey rectangle around that drink while the ones
shot at 255 sit perfectly. So each shot is lifted by the gain that puts *its own* ground at
white, measured off a border ring, capped at 15%. Past that, the honest fix is to reshoot.

Three frames are photographs of the drink on a café table rather than cut-outs. They have no
ground to drop out, so blending them tints the whole room. The encoder detects them — a sweep
has a bright border, a café under string lights does not — records them in `SCENE_FRAMES`, and
the stage shows them as framed photographs instead.

## The layout

Reading order is a menu board's: **title, image, options**. Navigation is a crumb trail —
Drinks or Food, then the part of that half — and the cup is stepped with the glass arrows,
the dots, the thumbnail rail, or by swiping; all drive one selection. The washed band (title,
stage, rail) carries the drink's own brand tint, with the drink's name set huge behind the
cup — the multiply blend lets the type read through the photo's white ground. On laptops the
band becomes a sticky rounded panel on the left with the options sheet on the right; on
phones everything stacks and the order bar floats as a glass pill.

Options are lists, not chips: full-width rows with a ring that fills when chosen, no fills or
cards. Two per-list flags in `drinks.ts` shape them:

- `longList` (the syrups): phones show the first four rows and fold the rest behind
  "show more"; wider screens always show everything. Up to three syrups per drink.
- `comingSoon` (cold foam, listed last): renders as a statement with nothing to press, and
  `compose.ts` refuses the list outright, so it cannot be priced or ordered even though
  Square still carries it.

The strip defends its selection: a swipe (always preceded by a real input event) moves the
selection; a spontaneous scroll reset — rotation, resize, screenshot capture — is detected by
the absence of any input and snapped back. Programmatic scrolls settle on arrival, yield to
any human input, and jump instantly if something cancels them mid-flight.

The header carries the order as a jug that counts up as drinks go in and opens the cart. The
search and account icons beside it are inert affordances for features that don't exist yet.

Each drink also carries one of the five brand tints as its stage colour (`hue` in
`drinks.ts`), assigned so no two neighbours share a wash. One deliberate blend exists:
`ubeMatcha`, lilac wash under matcha glow, because that drink is genuinely two colours.

## Flavours that change the picture

There is no "Caramel Latte" in Square: there is a Latte and a caramel syrup. There is very much
a caramel latte in the Drive library, and it looks nothing like a plain one. `flavours` on a
drink maps a Square modifier to a different art folder and a different name, so choosing the
syrup turns the cup on screen into that drink. Purely visual — the order is still a latte plus
syrup, priced exactly as Square prices it.

## Vessels

Sit in / takeaway / can is the axis the whole library is shot around, and the choice customers
actually make. Square prices it for smoothies and juice (its variations are literally "Sit In"
and "Takeaway"); for coffee it does not price it at all. Where it is not a variation, the
choice travels to the counter as the **Square line item's own note**, in Spanish, so it prints
on the ticket next to the drink. A can is the same drink at the same price, and the screen says
so rather than letting the vessel read as an upsell.

## Adding a drink

1. Add the item in Square (that is where its price comes from).
2. Add an entry to `DRINKS` in `src/features/menu/drinks.ts`, with `square:` matching the POS
   name exactly.
3. Add its photography as above. Until then it shows the "coming soon" plate — it is still
   on the board and still orderable.
