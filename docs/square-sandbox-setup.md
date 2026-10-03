# Square Sandbox Setup

End-to-end test environment for the /order module. Nothing here touches real money.

## 1. Create the app & get credentials

1. Go to https://developer.squareup.com/apps → **+ New application** (e.g. `easy-beans-web`).
2. Open the app → **Credentials**. Flip the toggle at the top to **Sandbox**.
3. Copy into `.env.local`:
   - `SQUARE_ACCESS_TOKEN` ← *Sandbox access token*
   - `SQUARE_APPLICATION_ID` ← *Sandbox application ID*
   - `SQUARE_ENVIRONMENT=sandbox`
4. **Locations**: in the left nav, open *Locations* (or call the Locations API) and copy the sandbox location ID → `SQUARE_LOCATION_ID`.

## 2. Seed the catalog

```bash
npm run seed:catalog
```

Refuses to run unless `SQUARE_ENVIRONMENT=sandbox`. Verify in **Sandbox Dashboard → Items**
(open it from Developer Console → *Sandbox test accounts* → *Open in Dashboard*):
categories (The Classics, Specialty, …), items with Hot/Iced variations, and the
Milk / Syrups / Purées / Extras modifier lists.

## 3. Webhooks (local dev)

1. `npx ngrok http 3000` → copy the `https://…ngrok…` URL.
2. Developer Console → your app → **Webhooks → Subscriptions → Add subscription** (Sandbox):
   - URL: `https://<ngrok-id>.ngrok.app/api/webhooks/square`
   - Events: `payment.updated`, `order.updated`, `order.fulfillment.updated`
3. Copy the **Signature key** → `SQUARE_WEBHOOK_SIGNATURE_KEY`.
4. Set `SQUARE_WEBHOOK_NOTIFICATION_URL` to the **exact** subscription URL — the
   HMAC signature covers this string; a trailing-slash mismatch breaks verification.

## 4. Test an order

1. `npm run dev` → http://localhost:3000/order
2. Add items (required modifiers enforced), open the cart, fill in the name, **Pay with Square**.
3. On the hosted checkout use test card `4111 1111 1111 1111`, any future expiry, CVV `111`, any postal code.
4. You are redirected to `/order/confirmation?token=…` → shows
   **"Order confirmed. Remember to collect your order at the counter."** once payment is verified.
5. In Sandbox Dashboard → **Orders**, move the order to *Ready*: the status page flips to
   **"Your order is ready. Please collect it at the counter."** within ~6 s.

## 5. Negative tests worth repeating

- Edit the request body in devtools (change a price/ID) → `/api/checkout` returns 409.
- Replay a webhook delivery from the Developer Console → handler answers `duplicate: true`.
- Request a pickup outside Mon–Fri 8–18 / weekends 9–18 (Madrid) → 422 `pickup_invalid`.
