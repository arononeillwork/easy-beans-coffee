# Build brief: website accounts & rewards on the Business Agent

Paste this into a Claude session opened in the **Business Agent repo** (the one
with `worker/`, `shared/`, `src/`, `docs/WEBSITE.md`, deployed as the
Cloudflare Worker `business-agent`). Build it locally first; don't deploy
until the owner says so.

File and function names below were read from the deployed Worker's source
map, so they're real — but check each one in the repo before relying on it.

---

## Goal

A business's own website (first user: Easy Beans, business `1`) lets people
sign in. Each signed-in person should:

1. be a **Customer** in the agent (stored here, not only in Square);
2. see their **loyalty points** (beans), read by the agent from Square
   Loyalty — the website stops calling Square for this;
3. see their **credit / cashback** from the reps ledger (`rep_rewards`) and how
   it's earned (`rep_settings` cashback rates);
4. if they're a **sales rep** (`sales_reps.customer_id` is them), see their
   code, reach step, crew size and this month's rewards;
5. be **erasable** (GDPR) from the website.

The website side is already designed against this contract and fails closed:
any error, timeout (4 s) or 404 just hides the rewards card.

## Where it fits

Add a new route group next to the existing site routes:

- `worker/site.ts` — `GET /api/site/:business/menu` (pattern for the business
  in the address, `NOT_SHARED` 404).
- `worker/newsletter.ts` — `signup` / `unsubscribe`, and the **website key**:
  `newsletter.key_hash` (sha256 of the bearer), checked by `keyed()`;
  `BAD_KEY` → 401. Made on *Website & SEO* via `POST /api/newsletter/key`.

New: **`worker/siteAccount.ts`** (Hono, mounted like the others), with shared
types in **`shared/siteAccount.ts`** and the work in SQL functions in a new
migration (same style as `rep_page`, `claim_reward`, `newsletter_signup`).

Reuse, don't copy:

- `businessIn()` for the `:business` param; `businessDb(env, business)` for
  reads/writes scoped to that business.
- The website key check from `newsletter.ts` (lift `config`/`keyed` into a
  small shared helper rather than duplicating the hash compare).
- `shared/reps.ts`: `earnsCredit`, `reachTier`, `reachMultiplier`, `crewOf`,
  `RewardKind` (`earn | redeem | payout | clawback`), `RewardStatus`
  (`pending | approved | rejected`).
- The rep's balance must be computed **the same way the rep page does**
  (`rep_page` RPC) — one definition of "balance", or the website and
  `/rep/<token>` will disagree.
- Customer matching from `worker/squareCustomers.ts` (Square id → email →
  phone; app-typed fields win, only empty ones filled; never sets marketing
  consent).
- Square: `squareSession` (`worker/connections.ts`), `providers/squareLoyalty`
  and the 30-minute `provider_cache` via `cached`/`forget` (`worker/cache.ts`)
  as `worker/loyalty.ts` does.

## Rules for every route

- **Website key required.** No key or wrong key → 401 (`BAD_KEY`). There is
  no keyless mode here (unlike `signup`).
- **No CORS headers**, and answer `OPTIONS` with 405 — browsers must never
  call these; only the website's server does.
- **Email only in the JSON body**, never in the URL, never in logs or
  `app_errors` (log the outcome, not the address).
- Body must include `"email_verified": true` (the website asserts it verified
  the address via its own sign-in). Missing/false → 403.
- Unknown business, or website feature off → the same 404 as the menu.
- Validate bodies with zod; email trimmed + lowercased; reject > 254 chars.
- Amounts as plain numbers (business currency), dates `YYYY-MM-DD`.
- Rate limit per business key (e.g. 120/min) → 429.
- Read only the named person's rows. Never other customers, never crew
  members' identities.

## Routes

### `POST /api/site/:business/account/sync`

```json
{ "email": "ana@example.com", "email_verified": true,
  "name": "Ana García", "phone": "+34 600 000 000",
  "square_customer_id": "CBASEN…", "lang": "es", "rep_code": "NATASH15" }
```

- Find or create the customer (`source: 'website'` when created), matching
  as `squareCustomers.ts` does; set `square_id` if given and empty.
- `rep_code` (optional): if it's an active, approved rep's code and this
  customer is new, record an introduction for that rep the way the rep page's
  crew/introduction flow does (`rep_introductions`), waiting for an admin.
  Unknown code → ignore silently.
- Never touch `marketing_consent`. Idempotent.
- `200 { "customer_id": "…", "created": true, "is_rep": false }`

### `POST /api/site/:business/account/summary`

Body: `{ "email": "…", "email_verified": true }`

