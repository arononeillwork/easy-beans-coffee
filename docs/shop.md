# The shop

Packaged goods (beans, matcha, chai, gift sets) sold online and collected at
the counter. There is no shipping — a shop order is a pickup order that happens
not to contain a drink.

## Square is the source of truth

Products, prices, variations, modifiers, images and sold-out state all come
from the Square catalog via `GET /api/menu`. (The drinks menu no longer uses it: that
board is local and reads only prices from Square — see `docs/menu.md`.)
Nothing about a product is hardcoded in the app.

**What makes an item "shop stock" is its Square category name.** The mapping
lives in `src/features/shop/retail.ts`:

| Collection slug | Square category names accepted (case/accent-insensitive) |
| --- | --- |
| `beans` | Coffee beans, Beans, Café en grano, Grano |
| `matcha-chai` | Matcha & chai, Matcha and chai, Matcha y chai, Matcha, Chai |
| `gift-sets` | Gift sets, Gift set, Bundles, Sets de regalo, Regalo |

Anything else is a drink. Rename a category in Square and the items move
between `/menu` and `/shop` — no deploy needed. Two Square categories can map
to one collection (Matcha and Chai kept separate in the POS, merged on site).

Product URLs are `/shop/<collection>/<handle>`, where the handle is slugified
from the Square item name.

## Optional merchandising

Two Square **custom attributes** on an item, both optional:

- `ebc_badge` — one of `new`, `limited`, `pick`. Renders the corresponding
  chip ("New", "Limited edition", "Barista's pick"). Unrecognised values are
  ignored.
- `ebc_compare_at` — the was-price, for bundles. A value with a decimal
  separator is read as euros (`24.00`), a whole number as cents (`2400`).

Both are read in `src/server/square/catalog.ts`. Absent or malformed values
mean "no badge" / "no sale price" — merchandising can never break the catalog.

## Placeholder stock

While Square contains **no retail categories at all**, the shop falls back to
`src/features/shop/mockCatalog.ts` so the pages can be reviewed. In that state:

- an alert on every shop page says the products are samples;
- add-to-cart is disabled, because the placeholder ids would be rejected by
  `validateLines` as `catalog_mismatch` anyway.

The fallback disappears the moment Square returns a single retail category.
`npm run seed:catalog` creates these same products for real in the sandbox.

## Checkout

Shop items use the same cart (`CartProvider`), the same `POST /api/checkout`,
the same server-side price re-validation, and the same Square PICKUP
fulfilment as drinks. The only difference:

> A cart containing **only** retail lines skips the 15-minute drink prep
> buffer (`prepMinutesFor` in `src/server/square/checkout.ts`). One drink in
> the cart puts the whole order back on normal timing.

Opening hours still apply either way — collection is in person.

Because pickup validity now depends on what is in the cart, `/api/checkout`
validates lines **before** pickup. Keep that order.

## Photography

There are no packaging shots yet. `src/features/shop/assets.ts` maps each
collection to a photo, and `undefined` is a valid entry — it renders the
`BrandPanel` (wordmark on a brand tint) rather than passing off a drink photo
as a bag of beans.

Approved shots live in Drive under **Content/Images/New**. Dropping a file at
the path below lights one up with no code change:

| Drive file | Destination |
| --- | --- |
| `coffee_beans.jpg` | `public/media/shop/coffee-beans.jpg` |
| `coffee_station.jpg` | `public/media/shop/coffee-station.jpg` |
| `coffee_machine_barista_facing.jpg` | `public/media/shop/coffee-machine-barista.jpg` |
| `coffee_with_milk_pouring.jpg` | `public/media/shop/coffee-with-milk-pouring.jpg` |
| `Syrups` | `public/media/shop/syrups.jpg` |
| `Ube Mixing` | `public/media/shop/ube-mixing.jpg` |

Then point the relevant entries in `assets.ts` at them.

A proper product shoot is the real fix — the Edition 01 guidelines (p.15)
describe the shot: bright daylight, shot in the space, product sharp and
filling 60–70% of the frame.
