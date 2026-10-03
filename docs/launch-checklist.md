# Production Launch Checklist

Do these in order. Stop at any failure.

## Before deploy

- [ ] Supabase migrations 0003–0005 and 0007 applied to `hvjtyzcxmstijbakkqxv` (tables: `orders`, `webhook_events`, `email_signups`, `lead_touches`; function `capture_lead`; RLS enabled, no policies). One paste: `supabase/apply-pending.sql`.
- [ ] SMTP vars set and a test signup actually delivers the offer email (check spam folder too).
- [ ] `ADMIN_LEADS_TOKEN` set; `/admin/leads` asks for it and rejects a wrong value.
- [ ] `ADMIN_BOARD_PIN` and both `NEXT_PUBLIC_BOARD_SUPABASE_*` set; `/admin` asks for the PIN, rejects a wrong one, then shows the board.
- [ ] All production env vars set in Vercel (`docs/production-deploy.md` table) — sandbox values nowhere in Production scope.
- [ ] Real catalog reviewed in Square Dashboard: names, prices, variations, modifier lists, categories, item images.
- [ ] Production webhook subscription created; signature key + exact URL in env.
- [ ] `npm run build` and `npm test` green in CI/locally.

## After deploy, before announcing

- [ ] https://easybeans.es loads; ES default, EN toggle works; popup appears once; signup lands in `email_signups`.
- [ ] `/menu` shows the real catalog (prices match Dashboard).
- [ ] Sitemap/robots reachable; `/order/status/*`, `/order/confirmation`, `/admin` disallowed.
- [ ] **Real low-value order** (e.g. one espresso):
  - [ ] Hosted checkout charges the real card.
  - [ ] Redirect shows exactly: *Order confirmed. Remember to collect your order at the counter.*
  - [ ] Order appears in Square POS/Orders at the correct location with customer name, pickup time, items + modifiers.
  - [ ] Kitchen ticket **auto-prints once** on the right printer.
  - [ ] Staff taps *Ready* → status page shows exactly: *Your order is ready. Please collect it at the counter.* (no manual refresh).
  - [ ] Complete order → status shows *collected*.
  - [ ] Refund the test order in Square Dashboard; verify money returns and the order shows cancelled state via webhook.
- [ ] Webhook replay from Developer Console → `duplicate: true`, no state corruption.
- [ ] Phone test (real device, mobile data): order flow ≤ 3 minutes, touch targets usable, focus states visible.

## Operational readiness

- [ ] Staff know: orders arrive on POS automatically; mark *Ready* when done; customer collects at counter; refunds happen in Square, never over the phone with card numbers.
- [ ] `docs/troubleshooting.md` bookmarked at the counter device.
- [ ] Secrets stored only in Vercel env + a password manager — never in git.
