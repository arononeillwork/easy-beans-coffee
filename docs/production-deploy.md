# Production Deploy (Vercel)

## Environment variables (Vercel → Project → Settings → Environment Variables)

Set for **Production** only — never reuse sandbox values:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hvjtyzcxmstijbakkqxv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (server-only secret) |
| `NEXT_PUBLIC_TODO_TABLE` | `ToDo` |
| `NEXT_PUBLIC_BOARD_SUPABASE_URL` | `https://lhakrmmoxaareykglmtx.supabase.co` — the /admin board lives in the BusinessAgent project, not the site's |
| `NEXT_PUBLIC_BOARD_SUPABASE_ANON_KEY` | BusinessAgent → Settings → API → anon key |
| `ADMIN_BOARD_PIN` | The PIN for `/admin`, shared with staff. **Unset = the board stays shut in production.** |
| `SQUARE_ENVIRONMENT` | `production` |
| `SQUARE_ACCESS_TOKEN` | **Production** access token |
| `SQUARE_APPLICATION_ID` | Production application ID |
| `SQUARE_LOCATION_ID` | The café's real location ID |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | From the production webhook subscription |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | `https://www.easybeanscoffee.com/api/webhooks/square` |
| `SQUARE_EXCLUDE_RULES` | *(optional)* Catalog names to hide, e.g. `starts:test, contains:do not use`. Unset means `starts:test, starts:promo`; empty means filter nothing. |
| `NEXT_PUBLIC_SITE_URL` | `https://www.easybeanscoffee.com` |
| `CAFE_TIMEZONE` | `Europe/Madrid` |
| `SMTP_HOST` | Mail provider host — offer emails do not send without it |
| `SMTP_PORT` | e.g. `587` |
| `SMTP_SECURE` | `true` only for port 465 |
| `EMAIL_USER` / `EMAIL_PASS` | SMTP credentials (server-only secret) |
| `EMAIL_FROM` | e.g. `Easy Beans <hola@easybeans.es>` |
| `EMAIL_REPLY_TO` | *(optional)* Where replies should land |
| `ADMIN_LEADS_TOKEN` | Shared secret gating `/admin/leads`. **Unset = the page stays shut.** |
| `OFFER_REDEMPTION_ENABLED` | `true` only once the shop is open. Unset means codes are issued but not yet spendable. |
| `OFFER_VALID_DAYS` | *(optional)* Code lifetime in days. Unset means codes never expire. |

## Steps

1. Apply Supabase migrations `supabase/migrations/0003–0005` and `0007` to the production
   project (SQL editor or `supabase db push`). They are idempotent, and
   `supabase/apply-pending.sql` is all of them in one paste.
2. Push to `main` — Vercel auto-builds (`next build`). `vercel.json` only pins the
   framework to Next.js: the Vercel project was created for the old Vite site, and
   its preset would otherwise look for a `dist/` folder.
3. Create a **production** webhook subscription in the Square Developer Console pointing at
   `https://www.easybeanscoffee.com/api/webhooks/square` with `payment.updated`, `order.updated`,
   `order.fulfillment.updated`. Paste its signature key into the env vars and redeploy.
4. The production catalog is managed by the café in Square Dashboard — do **not** run the
   seed script against production (it refuses anyway).
5. Run the launch checklist (`docs/launch-checklist.md`) including one real low-value order
   and the printer test before announcing.

## Notes

- The site is the Vercel project **easy-beans-coffee** under **arononeillworks-projects**
  (vercel.com/arononeillworks-projects/easy-beans-coffee); the domain and every env var above
  belong there. A duplicate project of the same name under the `easy-beans-coffee` team is also
  wired to this repo. Delete it or disconnect its Git, so a push builds one site, not two.
- That project skips commits with no file changes (`git commit --allow-empty` won't redeploy
  it). Redeploy from its Deployments tab, or push a real change.
- DNS for easybeanscoffee.com is at Cloudflare and points at Vercel. Moving the domain between
  Vercel projects needs no DNS change unless Vercel asks for a `_vercel` TXT verification
  record. Add that in Cloudflare.

- Prices/catalog: Square Dashboard is the admin UI. Menu changes appear on the site within
  ~5 minutes (catalog cache TTL); checkout validates against ≤60 s-old data.
- Scratch entries can stay in Square: any item, category, variation or modifier whose name
  matches `SQUARE_EXCLUDE_RULES` is never read. Ops are `starts` / `ends` / `contains` /
  `equals` (`<op>:<text>`, comma- or newline-separated); a bare entry means `starts`, and
  matching ignores case and accents.
- Refunds/cancellations are done in Square Dashboard/POS (Transactions → refund). The site
  reflects cancellations via `order.updated`.
- Roll back = redeploy previous Vercel build; the DB schema is additive-only.