```json
{
  "customer": { "id": "…", "first_name": "Ana" },
  "points": {
    "program": { "one": "Bean", "other": "Beans",
                 "tiers": [{ "id": "…", "name": "Free coffee", "points": 10 }] },
    "balance": 7, "lifetime": 23
  },
  "credit": {
    "balance": 1.25, "pending": 0.4, "gift_card_linked": true,
    "lines": [{ "date": "2026-07-11", "label": "Cashback for a post",
                "amount": 0.47, "status": "approved", "note": "863 views · 20 likes" }]
  },
  "cashback": { "on": true, "per_1000_views": 0.5, "per_100_likes": 0.2,
                "per_follower": 0.1, "max": 15 },
  "rep": {
    "code": "NATASH15", "kind": "customer", "earns": "credit",
    "reach": 0, "reach_step": "Local voice", "multiplier": 1,
    "crew": { "leads": false, "members": 0 }, "this_month": 0.47
  }
}
```

- `customer: null` (200) when the email isn't on the list — the site then
  calls `sync`.
- `points`: `null` when Square isn't the connected till, the programme is off,
  or the customer has no loyalty account (enrolment stays at the till).
  `providers/squareLoyalty.accounts()` lists every account — add a by-customer
  lookup (Square `POST /v2/loyalty/accounts/search` with
  `query.customer_ids`) instead of listing all. Cache per customer 10–30 min.
- `credit`: from the customer's rep row's ledger; same balance as `rep_page`.
  `pending` = pending lines. `lines` = last 20, newest first, `redeem` /
  `clawback` / `payout` as negatives. `gift_card_linked` from the rep's
  `square_gift_card_id` (`worker/squareReps.ts`). `null` when no rep row.
- `cashback`: from `rep_settings`; `null` when `cashback_on` is false.
- `rep`: `null` unless the rep row is `active` and `approved`. `earns` is
  `earnsCredit(kind) ? 'credit' : 'commission'`. Reach step label from
  `reachTier`. Don't return the rep link token.

### `POST /api/site/:business/account/erase`

Body: `{ "email": "…", "email_verified": true }`

- No ledger lines and not a rep → delete the customer.
- Otherwise → blank name, email, phone, birthday, notes, instagram; set
  `marketing_consent: false`; deactivate a customer-kind rep; keep ids,
  ledger lines and amounts (accounting).
- Also unsubscribe them from the newsletter (same effect as `unsubscribe`).
- `200 { "erased": true, "kept": "ledger" }` or `{ "erased": true, "kept": null }`.
- Write it to `audit_log` as done "via website".

## Database

One migration, e.g. `site_accounts`:

- `site_account_sync(p_business, p_email, p_name, p_phone, p_square_id, p_lang, p_rep_code)`
- `site_account_summary(p_business, p_email)` → customer, credit, cashback, rep
  (points are added in the Worker from Square)
- `site_account_erase(p_business, p_email)`
- `security definer`, `search_path` pinned, `execute` granted only to the
  role the Worker uses (no `anon`).
- Allow `customers.source = 'website'` if `source` is constrained.

## Admin side (small)

- Website & SEO page: a toggle **"Website accounts"** (off by default), next to
  the newsletter key — the routes 404 while it's off.
- Customers page: show `source: website` like other sources.

## Docs

Add an **"Accounts & rewards"** section to `docs/WEBSITE.md` with the three
routes, the rules above and the error table:

| Status | When |
| --- | --- |
| 400 | bad body |
| 401 | no / wrong website key |
| 403 | `email_verified` not true |
| 404 | business not shared or website accounts off |
| 429 | over the rate limit |
| 503 | database or Square unavailable |

## Tests (must pass)

1. No key / wrong key → 401; no `Access-Control-*` header on any response.
2. `sync` twice → one customer, `created: false` second time; an existing
   Square customer with that email is linked, not duplicated.
3. `sync` never changes `marketing_consent`.
4. A rep with approved + pending lines: `summary.credit.balance` equals what
   `rep_page` shows; `pending` counts only pending lines.
5. Customer with no rep row → `credit: null`, `rep: null`.
6. Unknown email → `200 { customer: null }`.
7. Square not connected → `points: null`, rest of summary still returned.
8. `erase` with ledger lines keeps lines, blanks personal fields, unsubscribes.
9. No email in any log line or `app_errors` row.
10. Another business's key can't read business 1's customers.

## Out of scope

- An agent-owned points ledger (awarding beans from Square sales and writing
  them back to the till). Points stay Square's; the agent only reads them.
- Spending or redeeming credit from the website — that stays at the till
  with the gift card on file.
- Applying to become a rep from the website.

## Hand-back to the website

When it's built, tell the website side:

- the base URL (e.g. `https://business-agent.arononeillwork.workers.dev/api/site/1`);
- that the existing website key works for these routes;
- whether "Website accounts" is on for business 1.

The website then calls `sync` on first sign-in and on profile edits, `summary`
for the account page, and `erase` from account deletion (replacing its own
Square Loyalty read and the bare `unsubscribe`).
